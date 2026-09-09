import os
import sys
import time
import json
import asyncio
from typing import Callable, Any, Coroutine, Dict, List, Optional, TypedDict
from base_agent import BaseAgent
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
from opencode_client import OpenCodeClient
from autopilot_supervisor import AutopilotSupervisor
from agent_journal import AgentJournal
from config import WORKSPACE_ROOT
from langgraph.graph import StateGraph, END

# ─── State Schema ────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    task: str
    context: str          # summarized reader context
    plan: str             # raw plan markdown
    plan_steps: list      # structured JSON steps [{id, title, acceptance_criteria}]
    code: str             # raw generated code
    solution_preview: str # first 4000 chars of solution.py for gate display
    test_result: str      # tester verdict
    logs: str             # logger summary
    error: str
    retry_count: int      # how many coder→tester cycles have been attempted


# ─── Runtime ─────────────────────────────────────────────────────────────────

class AgentRuntime(BaseAgent):
    """
    Multi-agent LangGraph runtime for Archon Agents Mode.

    Pipeline:  reader → planner → coder → delegator → tester ──(FAIL+retry)──┐
                                                              └──(PASS/max)──► logger → END

    Key features matching top agentic platforms:
    - Structured JSON plan with per-step acceptance criteria (Devin-style)
    - Live plan_steps streaming so frontend shows progress per step
    - Solution preview embedded in approval gate payload (Claude Code-style inline diff)
    - Coder retry loop: up to MAX_RETRIES=3 on FAIL verdict (Codex autopilot)
    - Sliding-window context summarization: no silent context overflow
    - session_metadata event on completion: enables frontend history replay
    - Full SQLite journal with per-step checkpoints for mid-run resume
    - Path-traversal guard and human-approval gate (already in place)
    """

    MAX_RETRIES = 3
    CONTEXT_CHAR_LIMIT = 6000   # chars before triggering summarization

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
        self.opencode = OpenCodeClient()
        self.supervisor = AutopilotSupervisor()

        db_dir = os.path.join(WORKSPACE_ROOT, ".lancedb")
        self.journal = AgentJournal(db_dir)

        self.callback: Optional[Callable] = None
        self.last_completed_step_index = 0

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _check_watchdog(self, agent_name: str, node_name: str):
        self.supervisor.ping(agent_name)
        if not self.supervisor.log_action(agent_name, node_name):
            halted, reason = self.supervisor.is_halted()
            await self.callback("error", {"error": f"Supervisor halted: {reason}"})
            raise RuntimeError(f"Autopilot Supervisor halted: {reason}")
        halted, reason = self.supervisor.is_halted()
        if halted:
            await self.callback("error", {"error": f"Supervisor halted: {reason}"})
            raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

    async def _summarize_if_needed(self, text: str, label: str = "content") -> str:
        """
        If text exceeds CONTEXT_CHAR_LIMIT, compress it via the fast model tier.
        Returns original text unchanged if within budget.
        Mirrors Claude Code's context window management.
        """
        if len(text) <= self.CONTEXT_CHAR_LIMIT:
            return text
        await self.callback("status", {
            "status": f"Context Manager: Summarizing {label} ({len(text)} chars → budget {self.CONTEXT_CHAR_LIMIT})...",
            "model": "Context Manager"
        })
        prompt = (
            f"Summarize the following {label} into concise bullet points, "
            f"preserving all key facts, file paths, function names, and error messages:\n\n{text}"
        )
        summary = ""
        async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}]):
            summary += chunk
            self.supervisor.add_tokens(len(chunk) / 4.0)
        return summary.strip()

    def _parse_plan_steps(self, plan_text: str) -> list:
        """
        Try to parse a JSON plan block from the planner output.
        Falls back to splitting markdown numbered list items.
        Returns a list of dicts: [{id, title, acceptance_criteria}]
        """
        # Try JSON block first (```json ... ```)
        import re
        json_match = re.search(r"```json\s*(\[.*?\])\s*```", plan_text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Fallback: parse numbered markdown steps
        steps = []
        for i, line in enumerate(plan_text.splitlines(), 1):
            stripped = re.sub(r"^\s*\d+[\.\)]\s*", "", line).strip()
            if stripped:
                steps.append({
                    "id": i,
                    "title": stripped,
                    "acceptance_criteria": f"Step {i} completes without error"
                })
        return steps[:15]  # cap at 15 steps

    # ── Main Run ──────────────────────────────────────────────────────────────

    async def run(
        self,
        payload: dict,
        send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]],
    ) -> dict:
        self.callback = send_token_callback
        self.supervisor.reset()

        token_budget = payload.get("token_budget")
        if token_budget:
            self.supervisor.token_budget = int(token_budget)

        task_text = payload.get("content", "") or payload.get("text", "") or payload.get("topic", "")
        if not task_text:
            raise ValueError("Task description cannot be empty.")

        task_id = payload.get("task_id", f"task_{int(time.time())}")
        req_id = payload.get("req_id") or payload.get("task_id")
        gate_queue = self.active_gates.get(req_id) if (req_id and self.active_gates) else None
        self.journal.start_run(task_id)

        # ── Build initial state ──────────────────────────────────────────────
        workflow = StateGraph(AgentState)

        initial_state: AgentState = {
            "task": task_text,
            "context": "",
            "plan": "",
            "plan_steps": [],
            "code": "",
            "solution_preview": "",
            "test_result": "",
            "logs": "",
            "error": "",
            "retry_count": 0,
        }

        # ── Journal resume ───────────────────────────────────────────────────
        self.last_completed_step_index = 0
        checkpoint = self.journal.get_last_checkpoint(task_id)
        if checkpoint:
            self.last_completed_step_index = checkpoint["step_index"]
            await self.callback("status", {
                "status": f"Journal: Restoring state from step {self.last_completed_step_index}..."
            })
            for step in self.journal.get_all_steps(task_id):
                if step["output_payload"]:
                    initial_state.update(step["output_payload"])

        # ════════════════════════════════════════════════════════════════════
        #  NODE DEFINITIONS
        # ════════════════════════════════════════════════════════════════════

        async def reader_node(state: AgentState) -> dict:
            """
            Scans vault for relevant context. Summarizes if too long.
            Mirrors Claude Code's initial codebase read phase.
            """
            if self.last_completed_step_index >= 1:
                await self.callback("token", {"content": "[Journal RESTORED] Reader context retrieved.\n", "model": "Reader"})
                return {}

            await self._check_watchdog("Reader", "reader_node")
            await self.callback("status", {"status": "Reader: Scanning workspace for context...", "model": "Reader"})
            await self.callback("tool_call", {
                "tool": "vault_search",
                "input": task_text[:200],
                "status": "running"
            })

            results = self.search_service.search(task_text, top_k=3)
            raw_context = ""
            for res in results:
                raw_context += f"\n### {res['relative_path']}\n{res['text']}\n"

            await self.callback("tool_call", {
                "tool": "vault_search",
                "input": task_text[:200],
                "status": "done",
                "result_count": len(results)
            })

            context = await self._summarize_if_needed(raw_context, "vault context")
            await self.callback("token", {"content": f"**Reader:** Found {len(results)} relevant files.\n\n{context}\n\n", "model": "Reader"})

            output = {"context": context, "plan": f"Context:\n{context}"}
            self.journal.log_step(task_id, 1, "Reader", "reader_node", state, output)
            return output

        async def planner_node(state: AgentState) -> dict:
            """
            Generates a structured JSON plan with per-step acceptance criteria.
            Streams steps immediately so the frontend can show a live checklist.
            Mirrors Devin's 'Plan' phase where each step is visible before execution.
            """
            if self.last_completed_step_index >= 2:
                await self.callback("token", {"content": "[Journal RESTORED] Plan loaded.\n", "model": "Planner"})
                return {}

            await self._check_watchdog("Planner", "planner_node")
            await self.callback("status", {"status": "Planner: Building structured execution plan...", "model": "Planner"})

            context_input = await self._summarize_if_needed(state.get("context", "") or state.get("plan", ""), "context")

            prompt = (
                "You are the Planner Agent. Create a precise, step-by-step implementation plan.\n\n"
                f"Task: {state['task']}\n"
                f"Context:\n{context_input}\n\n"
                "First, output a ```json block containing an array of steps, each with:\n"
                "  { \"id\": <int>, \"title\": \"<short title>\", \"acceptance_criteria\": \"<verifiable done condition>\" }\n\n"
                "Then, after the JSON block, write a brief markdown summary of the approach.\n"
                "Do not write any code yet."
            )

            plan = ""
            async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}]):
                plan += chunk
                self.supervisor.add_tokens(len(chunk) / 4.0)
                await self.callback("token", {"content": chunk, "model": "Planner"})

            halted, reason = self.supervisor.is_halted()
            if halted:
                await self.callback("error", {"error": f"Supervisor halted: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

            # Parse and broadcast structured steps
            plan_steps = self._parse_plan_steps(plan)
            await self.callback("plan_steps", {"steps": plan_steps, "task_id": task_id})

            # Persist plan files
            plan_dir = os.path.join(WORKSPACE_ROOT, "Workspace", "ProjectHub", "Plan")
            os.makedirs(plan_dir, exist_ok=True)
            with open(os.path.join(plan_dir, "current_plan.md"), "w", encoding="utf-8") as f:
                f.write(plan)
            with open(os.path.join(plan_dir, "current_plan.json"), "w", encoding="utf-8") as f:
                json.dump(plan_steps, f, indent=2)

            if not self.supervisor.add_write_volume(len(plan.encode())):
                halted, reason = self.supervisor.is_halted()
                await self.callback("error", {"error": f"Supervisor halted: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

            output = {"plan": plan, "plan_steps": plan_steps}
            self.journal.log_step(task_id, 2, "Planner", "planner_node", state, output)
            return output

        async def coder_node(state: AgentState) -> dict:
            """
            Writes implementation code. Includes retry context on re-runs so the
            model knows what went wrong last time (Codex autopilot retry pattern).
            Strips markdown wrappers from output before writing solution.py.
            """
            step_threshold = 3 + (state.get("retry_count", 0) * 3)
            if self.last_completed_step_index >= step_threshold:
                await self.callback("token", {"content": "[Journal RESTORED] Code loaded.\n", "model": "Coder"})
                return {}

            await self._check_watchdog("Coder", "coder_node")
            retry_count = state.get("retry_count", 0)
            retry_label = f" (Retry {retry_count}/{self.MAX_RETRIES})" if retry_count > 0 else ""
            await self.callback("status", {
                "status": f"Coder: Writing implementation code{retry_label}...",
                "model": "Coder"
            })

            # Include failure context on retries — crucial for self-correction
            retry_context = ""
            if retry_count > 0:
                prev_result = state.get("test_result", "")
                retry_context = (
                    f"\n\n⚠️ PREVIOUS ATTEMPT FAILED. Tester verdict:\n{prev_result}\n"
                    f"Fix the specific issues described above. Do not repeat the same mistakes."
                )

            plan_input = await self._summarize_if_needed(state.get("plan", ""), "plan")

            prompt = (
                "You are the Coder Agent. Write production-quality Python code for this plan.\n\n"
                f"Task: {state['task']}\n"
                f"Plan:\n{plan_input}"
                f"{retry_context}\n\n"
                "Output ONLY the raw Python code with no markdown wrapping. "
                "Include proper error handling, type hints, and comments."
            )

            code = ""
            await self.callback("token", {"content": f"\n```python\n", "model": "Coder"})
            async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}]):
                code += chunk
                self.supervisor.add_tokens(len(chunk) / 4.0)
                await self.callback("token", {"content": chunk, "model": "Coder"})
            await self.callback("token", {"content": "\n```\n\n", "model": "Coder"})

            halted, reason = self.supervisor.is_halted()
            if halted:
                await self.callback("error", {"error": f"Supervisor halted: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

            # Strip markdown wrappers
            clean_code = code.strip()
            for prefix in ("```python\n", "```python", "```\n", "```"):
                if clean_code.startswith(prefix):
                    clean_code = clean_code[len(prefix):]
                    break
            if clean_code.endswith("```"):
                clean_code = clean_code[:-3]
            clean_code = clean_code.strip()

            codes_dir = os.path.join(WORKSPACE_ROOT, "Workspace", "ProjectHub", "Codes")
            os.makedirs(codes_dir, exist_ok=True)
            solution_path = os.path.join(codes_dir, "solution.py")
            with open(solution_path, "w", encoding="utf-8") as f:
                f.write(clean_code)

            # Cap preview at 4000 chars for gate display
            solution_preview = clean_code[:4000]
            if len(clean_code) > 4000:
                solution_preview += f"\n\n... ({len(clean_code) - 4000} more chars)"

            if not self.supervisor.add_write_volume(len(clean_code.encode())):
                halted, reason = self.supervisor.is_halted()
                await self.callback("error", {"error": f"Supervisor halted: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

            output = {"code": code, "solution_preview": solution_preview}
            journal_step = 3 + (retry_count * 3)
            self.journal.log_step(task_id, journal_step, "Coder", "coder_node", state, output)
            return output

        async def delegator_node(state: AgentState) -> dict:
            """
            Human-in-the-loop approval gate before code execution.
            Gate payload includes solution_preview so the user can read the code
            before approving — matches Claude Code's inline diff-before-apply UX.
            """
            retry_count = state.get("retry_count", 0)
            step_threshold = 4 + (retry_count * 3)
            if self.last_completed_step_index >= step_threshold:
                await self.callback("token", {"content": "[Journal RESTORED] Execution output retrieved.\n", "model": "Delegator"})
                return {}

            await self._check_watchdog("Delegator", "delegator_node")
            opencode_prompt = f"Run and test the code in solution.py in {WORKSPACE_ROOT}"

            if gate_queue:
                # Emit gate event with full solution preview for diff display
                gate_payload = {
                    "action": "execute_code",
                    "command": opencode_prompt,
                    "target_subproject": "Workspace/ProjectHub",
                    "files_affected": ["solution.py"],
                    "solution_preview": state.get("solution_preview", ""),
                    "retry_count": retry_count,
                    "plan_steps": state.get("plan_steps", []),
                }
                await self.callback("gate", gate_payload)
                await self.callback("status", {
                    "status": "Delegator: Waiting for user approval to execute...",
                    "model": "Delegator"
                })
                decision = await gate_queue.get()
                if decision == "cancel" or (isinstance(decision, dict) and decision.get("decision") == "deny"):
                    cancel_msg = "\n[USER REJECTED] Code execution denied by user.\n"
                    await self.callback("token", {"content": cancel_msg, "model": "Delegator"})
                    output = {"test_result": "Execution cancelled by user."}
                    self.journal.log_step(task_id, step_threshold, "Delegator", "delegator_node", state, output)
                    return output

            await self.callback("status", {"status": "Delegator: Executing via OpenCode...", "model": "Delegator"})
            await self.callback("tool_call", {
                "tool": "opencode",
                "input": opencode_prompt,
                "status": "running"
            })

            output_lines: List[str] = []
            async for line in self.opencode.execute_task(opencode_prompt, subproject_path="Workspace/ProjectHub"):
                output_lines.append(line)
                self.supervisor.add_tokens(len(line) / 4.0)
                await self.callback("token", {"content": line, "model": "Delegator"})

            await self.callback("tool_call", {
                "tool": "opencode",
                "input": opencode_prompt,
                "status": "done",
                "exit_code": 0
            })

            halted, reason = self.supervisor.is_halted()
            if halted:
                await self.callback("error", {"error": f"Supervisor halted: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

            output = {"test_result": "".join(output_lines)}
            self.journal.log_step(task_id, step_threshold, "Delegator", "delegator_node", state, output)
            return output

        async def tester_node(state: AgentState) -> dict:
            """
            Evaluates execution output and returns PASS or FAIL verdict.
            FAIL verdict triggers retry loop up to MAX_RETRIES.
            Mirrors Codex autopilot's test-fix-rerun cycle.
            """
            retry_count = state.get("retry_count", 0)
            step_threshold = 5 + (retry_count * 3)
            if self.last_completed_step_index >= step_threshold:
                await self.callback("token", {"content": f"[Journal RESTORED] Verdict: {state['test_result']}\n", "model": "Tester"})
                return {}

            await self._check_watchdog("Tester", "tester_node")

            # Skip testing if user cancelled
            if "cancelled" in state.get("test_result", "").lower() or \
               "rejected" in state.get("test_result", "").lower():
                await self.callback("token", {"content": "Skipping testing: execution cancelled by user.\n", "model": "Tester"})
                output = {"test_result": state["test_result"]}
                self.journal.log_step(task_id, step_threshold, "Tester", "tester_node", state, output)
                return output

            await self.callback("status", {
                "status": f"Tester: Verifying execution output (attempt {retry_count + 1}/{self.MAX_RETRIES})...",
                "model": "Tester"
            })

            exec_output = await self._summarize_if_needed(state.get("test_result", ""), "execution output")
            prompt = (
                "You are the Tester Agent. Evaluate whether the execution was successful.\n\n"
                f"Task:\n{state['task']}\n\n"
                f"Execution Output:\n{exec_output}\n\n"
                "If the code ran without errors and satisfies the task, reply with exactly:\n"
                "VERDICT: PASS\n\n"
                "If there were errors or the task is not complete, reply with:\n"
                "VERDICT: FAIL\n"
                "REASON: <specific reason>\n"
                "FIX: <exact fix to apply>"
            )

            verdict = ""
            await self.callback("token", {"content": "\n---\n**Tester Verdict:**\n", "model": "Tester"})
            async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}]):
                verdict += chunk
                self.supervisor.add_tokens(len(chunk) / 4.0)
                await self.callback("token", {"content": chunk, "model": "Tester"})

            halted, reason = self.supervisor.is_halted()
            if halted:
                await self.callback("error", {"error": f"Supervisor halted: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

            output = {"test_result": verdict, "retry_count": retry_count}
            self.journal.log_step(task_id, step_threshold, "Tester", "tester_node", state, output)
            return output

        async def retry_incrementor_node(state: AgentState) -> dict:
            """Increments retry_count before looping back to coder."""
            new_count = state.get("retry_count", 0) + 1
            await self.callback("status", {
                "status": f"Retry {new_count}/{self.MAX_RETRIES}: sending failure context back to Coder...",
                "model": "Retry Manager"
            })
            await self.callback("retry", {
                "attempt": new_count,
                "max": self.MAX_RETRIES,
                "reason": state.get("test_result", "")[:500]
            })
            return {"retry_count": new_count}

        async def logger_node(state: AgentState) -> dict:
            """
            Persists session logs and emits session_metadata so the frontend
            can reconstruct the session on reconnect (Antigravity/Devin pattern).
            """
            if self.last_completed_step_index >= 6:
                return {}

            await self._check_watchdog("Logger", "logger_node")
            await self.callback("status", {"status": "Logger: Saving session logs...", "model": "Logger"})

            verdict_line = state.get("test_result", "")
            pass_count = verdict_line.count("PASS")
            fail_count = verdict_line.count("FAIL")
            status_emoji = "✅" if "PASS" in verdict_line else "❌"

            log_entry = (
                f"--- Archon Agent Session ---\n"
                f"Task: {state['task']}\n"
                f"Task ID: {task_id}\n"
                f"Retries: {state.get('retry_count', 0)}\n"
                f"Verdict: {status_emoji} {verdict_line[:200]}\n"
                f"Plan: Saved to Plan/current_plan.md\n"
                f"Plan JSON: Saved to Plan/current_plan.json\n"
                f"Code: Saved to Codes/solution.py\n"
            )

            if not self.supervisor.add_write_volume(len(log_entry.encode())):
                halted, reason = self.supervisor.is_halted()
                await self.callback("error", {"error": f"Supervisor halted: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted: {reason}")

            logs_dir = os.path.join(WORKSPACE_ROOT, "Workspace", "ProjectHub", "Logs")
            os.makedirs(logs_dir, exist_ok=True)
            with open(os.path.join(logs_dir, "dev_log.md"), "a", encoding="utf-8") as f:
                f.write(log_entry + "\n")

            await self.callback("token", {"content": f"\n{status_emoji} **Session complete.** All files saved.\n", "model": "Logger"})

            # Emit session_metadata: frontend uses task_id to call GET /agents/sessions/{task_id}/history
            await self.callback("session_metadata", {
                "task_id": task_id,
                "status": "completed",
                "verdict": "PASS" if "PASS" in verdict_line else "FAIL",
                "retries": state.get("retry_count", 0),
                "plan_steps": state.get("plan_steps", []),
            })

            output = {"logs": log_entry}
            self.journal.log_step(task_id, 6, "Logger", "logger_node", state, output)
            self.journal.complete_run(task_id, "completed")
            return output

        # ════════════════════════════════════════════════════════════════════
        #  CONDITIONAL ROUTING — Retry loop
        # ════════════════════════════════════════════════════════════════════

        def route_after_tester(state: AgentState) -> str:
            """
            Devin/Codex-style: FAIL → retry up to MAX_RETRIES, then give up.
            Cancelled or max retries hit → go to logger.
            """
            result = state.get("test_result", "")
            # Cancelled → skip to logger
            if "cancelled" in result.lower() or "rejected" in result.lower():
                return "logger"
            # FAIL + retries remaining → retry
            if "FAIL" in result and state.get("retry_count", 0) < self.MAX_RETRIES:
                return "retry"
            # PASS or max retries exhausted → logger
            return "logger"

        # ════════════════════════════════════════════════════════════════════
        #  GRAPH WIRING
        # ════════════════════════════════════════════════════════════════════

        workflow.add_node("reader", reader_node)
        workflow.add_node("planner", planner_node)
        workflow.add_node("coder", coder_node)
        workflow.add_node("delegator", delegator_node)
        workflow.add_node("tester", tester_node)
        workflow.add_node("retry", retry_incrementor_node)
        workflow.add_node("logger", logger_node)

        workflow.set_entry_point("reader")
        workflow.add_edge("reader", "planner")
        workflow.add_edge("planner", "coder")
        workflow.add_edge("coder", "delegator")
        workflow.add_edge("delegator", "tester")
        workflow.add_conditional_edges(
            "tester",
            route_after_tester,
            {"retry": "retry", "logger": "logger"},
        )
        workflow.add_edge("retry", "coder")   # loop back
        workflow.add_edge("logger", END)

        app_graph = workflow.compile()

        await self.callback("status", {"status": "Starting Archon Multi-Agent System..."})
        await self.callback("session_metadata", {
            "task_id": task_id,
            "status": "started",
            "task": task_text[:200],
        })

        max_steps = payload.get("max_steps")
        recursion_limit = int(max_steps) if max_steps else 80  # higher limit for retry loops
        result = await app_graph.ainvoke(initial_state, {"recursion_limit": recursion_limit})
        return result
