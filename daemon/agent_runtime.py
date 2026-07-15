import os
import sys
import time
import asyncio
from typing import Callable, Any, Coroutine, Dict, List, TypedDict
from base_agent import BaseAgent
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
from opencode_client import OpenCodeClient
from autopilot_supervisor import AutopilotSupervisor
from agent_journal import AgentJournal
from config import WORKSPACE_ROOT
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
    task: str
    plan: str
    code: str
    test_result: str
    logs: str
    error: str

class AgentRuntime(BaseAgent):
    def __init__(self, model_router: ModelRouter, vault_search: VaultSearch, markit_down: MarkitDownNormalizer, active_gates: dict):
        self.router = model_router
        self.search_service = vault_search
        self.normalizer = markit_down
        self.active_gates = active_gates
        self.opencode = OpenCodeClient()
        self.supervisor = AutopilotSupervisor()
        
        # Initialize SQLite journaling system
        db_dir = os.path.join(WORKSPACE_ROOT, ".lancedb")
        self.journal = AgentJournal(db_dir)
        
        self.callback = None
        self.last_completed_step_index = 0

    async def _check_watchdog(self, agent_name: str, node_name: str):
        self.supervisor.ping(agent_name)
        if not self.supervisor.log_action(agent_name, node_name):
            halted, reason = self.supervisor.is_halted()
            await self.callback("error", {"error": f"Supervisor halted execution: {reason}"})
            raise RuntimeError(f"Autopilot Supervisor halted execution: {reason}")
            
        halted, reason = self.supervisor.is_halted()
        if halted:
            await self.callback("error", {"error": f"Supervisor halted execution: {reason}"})
            raise RuntimeError(f"Autopilot Supervisor halted execution: {reason}")

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        self.callback = send_token_callback
        self.supervisor.reset()
        
        # Configure supervisor limits from frontend payload if provided
        token_budget = payload.get("token_budget")
        if token_budget:
            self.supervisor.token_budget = int(token_budget)
        
        task_text = payload.get("content", "") or payload.get("text", "") or payload.get("topic", "")
        if not task_text:
            raise ValueError("Task description cannot be empty.")

        # Resolve or generate a persistent task ID for journaling
        task_id = payload.get("task_id", f"task_{int(time.time())}")
        self.journal.start_run(task_id)

        # Build state graph
        workflow = StateGraph(AgentState)
        
        initial_state = {
            "task": task_text,
            "plan": "",
            "code": "",
            "test_result": "",
            "logs": "",
            "error": ""
        }

        # Check for intermediate SQLite journal checkpoints to resume
        self.last_completed_step_index = 0
        checkpoint = self.journal.get_last_checkpoint(task_id)
        if checkpoint:
            self.last_completed_step_index = checkpoint["step_index"]
            await self.callback("status", {"status": f"Journal: Restoring state from step {self.last_completed_step_index}..."})
            past_steps = self.journal.get_all_steps(task_id)
            for step in past_steps:
                if step["output_payload"]:
                    initial_state.update(step["output_payload"])

        async def reader_node(state: AgentState) -> dict:
            if self.last_completed_step_index >= 1:
                await self.callback("token", {"content": "[Journal RESTORED] Reader Context retrieved.\n", "model": "Reader"})
                return {}

            await self._check_watchdog("Reader", "reader_node")
            await self.callback("status", {"status": "Reader: Scanning workspace files for context...", "model": "Reader"})
            results = self.search_service.search(state["task"], top_k=2)
            context = ""
            for res in results:
                context += f"\nNote: {res['relative_path']}\nContent:\n{res['text']}\n"
            await self.callback("token", {"content": f"Reader analyzed context:\n{context}\n\n", "model": "Reader"})
            
            output = {"plan": f"Context found:\n{context}"}
            self.journal.log_step(task_id, 1, "Reader", "reader_node", state, output)
            return output

        async def planner_node(state: AgentState) -> dict:
            if self.last_completed_step_index >= 2:
                await self.callback("token", {"content": "[Journal RESTORED] Planner roadmap loaded.\n", "model": "Planner"})
                return {}

            await self._check_watchdog("Planner", "planner_node")
            await self.callback("status", {"status": "Planner: Developing implementation plan...", "model": "Planner"})
            prompt = (
                f"You are the Planner Agent. Create a clear, step-by-step implementation plan for this task:\n"
                f"Task: {state['task']}\n"
                f"Context: {state['plan']}\n\n"
                f"Generate a clear markdown plan."
            )
            plan = ""
            async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}]):
                plan += chunk
                self.supervisor.add_tokens(len(chunk) / 4.0)
                await self.callback("token", {"content": chunk, "model": "Planner"})
            
            halted, reason = self.supervisor.is_halted()
            if halted:
                await self.callback("error", {"error": f"Supervisor halted execution: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted execution: {reason}")

            plan_bytes = len(plan.encode('utf-8'))
            if not self.supervisor.add_write_volume(plan_bytes):
                halted, reason = self.supervisor.is_halted()
                await self.callback("error", {"error": f"Supervisor halted execution: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted execution: {reason}")

            plan_dir = os.path.join(WORKSPACE_ROOT, "Workspace", "ProjectHub", "Plan")
            os.makedirs(plan_dir, exist_ok=True)
            with open(os.path.join(plan_dir, "current_plan.md"), "w", encoding="utf-8") as f:
                f.write(plan)
            
            output = {"plan": plan}
            self.journal.log_step(task_id, 2, "Planner", "planner_node", state, output)
            return output

        async def coder_node(state: AgentState) -> dict:
            if self.last_completed_step_index >= 3:
                await self.callback("token", {"content": "[Journal RESTORED] Coder python solution loaded.\n", "model": "Coder"})
                return {}

            await self._check_watchdog("Coder", "coder_node")
            await self.callback("status", {"status": "Coder: Writing code files...", "model": "Coder"})
            prompt = (
                f"You are the Coder Agent. Write code for the following plan:\n"
                f"Plan:\n{state['plan']}\n"
                f"Task:\n{state['task']}\n\n"
                f"Generate the exact python code block to implement this. Do not include markdown wraps."
            )
            code = ""
            async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}]):
                code += chunk
                self.supervisor.add_tokens(len(chunk) / 4.0)
                await self.callback("token", {"content": chunk, "model": "Coder"})
            
            halted, reason = self.supervisor.is_halted()
            if halted:
                await self.callback("error", {"error": f"Supervisor halted execution: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted execution: {reason}")

            code_bytes = len(code.encode('utf-8'))
            if not self.supervisor.add_write_volume(code_bytes):
                halted, reason = self.supervisor.is_halted()
                await self.callback("error", {"error": f"Supervisor halted execution: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted execution: {reason}")

            # Strip markdown wrappers if LLM hallucinates them
            clean_code = code.strip()
            if clean_code.startswith("```python"):
                clean_code = clean_code[9:]
            elif clean_code.startswith("```"):
                clean_code = clean_code[3:]
            if clean_code.endswith("```"):
                clean_code = clean_code[:-3]
            clean_code = clean_code.strip()

            codes_dir = os.path.join(WORKSPACE_ROOT, "Workspace", "ProjectHub", "Codes")
            os.makedirs(codes_dir, exist_ok=True)
            with open(os.path.join(codes_dir, "solution.py"), "w", encoding="utf-8") as f:
                f.write(clean_code)
            
            output = {"code": code}
            self.journal.log_step(task_id, 3, "Coder", "coder_node", state, output)
            return output

        async def delegator_node(state: AgentState) -> dict:
            if self.last_completed_step_index >= 4:
                await self.callback("token", {"content": "[Journal RESTORED] OpenCode output retrieved.\n", "model": "OpenCode Delegator"})
                return {}

            await self._check_watchdog("OpenCode Delegator", "delegator_node")
            await self.callback("status", {"status": "Delegator: Running OpenCode task execution...", "model": "OpenCode Delegator"})
            opencode_prompt = f"Run and test the code in solution.py in {WORKSPACE_ROOT}"
            output_lines = []
            async for line in self.opencode.execute_task(opencode_prompt, subproject_path="Workspace/ProjectHub"):
                output_lines.append(line)
                self.supervisor.add_tokens(len(line) / 4.0)
                await self.callback("token", {"content": line, "model": "OpenCode Delegator"})
            
            halted, reason = self.supervisor.is_halted()
            if halted:
                await self.callback("error", {"error": f"Supervisor halted execution: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted execution: {reason}")

            output = {"test_result": "".join(output_lines)}
            self.journal.log_step(task_id, 4, "OpenCode Delegator", "delegator_node", state, output)
            return output

        async def tester_node(state: AgentState) -> dict:
            if self.last_completed_step_index >= 5:
                await self.callback("token", {"content": f"[Journal RESTORED] Verdict: {state['test_result']}\n", "model": "Tester"})
                return {}

            await self._check_watchdog("Tester", "tester_node")
            await self.callback("status", {"status": "Tester: Verifying execution logs and output...", "model": "Tester"})
            prompt = (
                f"You are the Tester Agent. Verify if the following execution logs show success or fail:\n"
                f"Execution Output:\n{state['test_result']}\n\n"
                f"Reply with 'PASS' if successful, or 'FAIL' with reason."
            )
            verdict = ""
            async for chunk in self.router.generate(tier="fast", messages=[{"role": "user", "content": prompt}]):
                verdict += chunk
                self.supervisor.add_tokens(len(chunk) / 4.0)
                await self.callback("token", {"content": chunk, "model": "Tester"})
            
            halted, reason = self.supervisor.is_halted()
            if halted:
                await self.callback("error", {"error": f"Supervisor halted execution: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted execution: {reason}")

            output = {"test_result": verdict}
            self.journal.log_step(task_id, 5, "Tester", "tester_node", state, output)
            return output

        async def logger_node(state: AgentState) -> dict:
            if self.last_completed_step_index >= 6:
                return {}

            await self._check_watchdog("Logger", "logger_node")
            await self.callback("status", {"status": "Logger: Saving development logs...", "model": "Logger"})
            log_entry = (
                f"--- Development Session ---\n"
                f"Task: {state['task']}\n"
                f"Plan: Saved to Plan/current_plan.md\n"
                f"Code: Saved to Codes/solution.py\n"
                f"Test Verdict: {state['test_result']}\n"
            )
            
            log_bytes = len((log_entry + "\n").encode('utf-8'))
            if not self.supervisor.add_write_volume(log_bytes):
                halted, reason = self.supervisor.is_halted()
                await self.callback("error", {"error": f"Supervisor halted execution: {reason}"})
                raise RuntimeError(f"Autopilot Supervisor halted execution: {reason}")

            logs_dir = os.path.join(WORKSPACE_ROOT, "Workspace", "ProjectHub", "Logs")
            os.makedirs(logs_dir, exist_ok=True)
            with open(os.path.join(logs_dir, "dev_log.md"), "a", encoding="utf-8") as f:
                f.write(log_entry + "\n")
            await self.callback("token", {"content": "\nLogger session complete. All files saved.\n", "model": "Logger"})
            
            output = {"logs": log_entry}
            self.journal.log_step(task_id, 6, "Logger", "logger_node", state, output)
            self.journal.complete_run(task_id, "completed")
            return output

        workflow.add_node("reader", reader_node)
        workflow.add_node("planner", planner_node)
        workflow.add_node("coder", coder_node)
        workflow.add_node("delegator", delegator_node)
        workflow.add_node("tester", tester_node)
        workflow.add_node("logger", logger_node)

        workflow.set_entry_point("reader")
        workflow.add_edge("reader", "planner")
        workflow.add_edge("planner", "coder")
        workflow.add_edge("coder", "delegator")
        workflow.add_edge("delegator", "tester")
        workflow.add_edge("tester", "logger")
        workflow.add_edge("logger", END)

        app_graph = workflow.compile()

        await self.callback("status", {"status": "Starting Multi-Agent System Graph..."})
        max_steps = payload.get("max_steps")
        recursion_limit = int(max_steps) if max_steps else 50
        result = await app_graph.ainvoke(initial_state, {"recursion_limit": recursion_limit})
        return result


