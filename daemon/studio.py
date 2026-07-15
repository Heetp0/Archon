import logging
from typing import Callable, Any, Coroutine, List, Dict
from base_agent import BaseAgent
from model_router import ModelRouter
from retriever import Retriever

logger = logging.getLogger(__name__)

class StudioAgent(BaseAgent):
    def __init__(self, model_router: ModelRouter, retriever: Retriever):
        self.router = model_router
        self.retriever = retriever

    def _get_system_prompt(self, artifact_type: str) -> str:
        if artifact_type == "study_guide":
            return (
                "You are an expert educator. Based on the retrieved context, generate a structured, detailed Study Guide.\n"
                "The study guide must include:\n"
                "1. Introduction/Overview\n"
                "2. Key Concepts (detailed explanations of important terms, ideas, or theories)\n"
                "3. Review Questions (questions to help students verify their understanding)\n"
                "Format the guide using clean markdown.\n"
                "CRITICAL: Any mathematical equations or expressions must be formatted using standard LaTeX delimiters: use '$' for inline math and '$$' for block equations."
            )
        elif artifact_type == "faq":
            return (
                "You are an expert technical writer. Based on the retrieved context, generate a Frequently Asked Questions (FAQ) document.\n"
                "It must consist of common questions that arise from the material, along with detailed, accurate, and helpful answers directly grounded in the context.\n"
                "Format the output as a list of markdown Q&A pairs.\n"
                "CRITICAL: Any mathematical equations or expressions must be formatted using standard LaTeX delimiters: use '$' for inline math and '$$' for block equations."
            )
        elif artifact_type == "timeline":
            return (
                "You are a historian and technical chronicler. Based on the retrieved context, generate a chronologically ordered Timeline of key milestones, dates, events, or logical steps.\n"
                "Each item must have a date/time/step label and a brief description. Format as a markdown list."
            )
        elif artifact_type == "quiz":
            return (
                "You are an examiner. Based on the retrieved context, generate a Quiz consisting of multiple-choice questions.\n"
                "Each question must include:\n"
                "- The question text\n"
                "- Four distinct options (labeled A, B, C, D)\n"
                "- The correct answer clearly stated\n"
                "- An explanation of why the correct answer is right and why the other options are incorrect.\n"
                "Format using clean markdown."
            )
        elif artifact_type == "mind_map":
            return (
                "You are a visual diagram designer. Based on the retrieved context, generate a valid Mermaid mind map.\n"
                "CRITICAL: The output must start with mindmap (or inside a markdown code block starting with `mermaid\\nmindmap). Ensure it uses valid Mermaid mind map syntax.\n"
                "Do not include any introductory or concluding conversational text outside the code block."
            )
        else:
            return "You are a helpful study assistant. Based on the retrieved context, generate study materials as requested."

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        notebook_id = payload.get("notebook_id")
        if not notebook_id:
            raise ValueError("Missing 'notebook_id' in payload for StudioAgent.")

        artifact_type = payload.get("artifact_type")
        if not artifact_type:
            raise ValueError("Missing 'artifact_type' in payload for StudioAgent.")

        valid_types = {"study_guide", "faq", "timeline", "quiz", "mind_map"}
        if artifact_type not in valid_types:
            raise ValueError(f"Invalid 'artifact_type': '{artifact_type}'. Must be one of {valid_types}.")

        # Retrieve context
        query = payload.get("query") or f"important concepts and main overview of {artifact_type}"
        top_k = payload.get("top_k", 10)
        
        await send_token_callback("status", {"status": f"Searching relevant context in notebook {notebook_id}..."})
        chunks = await self.retriever.search(notebook_id, query, top_k=top_k)

        # Build prompt
        system_prompt = self._get_system_prompt(artifact_type)
        
        if not chunks:
            context_str = "No relevant context found in the notebook database."
        else:
            parts = []
            for idx, chunk in enumerate(chunks, 1):
                source = chunk.get("source_id", "Unknown Source")
                parts.append(f"[{idx}] Source: {source}\nContent:\n{chunk['text']}")
            context_str = "\n\n---\n\n".join(parts)

        user_content = f"Retrieved Context:\n{context_str}\n\nPlease generate the '{artifact_type}' based strictly on the retrieved context above."
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        target_model = payload.get("model")
        temperature = payload.get("temperature", 0.7)

        await send_token_callback("status", {"status": f"Generating {artifact_type} artifact..."})
        
        artifact_content = ""
        try:
            async for token in self.router.generate(
                tier="fast",
                messages=messages,
                specific_model=target_model,
                temperature=temperature
            ):
                artifact_content += token
                await send_token_callback("token", {"text": token})
        except Exception as e:
            logger.error(f"Error during artifact generation: {e}")
            raise RuntimeError(f"Failed to generate {artifact_type} artifact: {e}")

        await send_token_callback("status", {"status": f"Completed generating {artifact_type}."})
        return {"artifact": artifact_content}