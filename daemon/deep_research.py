import os
import asyncio
import logging
from datetime import datetime
from typing import Callable, Any, Coroutine, List, Dict
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

class DeepResearch(BaseAgent):
    def __init__(self, model_router: ModelRouter, vault_search: VaultSearch, markit_down: MarkitDownNormalizer, active_gates: dict):
        self.router = model_router
        self.search_service = vault_search
        self.normalizer = markit_down
        self.active_gates = active_gates
        self.supervisor = AutopilotSupervisor()

    async def _search_web(self, queries: List[str]) -> List[str]:
        urls = []
        tavily_key = getattr(config, "TAVILY_API_KEY", "") or os.environ.get("TAVILY_API_KEY", "")
        if tavily_key:
            try:
                from tavily import TavilyClient
                client = TavilyClient(api_key=tavily_key)
                for q in queries[:3]:
                    res = client.search(q, max_results=3)
                    for result in res.get("results", []):
                        urls.append(result.get("url"))
            except Exception as e:
                logger.error(f"Tavily search failed: {e}")
        
        if not urls:
            logger.info("Falling back to simulated/mock search results.")
            urls = [
                "https://en.wikipedia.org/wiki/Artificial_intelligence",
                "https://arxiv.org/abs/1706.03762",
                "https://github.com/features/copilot"
            ]
        return list(set(urls))

    async def _crawl_url(self, url: str) -> str:
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(url, timeout=10000)
                html = await page.content()
                await browser.close()
        except Exception as e:
            logger.info(f"Playwright crawl failed or not installed, falling back to httpx: {e}")
            try:
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                    resp = await client.get(url, headers=headers)
                    html = resp.text
            except Exception as ex:
                return f"Failed to crawl {url}: {str(ex)}"

        try:
            soup = BeautifulSoup(html, 'html.parser')
            for script in soup(["script", "style"]):
                script.decompose()
            text = soup.get_text(separator=' ')
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            return "\n".join(chunk for chunk in chunks if chunk)
        except Exception as e:
            return f"Failed to parse content from {url}: {str(e)}"

    async def _check_supervisor(self, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]):
        halted, reason = self.supervisor.is_halted()
        if halted:
            await send_token_callback("error", {"error": f"Supervisor halted: {reason}"})
            raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        text = payload.get("content", "") or payload.get("text", "") or payload.get("topic", "")
        req_id = payload.get("req_id")

        if not text:
            raise ValueError("Research topic cannot be empty.")

        self.supervisor.reset()

        # --- Phase 1: Discovery ---
        self.supervisor.ping("DeepResearch")
        self.supervisor.log_action("DeepResearch", "generate_queries")
        
        await send_token_callback("status", {"status": "Generating search queries..."})
        query_prompt = (
            f"Generate 3-5 distinct, targeted web search queries to research the following topic: {text}. "
            f"Output the queries as a simple JSON list of strings."
        )
        messages = [{"role": "user", "content": query_prompt}]
        
        queries_json = ""
        async for chunk in self.router.generate(tier="fast", messages=messages):
            queries_json += chunk
            self.supervisor.add_tokens(len(chunk) / 4.0)

        await self._check_supervisor(send_token_callback)

        try:
            import json
            clean_json = queries_json.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            queries = json.loads(clean_json.strip())
        except Exception:
            queries = [q.strip() for q in queries_json.split("\n") if q.strip()][:3]

        await send_token_callback("status", {"status": "Searching the web..."})
        candidate_urls = await self._search_web(queries)

        gate_payload = {
            "proposed_topics": [f"Overview of {text}", "Key findings & statistics", "Recent developments"],
            "urls": candidate_urls,
            "estimated_time_seconds": len(candidate_urls) * 5
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
        approved_urls = confirm_payload.get("approved_urls", candidate_urls)
        if not approved_urls:
            approved_urls = candidate_urls

        # --- Phase 2: Crawl ---
        crawled_summaries = []
        visited_urls = set()
        for url in approved_urls:
            if url in visited_urls:
                logger.info(f"Skipping already visited URL: {url}")
                continue
            visited_urls.add(url)
            self.supervisor.ping("DeepResearch")
            self.supervisor.log_action("DeepResearch", f"crawl_{url}")
            await self._check_supervisor(send_token_callback)
                
            await send_token_callback("status", {"status": f"Crawling: {url}..."})
            raw_text = await self._crawl_url(url)
            
            await send_token_callback("status", {"status": f"Summarizing content from: {url}..."})
            summary_prompt = (
                f"Summarize the following web content in relation to the topic '{text}'. "
                f"Extract key facts, statistics, and conclusions. Source: {url}\n\nContent:\n{raw_text[:8000]}"
            )
            summary = ""
            try:
                async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": summary_prompt}]):
                    summary += chunk
                    self.supervisor.add_tokens(len(chunk) / 4.0)
                crawled_summaries.append(f"Source: {url}\nSummary:\n{summary}")
            except Exception as e:
                logger.error(f"Failed to summarize content from {url}: {e}")

            await self._check_supervisor(send_token_callback)

        # --- Phase 3: Synthesis ---
        self.supervisor.ping("DeepResearch")
        self.supervisor.log_action("DeepResearch", "synthesis")
        
        await send_token_callback("status", {"status": "Synthesizing final research report..."})
        synthesis_prompt = (
            f"Create a comprehensive, structured research report on the topic '{text}'. "
            f"Use the gathered web summaries below. Include sections like Introduction, Key Findings, "
            f"Detailed Analysis, and References. Cite the source URLs clearly.\n\n"
            f"## Web Research Summaries\n" + "\n\n---\n\n".join(crawled_summaries)
        )
        
        final_report = ""
        async for chunk in self.router.generate(tier="heavy", messages=[{"role": "user", "content": synthesis_prompt}]):
            final_report += chunk
            self.supervisor.add_tokens(len(chunk) / 4.0)
            await send_token_callback("token", {"text": chunk})

        await self._check_supervisor(send_token_callback)

        # Save report and track file write size
        report_bytes = len(final_report.encode('utf-8'))
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


