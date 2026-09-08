import logging
from typing import List, Dict, Any, Optional
from model_router import ModelRouter

logger = logging.getLogger("lecture_agents")

class BaseLectureAgent:
    def __init__(self, model_router: ModelRouter):
        self.router = model_router

    async def _generate_completion(self, prompt: str, system_prompt: str = "You are an expert academic assistant.") -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        # Use quality tier for synthesis tasks
        generator = self.router.generate(tier="quality", messages=messages)
        chunks = []
        async for chunk in generator:
            chunks.append(chunk)
        return "".join(chunks).strip()


class ConceptExtractor(BaseLectureAgent):
    async def extract_concepts(self, transcript: str, prof_notes: Optional[str] = None) -> str:
        logger.info("Agent 1: Extracting key concepts...")
        prof_section = f"\nProfessor's Outline Notes:\n{prof_notes}" if prof_notes else ""
        
        prompt = f"""Analyze the following lecture transcript and outline notes to extract the main concepts, definitions, and topic structure.

Lecture Transcript:
{transcript}
{prof_section}

Format the response as:
## Key Concepts
- **Concept Name**: brief definition/description (1-2 sentences)

## Topic Structure
1. **Topic Title**
   - Subtopic detail or context
   - Key point discussed
"""
        system_prompt = "You are a curriculum design expert. Extract only key concepts and core topics. Avoid wordy or redundant introductions."
        return await self._generate_completion(prompt, system_prompt)


class ConceptExplainer(BaseLectureAgent):
    async def explain_concepts(self, concepts_summary: str, textbook_excerpts: str) -> str:
        logger.info("Agent 2: Explaining concepts with textbook context...")
        
        prompt = f"""Explain the following key concepts in detail using the textbook search excerpts as context. Use clear explanations, real-world analogies, and concrete examples.

Concepts list:
{concepts_summary}

Textbook Reference Excerpts:
{textbook_excerpts}

For each concept, format your output as:
### **Concept Name**
- **Simple Definition**: [A simple, one-sentence explanation]
- **Detailed Explanation**: [2-3 paragraphs explaining the theory, context, and why it matters. Use analogies to make it intuitive.]
- **Illustrative Examples**: [Include 1-2 concrete, step-by-step examples from the lecture or textbook context.]
- **Key Characteristics**: [A bulleted list of properties or rules]
- **Related Ideas**: [List related concepts as Obsidian [[wikilinks]] for cross-referencing]
"""
        system_prompt = "You are an elite professor. Explain concepts clearly and concisely. Use Obsidian wikilinks like [[Concept]] for related ideas."
        return await self._generate_completion(prompt, system_prompt)


class DerivationFinder(BaseLectureAgent):
    async def find_derivations(self, concepts_summary: str, textbook_excerpts: str) -> str:
        logger.info("Agent 3: Finding mathematical derivations...")
        
        prompt = f"""Search the provided textbook excerpts to locate mathematical derivations, proofs, or step-by-step equations relevant to these concepts.

Concepts list:
{concepts_summary}

Textbook Reference Excerpts:
{textbook_excerpts}

If any derivations are found, write a step-by-step proof/derivation. Start from basic principles, explain the transition between each equation, and list the assumptions made. Use LaTeX for math.

Format each derivation as:
### **Derivation: [Formula or Theorem Name]**
- **Core Principle**: [Starting base formula or physical law]
- **Assumptions**: [List of conditions or assumptions made (e.g., constant temperature, frictionless, etc.)]
- **Step-by-Step Mathematical Derivation**:
  1. $$[Equation 1]$$ - [Explanation of why this step is written]
  2. $$[Equation 2]$$ - [Explanation of algebra, integration, or substitution]
  ...
- **Final Equation**: $$[Final result equation]$$
- **Citations**: [Textbook Source, Page number or Section reference]

If no mathematical derivations are present or relevant in the excerpts, respond with:
"No mathematical derivations found for these topics in the reference excerpts."
"""
        system_prompt = "You are a rigorous mathematician. Explain proofs step-by-step. Use block $$...$$ and inline $...$ LaTeX for equations."
        return await self._generate_completion(prompt, system_prompt)


class DiagramGenerator(BaseLectureAgent):
    async def generate_diagrams(self, concepts_summary: str, explanations: str) -> str:
        logger.info("Agent 4: Generating visual aids and Mermaid maps...")
        
        prompt = f"""Create visual aids and diagrams using Mermaid.js syntax based on the concepts and explanations below.

Concepts Summary:
{concepts_summary}

Explanations:
{explanations}

Generate exactly:
1. A **Concept Map** (Mermaid graph TD showing relationships between concepts)
2. A **Process Flow** (Mermaid graph LR showing any workflows, processes, or sequential calculations discussed)
3. A **LaTeX Equation Summary** (Cheat sheet of all important equations in block LaTeX format)

Use codeblocks for Mermaid like this:
```mermaid
graph TD
    ...
```
Do not include any other markdown wrapper. Make the diagrams clean, simple, and educational.
"""
        system_prompt = "You are a visual learning assistant. Create valid, clean Mermaid.js syntax diagrams and LaTeX cheatsheets."
        return await self._generate_completion(prompt, system_prompt)


class ObsidianFormatter(BaseLectureAgent):
    async def format_note(
        self,
        subject: str,
        lecture_num: int,
        concepts: str,
        explanations: str,
        derivations: str,
        diagrams: str,
        citations: List[str]
    ) -> str:
        logger.info("Agent 5: Formatting final Obsidian Markdown note...")
        
        citations_str = "\n".join([f"- {cite}" for cite in citations]) if citations else "- Lecture Recording & Professor Notes"
        
        prompt = f"""Compile, organize, and format all the generated note components into a final, unified Obsidian-ready Markdown note.

Subject: {subject}
Lecture: {lecture_num}

Component 1 (Concepts & Structure):
{concepts}

Component 2 (Detailed Explanations):
{explanations}

Component 3 (Derivations):
{derivations}

Component 4 (Diagrams & LaTeX Cheat Sheet):
{diagrams}

Citations:
{citations_str}

Please generate the final note with the following exact structure:
1. **YAML Frontmatter**:
---
subject: {subject}
lecture: {lecture_num}
date: [Current YYYY-MM-DD]
related: [Generate 3-4 related Obsidian links like [[ConceptA]], [[ConceptB]]]
difficulty: intermediate
---
2. **Note Header**: `# Lecture {lecture_num}: [Suggest an engaging title based on topics]`
3. **Overview**: A 3-4 sentence high-level summary of the lecture.
4. **Key Concept Map (Visuals)**: Include the Mermaid maps generated.
5. **Detailed Concept Explanations**: Present explanations cleanly using ## and ### headers. Ensure related concept terms are wrapped in wikilinks (e.g. [[ConceptName]]).
6. **Mathematical Derivations**: Present derivations.
7. **Practice & Review Questions**: Generate 5-7 active recall practice questions based on this lecture (e.g., conceptual questions, math application, etc.).
8. **Sources & References**: List the citations.
9. **Spaced Repetition Metadata**:
Next review: [YYYY-MM-DD + 7 days]
Review count: 0
"""
        system_prompt = "You are a technical editor. Synthesize all notes into a polished, structured Obsidian Markdown note. Ensure clean layout formatting."
        return await self._generate_completion(prompt, system_prompt)
