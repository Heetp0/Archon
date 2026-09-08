import os
import asyncio
import dataclasses
import json
import logging
import math
from datetime import datetime
from typing import Callable, Any, Coroutine, List, Dict, Optional
from base_agent import BaseAgent
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
from autopilot_supervisor import AutopilotSupervisor
from config import WORKSPACE_ROOT
import config
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("deep_research")


@dataclasses.dataclass
class ResearchSource:
    id: int
    url: str
    title: str
    snippet: str
    summary: str = ""


class DeepResearch(BaseAgent):
    def __init__(
        self,
        model_router: ModelRouter,
        vault_search: VaultSearch,
        markit_down: MarkitDownNormalizer,
        active_gates: dict,
    ):
        self.router = model_router
        self.search_service = vault_search
        self.normalizer = markit_down
        self.active_gates = active_gates
        self.supervisor = AutopilotSupervisor()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _search_single(self, query: str) -> List[ResearchSource]:
        """Run one Tavily query and return a list of ResearchSource objects."""
        sources: List[ResearchSource] = []
        tavily_key = getattr(config, "TAVILY_API_KEY", "") or os.environ.get("TAVILY_API_KEY", "")
        if tavily_key:
            try:
                from tavily import TavilyClient
                client = TavilyClient(api_key=tavily_key)
                res = client.search(query, max_results=3)
                for result in res.get("results", []):
                    url = result.get("url", "")
                    if url:
                        sources.append(ResearchSource(
                            id=0,
                            url=url,
                            title=result.get("title", url),
                            snippet=result.get("content", "")[:200],
                        ))
            except Exception as e:
                logger.error(f"Tavily search failed for query {query!r}: {e}")
        return sources

    async def _search_web(self, queries: List[str]) -> List[ResearchSource]:
        """Gather results from all queries concurrently, deduplicate by URL, assign IDs."""
        results_nested = await asyncio.gather(*[self._search_single(q) for q in queries])
        seen_urls: Dict[str, ResearchSource] = {}
        for batch in results_nested:
            for src in batch:
                if src.url not in seen_urls:
                    seen_urls[src.url] = src

        if not seen_urls:
            logger.info("Falling back to mock search results.")
            mock = [
                ("https://en.wikipedia.org/wiki/Artificial_intelligence", "Artificial Intelligence - Wikipedia", "Wikipedia reference"),
                ("https://arxiv.org/abs/1706.03762", "Attention Is All You Need - arXiv", "Wikipedia reference"),
                ("https://github.com/features/copilot", "GitHub Copilot", "Wikipedia reference"),
            ]
            for url, title, snippet in mock:
                domain = url.split("/")[2]
                seen_urls[url] = ResearchSource(id=0, url=url, title=domain, snippet=snippet)

        sources = list(seen_urls.values())
        for i, src in enumerate(sources, start=1):
            src.id = i
        return sources

    async def _crawl_url(self, url: str) -> str:
        """Fetch page HTML and return cleaned plain text. Playwright -> httpx fallback."""
        html = ""
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(url, timeout=10000)
                html = await page.content()
                await browser.close()
        except Exception as e:
            logger.info(f"Playwright crawl failed, falling back to httpx: {e}")
            try:
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                    resp = await client.get(url, headers=headers)
                    html = resp.text
            except Exception as ex:
                return f"Failed to crawl {url}: {str(ex)}"

        try:
            soup = BeautifulSoup(html, "html.parser")
            for tag in soup(["script", "style"]):
                tag.decompose()
            text = soup.get_text(separator=" ")
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            return "\n".join(chunk for chunk in chunks if chunk)
        except Exception as e:
            return f"Failed to parse content from {url}: {str(e)}"

    async def _crawl_and_summarize(
        self,
        source: ResearchSource,
        topic: str,
        send_cb: Callable[[str, Any], Coroutine[Any, Any, None]],
        supervisor: AutopilotSupervisor,
    ) -> ResearchSource:
        """Crawl one URL and LLM-summarize it. Caps concurrency via supervisor.semaphore. Never raises."""
        try:
            async with supervisor.semaphore:
                await send_cb("status", {"status": f"Crawling: {source.title}..."})
                raw_text = await self._crawl_url(source.url)

                summary_prompt = (
                    f"Summarize the following web content in relation to the topic {topic!r}. "
                    f"Extract key facts, statistics, and conclusions. Source: {source.url}\n\n"
                    f"Content:\n{raw_text[:8000]}"
                )
                summary = ""
                async for chunk in self.router.generate(
                    tier="fast",
                    messages=[{"role": "user", "content": summary_prompt}],
                ):
                    summary += chunk
                    supervisor.add_tokens(len(chunk) / 4.0)

                source.summary = summary
        except Exception as e:
            logger.error(f"Failed to crawl/summarize {source.url}: {e}")
            source.summary = ""
        return source

    async def _generate_outline(self, topic: str, sources: List[ResearchSource]) -> List[str]:
        """Ask the LLM for a Wikipedia-style section outline. Returns list of section titles."""
        source_titles = [s.title for s in sources]
        prompt = (
            f"You are a research director. Given the topic {topic!r} and these sources: {source_titles}, "
            f"generate a Wikipedia-style article outline as a JSON list of section title strings. "
            f"Include 5-8 sections. "
            "Example: [\"Introduction\", \"Background\", \"Key Findings\", \"Applications\", \"Future Directions\", \"Conclusion\"]. "
            f"Output ONLY the JSON array, no other text."
        )
        raw = ""
        async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}]):
            raw += chunk
            self.supervisor.add_tokens(len(chunk) / 4.0)

        try:
            clean = raw.strip()
            if clean.startswith("```"):
                parts = clean.split("```")
                clean = parts[1] if len(parts) > 1 else clean[3:]
                if clean.startswith("json"):
                    clean = clean[4:]
            sections = json.loads(clean.strip())
            if isinstance(sections, list) and sections:
                return [str(s) for s in sections]
        except Exception:
            pass
        return ["Introduction", "Key Findings", "Analysis", "Conclusion"]

    async def _generate_suggestions(self, topic: str, report: str) -> List[str]:
        """Generate 5 follow-up research questions as a JSON list."""
        prompt = (
            f"Given a research report on {topic!r}, generate exactly 5 concise follow-up research questions. "
            f"Output ONLY a JSON array of 5 strings."
        )
        raw = ""
        async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}]):
            raw += chunk
            self.supervisor.add_tokens(len(chunk) / 4.0)

        try:
            clean = raw.strip()
            if clean.startswith("```"):
                parts = clean.split("```")
                clean = parts[1] if len(parts) > 1 else clean[3:]
                if clean.startswith("json"):
                    clean = clean[4:]
            suggestions = json.loads(clean.strip())
            if isinstance(suggestions, list) and suggestions:
                return [str(s) for s in suggestions]
        except Exception:
            pass
        return [
            f"What are the latest developments in {topic}?",
            f"What are the main challenges in {topic}?",
            f"How does {topic} compare to alternative approaches?",
        ]

    def _extract_graph_nodes(self, report_text: str, topic: str) -> dict:
        """Extract up to 12 key terms from the report and build a graph structure."""
        import re
        headings = re.findall(r"^##\s+(.+)$", report_text, re.MULTILINE)
        bold_terms = re.findall(r"\*\*(.+?)\*\*", report_text)

        seen = set()
        terms: List[str] = []
        for t in [topic] + headings + bold_terms:
            key = t.strip().lower()
            if key and key not in seen:
                seen.add(key)
                terms.append(t.strip())
            if len(terms) == 12:
                break

        if not terms:
            terms = [topic]

        cx, cy, radius = 380, 230, 160
        nodes = []
        edges = []

        nodes.append({"id": 0, "label": terms[0], "x": cx, "y": cy, "r": 28, "primary": True})

        satellites = terms[1:]
        for i, label in enumerate(satellites):
            angle = (2 * math.pi * i) / max(len(satellites), 1)
            x = round(cx + radius * math.cos(angle))
            y = round(cy + radius * math.sin(angle))
            nodes.append({"id": i + 1, "label": label, "x": x, "y": y, "r": 18})
            edges.append({"from": 0, "to": i + 1})

        return {"nodes": nodes, "edges": edges}

    async def _check_supervisor(
        self, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]
    ):
        halted, reason = self.supervisor.is_halted()
        if halted:
            await send_token_callback("error", {"error": f"Supervisor halted: {reason}"})
            raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def run(
        self,
        payload: dict,
        send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]],
    ) -> dict:
        text = payload.get("content", "") or payload.get("text", "") or payload.get("topic", "")
        req_id = payload.get("req_id")

        if not text:
            raise ValueError("Research topic cannot be empty.")

        self.supervisor.reset()

        # Phase 1: Query generation and web search
        self.supervisor.ping("DeepResearch")
        self.supervisor.log_action("DeepResearch", "generate_queries")

        await send_token_callback("status", {"status": "Generating search queries..."})
        query_prompt = (
            f"Generate 3-5 distinct, targeted web search queries to research the following topic: {text}. "
            f"Output the queries as a simple JSON list of strings."
        )
        queries_json = ""
        async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": query_prompt}]):
            queries_json += chunk
            self.supervisor.add_tokens(len(chunk) / 4.0)

        await self._check_supervisor(send_token_callback)

        try:
            clean_json = queries_json.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            queries = json.loads(clean_json.strip())
        except Exception:
            queries = [q.strip() for q in queries_json.split("\n") if q.strip()][:3]

        await send_token_callback("status", {"status": "Searching the web..."})
        candidate_sources = await self._search_web(queries)

        gate_payload = {
            "proposed_topics": [f"Overview of {text}", "Key findings & statistics", "Recent developments"],
            "sources": [dataclasses.asdict(s) for s in candidate_sources],
            "estimated_time_seconds": len(candidate_sources) * 5,
        }
        await send_token_callback("gate", gate_payload)

        logger.info(f"DeepResearch awaiting gate decision for request: {req_id}")
        gate_queue = self.active_gates.get(req_id)
        if not gate_queue:
            raise RuntimeError("Internal error: No gate queue found for this request.")

        decision = await gate_queue.get()
        if decision.get("type") == "cancel":
            await send_token_callback("status", {"status": "Research cancelled by user."})
            return {"status": "cancelled"}

        confirm_payload = decision.get("payload", {}) or {}
        approved_urls: Optional[List[str]] = confirm_payload.get("approved_urls")
        if approved_urls:
            approved_sources = [s for s in candidate_sources if s.url in approved_urls]
        else:
            approved_sources = candidate_sources

        if not approved_sources:
            approved_sources = candidate_sources

        # Phase 1.5: Outline generation
        await send_token_callback("status", {"status": "Planning report structure..."})
        sections = await self._generate_outline(text, approved_sources)
        await send_token_callback("outline", {"sections": sections})
        await self._check_supervisor(send_token_callback)

        # Phase 2: Concurrent crawl and summarize
        self.supervisor.ping("DeepResearch")
        self.supervisor.log_action("DeepResearch", "crawl")

        tasks = [
            self._crawl_and_summarize(s, text, send_token_callback, self.supervisor)
            for s in approved_sources
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        enriched_sources: List[ResearchSource] = []
        for r in results:
            if isinstance(r, ResearchSource):
                enriched_sources.append(r)
            else:
                logger.error(f"Crawl task raised an exception: {r}")

        if not enriched_sources:
            enriched_sources = approved_sources

        await self._check_supervisor(send_token_callback)

        # Phase 3: Synthesis with inline citations
        self.supervisor.ping("DeepResearch")
        self.supervisor.log_action("DeepResearch", "synthesis")

        await send_token_callback("status", {"status": "Synthesizing final research report..."})

        refs = "\n".join(f"[{s.id}] {s.url} - {s.title}" for s in enriched_sources)
        summ_block = "\n\n---\n\n".join(
            f"Source [{s.id}] ({s.url}):\n{s.summary}" for s in enriched_sources
        )
        sections_list = ", ".join(f'"{sec}"' for sec in sections)

        synthesis_prompt = (
            f"You are writing a comprehensive research article on {text!r}. "
            f"Structure it with these exact sections: [{sections_list}]. "
            f"Use numbered inline citations [N] from the reference list when making factual claims. "
            f"Every major claim must cite at least one source. Write in an encyclopedic style.\n\n"
            f"Reference List:\n{refs}\n\n"
            f"Source Summaries:\n{summ_block}"
        )

        final_report = ""
        async for chunk in self.router.generate(
            tier="heavy",
            messages=[{"role": "user", "content": synthesis_prompt}],
        ):
            final_report += chunk
            self.supervisor.add_tokens(len(chunk) / 4.0)
            await send_token_callback("token", {"text": chunk})

        await self._check_supervisor(send_token_callback)

        # Phase 3.5: Emit structured sources
        await send_token_callback("sources", {"sources": [dataclasses.asdict(s) for s in enriched_sources]})

        # Phase 3.6: Extract and emit graph nodes
        graph_data = self._extract_graph_nodes(final_report, text)
        await send_token_callback("graph_nodes", graph_data)

        # Phase 3.7: Generate follow-up suggestions
        suggestions = await self._generate_suggestions(text, final_report[:3000])
        await send_token_callback("suggestions", {"suggestions": suggestions})

        # Save report to ResearchHub
        report_bytes = len(final_report.encode("utf-8"))
        self.supervisor.add_write_volume(report_bytes)
        await self._check_supervisor(send_token_callback)

        research_hub_dir = os.path.join(WORKSPACE_ROOT, "Workspace", "ResearchHub")
        os.makedirs(research_hub_dir, exist_ok=True)
        safe_topic = "".join(c for c in text if c.isalnum() or c in " -_").strip().replace(" ", "_")
        filename = f"{datetime.now().strftime('%Y-%m-%d')}-{safe_topic}.md"
        file_path = os.path.join(research_hub_dir, filename)
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(final_report)
            await send_token_callback("status", {"status": f"Report saved to ResearchHub: {filename}"})
        except Exception as e:
            logger.error(f"Failed to save report: {e}")

        return {"report": final_report, "saved_path": file_path}
