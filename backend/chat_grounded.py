# chat_grounded.py
import logging
from typing import Callable, Any, Coroutine, List, Dict, Optional
from base_agent import BaseAgent
from model_router import ModelRouter
from retriever import Retriever
from citation_verifier import CitationVerifier

logger = logging.getLogger(__name__)

class GroundedChatAgent(BaseAgent):
    def __init__(self, model_router: ModelRouter, retriever: Retriever):
        self.router = model_router
        self.retriever = retriever

    def _parse_command_and_query(self, payload: dict) -> tuple[str, str]:
        # Extract query text
        query = payload.get("content", "") or payload.get("query", "") or payload.get("text", "") or ""
        query = query.strip()
        
        # Try payload command first
        command = payload.get("command")
        if command:
            command = command.strip().lower()
            # Clean prefix from query if it starts with slash and matches command
            if query.startswith("/"):
                parts = query.split(maxsplit=1)
                cmd_prefix = parts[0][1:].lower()
                if cmd_prefix == command:
                    query = parts[1] if len(parts) > 1 else ""
            return command, query.strip()
        
        # Try query prefix
        if query.startswith("/"):
            parts = query.split(maxsplit=1)
            cmd_prefix = parts[0][1:].lower()
            valid_commands = {"derive", "explain", "feynman", "compare", "list", "summarize"}
            if cmd_prefix in valid_commands:
                command = cmd_prefix
                query = parts[1] if len(parts) > 1 else ""
                return command, query.strip()
                
        # Default command is explain
        return "explain", query

    def _get_system_prompt(self, command: str) -> str:
        base = (
            "You are The Core, a grounded AI assistant. You answer user queries strictly using "
            "the provided source chunks. Do not make any claims or state any facts that are not directly "
            "supported by the retrieved source chunks."
        )
        if command == "derive":
            return (
                f"{base}\n"
                "Format: You must output mathematical derivation steps. Format all mathematical equations "
                "and symbols using standard LaTeX math delimiters. Use single '$' for inline math "
                "(e.g., $E=mc^2$) and double '$$' for block math equations on their own lines (e.g., $$E=mc^2$$). "
                "Do not use '\\(' or '\\['. Ensure the derivation is step-by-step and strictly grounded in the sources."
            )
        elif command == "explain":
            return (
                f"{base}\n"
                "Format: Provide a detailed, clear, and conceptual explanation. The explanation must be strictly "
                "grounded in the retrieved chunks. If the retrieved chunks do not contain sufficient details to "
                "explain, state clearly that the information is not present in the sources."
            )
        elif command == "feynman":
            return (
                f"{base}\n"
                "Format: Explain the concepts as if the reader is 5 years old. Use simple analogies, very simple language, "
                "and minimal to no jargon. The explanation must remain strictly grounded in the source chunks."
            )
        elif command == "compare":
            return (
                f"{base}\n"
                "Format: Compare and contrast different topics, ideas, or documents presented in the retrieved chunks. "
                "Identify similarities and differences. Make sure you merge and reference the retrieved chunk info "
                "coherently, citing differences clearly based on the sources."
            )
        elif command == "list":
            return (
                f"{base}\n"
                "Format: Provide a bulleted list of key highlights, facts, or details directly from the source chunks. "
                "Keep each bullet point clear and concise, with no unnecessary explanations."
            )
        elif command == "summarize":
            return (
                f"{base}\n"
                "Format: Provide a concise, high-level summary of the retrieved context. Capture the main theme "
                "and primary takeaways. Keep the summary strictly grounded in the source chunks."
            )
        else:
            return base

    def _format_chunks_for_context(self, chunks: List[Dict[str, Any]], command: str) -> str:
        if not chunks:
            return "No relevant context found."
            
        if command == "compare":
            # Group by source_id to make comparisons clear
            grouped: Dict[str, List[Dict[str, Any]]] = {}
            for chunk in chunks:
                source = chunk.get("source_id", "Unknown Source")
                grouped.setdefault(source, []).append(chunk)
                
            parts = []
            for source, source_chunks in grouped.items():
                source_parts = [f"Source: {source}"]
                for idx, c in enumerate(source_chunks, 1):
                    loc = c.get("location")
                    loc_str = f" (Location: {loc})" if loc else ""
                    source_parts.append(f"  Chunk {idx}{loc_str}:\n  {c['text']}")
                parts.append("\n".join(source_parts))
            return "\n\n---\n\n".join(parts)
        else:
            # Standard numbering
            parts = []
            for idx, chunk in enumerate(chunks, 1):
                source = chunk.get("source_id", "Unknown Source")
                loc = chunk.get("location")
                loc_str = f" (Location: {loc})" if loc else ""
                parts.append(f"[{idx}] Source: {source}{loc_str}\nContent:\n{chunk['text']}")
            return "\n\n---\n\n".join(parts)

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        notebook_id = payload.get("notebook_id")
        if not notebook_id:
            raise ValueError("Missing 'notebook_id' in payload for GroundedChatAgent.")

        command, query = self._parse_command_and_query(payload)
        
        # 1. Retrieve chunks
        await send_token_callback("status", {"status": f"Searching relevant chunks in notebook {notebook_id}..."})
        top_k = payload.get("top_k", 5)
        source_ids = payload.get("source_ids")
        chunks = await self.retriever.search(notebook_id, query, top_k=top_k, source_ids=source_ids)

        # 2. Build prompts
        system_prompt = self._get_system_prompt(command)
        
        if not chunks:
            system_prompt = (
                "You are The Core, a helpful AI operating system assistant. "
                "Since no source chunks were found for this notebook, answer the user's question to the "
                "best of your ability and state that no relevant source context was found in the notebook."
            )
            context_str = "No relevant context found in database."
        else:
            context_str = self._format_chunks_for_context(chunks, command)

        user_content = f"Query: {query}\n\nRetrieved Context:\n{context_str}"
        
        history = payload.get("history")
        if not isinstance(history, list):
            history = []
        sanitised_history = []
        for entry in history:
            if not isinstance(entry, dict):
                continue
            role = entry.get("role")
            content = entry.get("content", "")
            if role in ("user", "assistant") and content:
                sanitised_history.append({"role": role, "content": content})

        messages = (
            [{"role": "system", "content": system_prompt}]
            + sanitised_history
            + [{"role": "user", "content": user_content}]
        )

        target_model = payload.get("model")
        
        # 3. Generate initial response
        await send_token_callback("status", {"status": "Generating initial grounded response..."})
        
        draft_response = ""
        try:
            # We call router.generate to get the draft response.
            # We don't stream it to the user yet because it needs verification first.
            async for token in self.router.generate(
                tier="fast",
                messages=messages,
                specific_model=target_model,
                temperature=payload.get("temperature", 0.7)
            ):
                draft_response += token
        except Exception as e:
            logger.error(f"Error during draft generation: {e}")
            raise RuntimeError(f"Failed to generate draft grounded response: {e}")

        # 4. Citation and Verification (Second Pass)
        await send_token_callback("status", {"status": "Verifying claims and inserting citations..."})
        
        verifier = CitationVerifier(self.router)
        verified_response = await verifier.verify(
            answer=draft_response,
            chunks=chunks,
            send_token_callback=send_token_callback,
            specific_model=target_model
        )

        citations = []
        for idx, chunk in enumerate(chunks, 1):
            location = chunk.get("location")
            page_val = 1
            if isinstance(location, dict):
                page_val = location.get("page_number", location.get("page", 1))
            elif isinstance(location, int):
                page_val = location
            citations.append({
                "source_id": chunk.get("source_id", f"doc-{idx}"),
                "text": chunk.get("text", ""),
                "page": page_val
            })

        return {"response": verified_response, "citations": citations}
