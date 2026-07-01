import logging
logger = logging.getLogger(__name__)

import os
import json
import lancedb
import numpy as np
from typing import List, Dict, Any, Optional
from fastembed import TextEmbedding
import sys
sys.path.append(os.path.dirname(__file__))
import vault_parser

import threading

class VaultSearch:
    def __init__(self, db_path: str, vault_path: str, model_name: str = 'sentence-transformers/all-MiniLM-L6-v2'):
        self.db_path = db_path
        self.vault_path = vault_path
        os.makedirs(db_path, exist_ok=True)
        self.db = lancedb.connect(db_path)
        self.model = TextEmbedding(model_name)
        self.table_name = 'vault_chunks'
        self.lock = threading.Lock()
        self._init_table()

    def _init_table(self):
        try:
            self.table = self.db.open_table(self.table_name)
        except Exception:
            # Create table with dummy data to define schema if not found
            dummy_data = [{
                'vector': list(self.model.embed(['dummy text']))[0].tolist(),
                'relative_path': 'dummy.md',
                'title': 'Dummy',
                'text': 'dummy text',
                'content_hash': 'dummy_hash',
                'tags': ''
            }]
            self.table = self.db.create_table(self.table_name, dummy_data, exist_ok=True)

    def chunk_text(self, text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)
            if i + chunk_size >= len(words):
                break
        return chunks

    def index_vault(self):
        """Scan vault, parse markdown notes, and incrementally index them in LanceDB."""
        notes = vault_parser.walk_vault(self.vault_path)
        
        # Get currently indexed files and hashes to do incremental updates
        indexed_hashes = {}
        try:
            # Query all items in lancedb table
            df = self.table.to_pandas()
            for _, row in df.iterrows():
                indexed_hashes[row['relative_path']] = row['content_hash']
        except Exception as e:
            logger.warning(f"Handled exception: {e}")

        new_data = []
        deleted_paths = set(indexed_hashes.keys())

        # Collect all updated/new chunks to embed in a single batch
        chunks_to_embed = []
        chunk_metadata = []

        for note in notes:
            rel_path = note['relative_path']
            if rel_path in deleted_paths:
                deleted_paths.remove(rel_path)

            # Check if updated
            if rel_path not in indexed_hashes or indexed_hashes[rel_path] != note['content_hash']:
                # Delete old chunks for this file from the table
                if rel_path in indexed_hashes:
                    self.table.delete(f'relative_path = "{rel_path}"')

                # Read actual file content to chunk it
                full_path = os.path.join(self.vault_path, rel_path)
                if os.path.exists(full_path):
                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            text = f.read()
                        chunks = self.chunk_text(text)
                        for chunk in chunks:
                            chunks_to_embed.append(chunk)
                            chunk_metadata.append({
                                'relative_path': rel_path,
                                'title': note['title'],
                                'text': chunk,
                                'content_hash': note['content_hash'],
                                'tags': ','.join(note['tags'])
                            })
                    except Exception as e:
                        print(f'Error reading/chunking {rel_path}: {str(e)}')

        # Batch embed all collected chunks in a single operation
        if chunks_to_embed:
            try:
                embeddings = list(self.model.embed(chunks_to_embed))
                for meta, emb in zip(chunk_metadata, embeddings):
                    meta['vector'] = emb.tolist()
                    new_data.append(meta)
            except Exception as e:
                print(f'Error batch embedding: {str(e)}')

        # Remove deleted files
        for del_path in deleted_paths:
            self.table.delete(f'relative_path = "{del_path}"')

        # Insert new chunks
        if new_data:
            self.table.add(new_data)

    def _get_graph_connections(self, relative_path: str) -> List[str]:
        """Load Graphify's graph.json if present to find connected note nodes."""
        # Check common output directory
        parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        graph_path = os.path.join(parent_dir, 'graphify-out', 'graph.json')
        if not os.path.exists(graph_path):
            return []

        try:
            with open(graph_path, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
            
            # Find links/connections for this note filename
            filename = os.path.basename(relative_path)
            connections = []
            if 'edges' in graph_data:
                for edge in graph_data['edges']:
                    source = edge.get('source', '')
                    target = edge.get('target', '')
                    if filename.lower() in source.lower():
                        connections.append(target)
                    elif filename.lower() in target.lower():
                        connections.append(source)
            return list(set(connections))
        except Exception:
            return []

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Vector search with structural graph traversal extension."""
        query_vec = list(self.model.embed([query]))[0].tolist()
        # Exclude dummy record
        res = self.table.search(query_vec).where('relative_path != "dummy.md"').limit(top_k).to_list()
        
        search_results = []
        for r in res:
            rel_path = r['relative_path']
            # Find connected nodes from structural knowledge graph
            graph_links = self._get_graph_connections(rel_path)
            
            search_results.append({
                'relative_path': rel_path,
                'title': r['title'],
                'text': r['text'],
                'tags': r['tags'].split(',') if r['tags'] else [],
                'score': r.get('_distance', 0.0),
                'graph_related_nodes': graph_links
            })
        return search_results
