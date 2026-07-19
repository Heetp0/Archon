# retriever.py
import os
import json
import logging
import pyarrow as pa
import lancedb
from typing import List, Dict, Any, Optional

from model_router import ModelRouter
from embeddings import OllamaEmbeddingClient, chunk_pdf, chunk_codebase, chunk_audio

logger = logging.getLogger(__name__)

class TopicExtractor:
    def __init__(self, model_router: ModelRouter):
        self.router = model_router

    async def extract_topics(self, text: str) -> List[str]:
        sample_text = text[:4000]
        prompt = (
            "You are a topic extraction assistant. Analyze the text below and extract a list of 5-10 key topics, "
            "subjects, or concepts discussed in it.\n"
            "Respond ONLY with a comma-separated list of topics (e.g. topic1, topic2, topic3) and absolutely "
            "no introductory or concluding text.\n\n"
            f"Text:\n{sample_text}"
        )
        try:
            generator = self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}])
            response_chunks = []
            async for chunk in generator:
                response_chunks.append(chunk)
            response = "".join(response_chunks).strip()
            if not response:
                raise ValueError("Empty response from ModelRouter")
            return [t.strip().lower() for t in response.split(",") if t.strip()]
        except Exception as e:
            logger.warning(f"Failed to extract topics via LLM: {e}. Falling back to keyword topics.")
            import re
            words = re.findall(r'\b[a-zA-Z]{5,}\b', sample_text.lower())
            if not words:
                return []
            from collections import Counter
            common = [w for w, count in Counter(words).most_common(10)]
            return common

    async def extract_query_topics(self, query: str) -> List[str]:
        prompt = (
            "Identify the core topics or keywords in this search query.\n"
            "Respond ONLY with a comma-separated list of topics/keywords and no other text.\n\n"
            f"Query: {query}"
        )
        try:
            generator = self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}])
            response_chunks = []
            async for chunk in generator:
                response_chunks.append(chunk)
            response = "".join(response_chunks).strip()
            if not response:
                raise ValueError("Empty response from ModelRouter")
            return [t.strip().lower() for t in response.split(",") if t.strip()]
        except Exception as e:
            logger.warning(f"Failed to extract query topics via LLM: {e}. Falling back to keywords.")
            return [w.strip().lower() for w in query.split() if len(w.strip()) > 3]

class Retriever:
    def __init__(self, db_path: str, model_router: ModelRouter):
        self.db_path = db_path
        self.model_router = model_router
        self.embed_client = OllamaEmbeddingClient()
        self.topic_extractor = TopicExtractor(model_router)
        
        os.makedirs(db_path, exist_ok=True)
        self.db = lancedb.connect(db_path)
        self._init_tables()

    def _init_tables(self):
        # notebook_chunks table schema
        chunks_schema = pa.schema([
            pa.field("vector", pa.list_(pa.float32(), 768)),
            pa.field("notebook_id", pa.string()),
            pa.field("source_id", pa.string()),
            pa.field("text", pa.string()),
            pa.field("location", pa.string())
        ])
        self.chunks_table = self.db.create_table("notebook_chunks", schema=chunks_schema, exist_ok=True)

        # topic_index table schema
        topic_schema = pa.schema([
            pa.field("notebook_id", pa.string()),
            pa.field("source_id", pa.string()),
            pa.field("topic", pa.string())
        ])
        self.topic_table = self.db.create_table("topic_index", schema=topic_schema, exist_ok=True)

        # Attempt to initialize FTS index for sparse searches
        try:
            self.chunks_table.create_fts_index("text", replace=True)
        except Exception as e:
            logger.warning(f"Could not initialize FTS index: {e}. Sparse search will run basic keyword match fallback.")

    async def index_source(self, notebook_id: str, source_id: str, source_type: str, parsed_content: Dict[str, Any]):
        # 1. Chunk content based on type
        s_type = source_type.lower()
        if s_type == "pdf":
            chunks = chunk_pdf(parsed_content)
        elif s_type == "codebase":
            chunks = chunk_codebase(parsed_content)
        elif s_type == "audio":
            chunks = chunk_audio(parsed_content)
        elif s_type == "ocr":
            from embeddings import RecursiveTextSplitter
            splitter = RecursiveTextSplitter()
            text = parsed_content.get("text", "")
            page_id = parsed_content.get("page_id", "1")
            split_texts = splitter.split_text(text)
            chunks = []
            for t in split_texts:
                if t.strip():
                    chunks.append({
                        "text": t,
                        "location": {"page_id": page_id}
                    })
        else:
            raise ValueError(f"Unsupported source type: {source_type}")

        if not chunks:
            logger.warning(f"No chunks generated for source_id {source_id} in notebook {notebook_id}.")
            return

        # 2. Extract topics from full content text
        full_text = " ".join([c["text"] for c in chunks])
        topics = await self.topic_extractor.extract_topics(full_text)

        # 3. Clean existing entries for incremental indexing
        escaped_nb_id = notebook_id.replace("'", "''")
        escaped_source_id = source_id.replace("'", "''")
        try:
            self.chunks_table.delete(f"notebook_id = '{escaped_nb_id}' AND source_id = '{escaped_source_id}'")
        except Exception as e:
            logger.debug(f"Delete from chunks_table failed or skipped: {e}")
            
        try:
            self.topic_table.delete(f"notebook_id = '{escaped_nb_id}' AND source_id = '{escaped_source_id}'")
        except Exception as e:
            logger.debug(f"Delete from topic_table failed or skipped: {e}")

        # 4. Save topics to topic_index
        if topics:
            topic_records = [
                {"notebook_id": notebook_id, "source_id": source_id, "topic": t}
                for t in topics
            ]
            self.topic_table.add(topic_records)

        # 5. Embed chunks and save to notebook_chunks
        texts_to_embed = [c["text"] for c in chunks]
        embeddings = await self.embed_client.get_embeddings_batch(texts_to_embed)

        records = []
        for c, emb in zip(chunks, embeddings):
            records.append({
                "notebook_id": notebook_id,
                "source_id": source_id,
                "text": c["text"],
                "vector": emb,
                "location": json.dumps(c["location"])
            })

        self.chunks_table.add(records)
        
        # Re-create/update FTS index
        try:
            self.chunks_table.create_fts_index("text", replace=True)
        except Exception:
            pass

    async def search(self, notebook_id: str, query: str, top_k: int = 5, source_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        if not query.strip():
            return []

        # 1. Extract topics from query and get candidate source IDs
        query_topics = await self.topic_extractor.extract_query_topics(query)
        escaped_nb_id = notebook_id.replace("'", "''")
        candidate_sources = []
        
        if query_topics:
            escaped_topics = [t.replace("'", "''") for t in query_topics]
            topic_placeholders = ", ".join([f"'{t}'" for t in escaped_topics])
            try:
                res = self.topic_table.search().where(
                    f"notebook_id = '{escaped_nb_id}' AND topic IN ({topic_placeholders})"
                ).to_list()
                candidate_sources = list({row["source_id"] for row in res})
            except Exception as e:
                logger.error(f"Error searching topic index: {e}")

        # 2. Build where filter expression
        escaped_nb_id = notebook_id.replace("'", "''")
        filter_expr = f"notebook_id = '{escaped_nb_id}'"
        if source_ids is not None:
            if not source_ids:
                return []
            escaped_req_sources = [s.replace("'", "''") for s in source_ids]
            req_sources_list = ", ".join([f"'{s}'" for s in escaped_req_sources])
            filter_expr += f" AND source_id IN ({req_sources_list})"
        if candidate_sources:
            escaped_sources = [s.replace("'", "''") for s in candidate_sources]
            sources_list = ", ".join([f"'{s}'" for s in escaped_sources])
            filter_expr += f" AND source_id IN ({sources_list})"

        # 3. Dense vector search
        query_vector = await self.embed_client.get_embedding(query)
        dense_res = []
        try:
            dense_res = self.chunks_table.search(query_vector).where(filter_expr).limit(top_k * 2).to_list()
        except Exception as e:
            logger.error(f"Dense vector search failed: {e}")

        # 4. Sparse BM25 FTS search
        sparse_res = []
        try:
            sparse_res = self.chunks_table.search(query, query_type="fts").where(filter_expr).limit(top_k * 2).to_list()
        except Exception as e:
            # Fallback if FTS / Tantivy fails: run search via simple python substring match
            logger.warning(f"FTS failed: {e}. Running basic substring match fallback.")
            try:
                all_nb_chunks = self.chunks_table.search().where(filter_expr).limit(1000).to_list()
                query_words = set(query.lower().split())
                matched_chunks = []
                for chunk in all_nb_chunks:
                    chunk_text_lower = chunk["text"].lower()
                    overlap = sum(1 for w in query_words if w in chunk_text_lower)
                    if overlap > 0:
                        chunk["_overlap_score"] = float(overlap)
                        matched_chunks.append(chunk)
                matched_chunks.sort(key=lambda x: x["_overlap_score"], reverse=True)
                sparse_res = matched_chunks[:top_k * 2]
            except Exception as fe:
                logger.error(f"Substring fallback search failed: {fe}")

        # 5. Combine results using Reciprocal Rank Fusion (RRF)
        combined = self._reciprocal_rank_fusion(dense_res, sparse_res)

        # 6. Re-rank / remove near-duplicates
        deduped = self._remove_near_duplicates(combined)

        # 7. Format final results to return
        final_results = []
        for doc in deduped[:top_k]:
            score = 0.0
            if "_distance" in doc and doc["_distance"] is not None:
                score = float(doc["_distance"])
            elif "_score" in doc and doc["_score"] is not None:
                score = float(doc["_score"])
            elif "_overlap_score" in doc and doc["_overlap_score"] is not None:
                score = float(doc["_overlap_score"])
            elif "rrf_score" in doc and doc["rrf_score"] is not None:
                score = float(doc["rrf_score"])
                
            final_results.append({
                "notebook_id": doc["notebook_id"],
                "source_id": doc["source_id"],
                "text": doc["text"],
                "location": json.loads(doc["location"]) if isinstance(doc["location"], str) else doc["location"],
                "score": score
            })

        return final_results

    def _reciprocal_rank_fusion(self, dense: List[dict], sparse: List[dict], k: int = 60) -> List[dict]:
        scores = {}
        docs = {}
        
        for rank, doc in enumerate(dense):
            key = (doc["source_id"], doc["text"])
            if key not in scores:
                scores[key] = 0.0
                docs[key] = doc
            scores[key] += 1.0 / (k + (rank + 1))
            
        for rank, doc in enumerate(sparse):
            key = (doc["source_id"], doc["text"])
            if key not in scores:
                scores[key] = 0.0
                docs[key] = doc
            scores[key] += 1.0 / (k + (rank + 1))
            
        sorted_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        results = []
        for key in sorted_keys:
            doc = docs[key]
            doc_copy = dict(doc)
            doc_copy["rrf_score"] = scores[key]
            results.append(doc_copy)
        return results

    def _remove_near_duplicates(self, docs: List[dict], threshold: float = 0.85) -> List[dict]:
        unique = []
        for doc in docs:
            is_dup = False
            words = set(doc["text"].lower().split())
            if not words:
                continue
            for u in unique:
                if doc.get("source_id") != u.get("source_id"):
                    continue
                u_words = set(u["text"].lower().split())
                if not u_words:
                    continue
                jaccard = len(words.intersection(u_words)) / len(words.union(u_words))
                if jaccard > threshold:
                    is_dup = True
                    break
            if not is_dup:
                unique.append(doc)
        return unique
