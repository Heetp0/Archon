import logging
from typing import List, Dict, Any, Optional, Callable, Coroutine
from model_router import ModelRouter
from lecture_agents import (
    ConceptExtractor,
    ConceptExplainer,
    DerivationFinder,
    DiagramGenerator,
    ObsidianFormatter
)

logger = logging.getLogger("note_generator")

class NoteGenerator:
    def __init__(self, model_router: ModelRouter):
        self.router = model_router
        self.extractor = ConceptExtractor(model_router)
        self.explainer = ConceptExplainer(model_router)
        self.derivation = DerivationFinder(model_router)
        self.diagram = DiagramGenerator(model_router)
        self.formatter = ObsidianFormatter(model_router)

    async def generate_lecture_notes(
        self,
        transcript: str,
        prof_notes: Optional[str],
        subject: str,
        lecture_num: int,
        retriever: Any,
        notebook_id: Optional[str] = "default_notebook",
        progress_callback: Optional[Callable[[str, int], Coroutine[Any, Any, None]]] = None
    ) -> str:
        """Orchestrate all 5 agents sequentially to produce study notes, fetching textbook context from LanceDB."""
        
        # --- Step 1: Extract concepts ---
        if progress_callback:
            await progress_callback("extract_concepts", 15)
        concepts = await self.extractor.extract_concepts(transcript, prof_notes)
        logger.info("Agent 1 extracted key concepts successfully.")

        # --- Step 2: Vector Search textbook context in LanceDB ---
        if progress_callback:
            await progress_callback("searching_textbooks", 30)
        
        # Extract query topics from the concepts summary
        topics = await retriever.topic_extractor.extract_query_topics(concepts)
        logger.info(f"Extracted topics for retrieval: {topics}")
        
        excerpts_list = []
        citations = []
        
        # Query retriever for each topic
        for topic in topics[:5]:  # Query up to 5 topics to control context size
            try:
                results = await retriever.search(notebook_id=notebook_id, query=topic, top_k=3)
                for r in results:
                    text = r.get("chunk") or r.get("text") or ""
                    # Check sources in metadata
                    metadata = r.get("metadata", {})
                    source = r.get("source") or metadata.get("filename") or metadata.get("source_id") or "Textbook Reference"
                    page = r.get("page") or metadata.get("page") or ""
                    page_str = f", Page {page}" if page else ""
                    
                    excerpts_list.append(f"[{source}{page_str}]: {text}")
                    citations.append(f"{source}{page_str}")
            except Exception as e:
                logger.warning(f"Retriever search failed for topic '{topic}': {e}")
                
        textbook_excerpts = "\n\n".join(excerpts_list)
        if not textbook_excerpts:
            textbook_excerpts = "No textbook reference excerpts found in vector database."
            
        # Deduplicate citations
        citations = list(set(citations))
        logger.info(f"Retrieved {len(excerpts_list)} relevant textbook excerpts with citations: {citations}")

        # --- Step 3: Explain concepts ---
        if progress_callback:
            await progress_callback("explaining_concepts", 50)
        explanations = await self.explainer.explain_concepts(concepts, textbook_excerpts)
        logger.info("Agent 2 explained concepts successfully.")

        # --- Step 4: Locate derivations ---
        if progress_callback:
            await progress_callback("finding_derivations", 70)
        derivations = await self.derivation.find_derivations(concepts, textbook_excerpts)
        logger.info("Agent 3 searched derivations successfully.")

        # --- Step 5: Generate diagrams ---
        if progress_callback:
            await progress_callback("generating_diagrams", 85)
        diagrams = await self.diagram.generate_diagrams(concepts, explanations)
        logger.info("Agent 4 generated Mermaid diagrams successfully.")

        # --- Step 6: Final Obsidian Formatting ---
        if progress_callback:
            await progress_callback("formatting_notes", 95)
        final_notes = await self.formatter.format_note(
            subject=subject,
            lecture_num=lecture_num,
            concepts=concepts,
            explanations=explanations,
            derivations=derivations,
            diagrams=diagrams,
            citations=citations
        )
        logger.info("Agent 5 formatted the final note successfully.")

        if progress_callback:
            await progress_callback("done", 100)

        return final_notes
