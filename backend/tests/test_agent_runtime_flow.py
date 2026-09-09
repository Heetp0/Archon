"""
Tests for the upgraded Archon Agents Mode backend.
Covers:
  1. Structured JSON plan parsing
  2. Plan_steps event emission
  3. Retry loop: FAIL x2 → PASS (coder called 3 times)
  4. Gate payload includes solution_preview
  5. Summarization helper: triggers above char limit
  6. Summarization helper: passthrough under char limit
  7. Session cancelled skips retry loop
  8. session_metadata event emitted at end
"""
import os
import sys
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch, call

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent_runtime import AgentRuntime
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer
from opencode_client import OpenCodeClient


def get_mock_services():
    router = MagicMock(spec=ModelRouter)
    vault_search = MagicMock(spec=VaultSearch)
    vault_search.search.return_value = [
        {"relative_path": "note1.md", "text": "context 1", "title": "Note 1"}
    ]
    markit_down = MagicMock(spec=MarkitDownNormalizer)
    return router, vault_search, markit_down


def make_agent(router, vault_search, markit_down, active_gates=None):
    agent = AgentRuntime(router, vault_search, markit_down, active_gates or {})
    agent.opencode = MagicMock(spec=OpenCodeClient)
    return agent


# ── helper: collect events ────────────────────────────────────────────────────

async def run_agent(agent, payload):
    events = []
    async def callback(event_type, data):
        events.append((event_type, data))
    result = await agent.run(payload, callback)
    return result, events


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 1 — Structured JSON plan parsing (json block)
# ══════════════════════════════════════════════════════════════════════════════

async def test_parse_plan_steps_from_json_block():
    router, vault, md = get_mock_services()
    agent = make_agent(router, vault, md)

    plan_text = '''
Here is the plan:

```json
[
  {"id": 1, "title": "Write scaffold", "acceptance_criteria": "File created"},
  {"id": 2, "title": "Add tests", "acceptance_criteria": "Tests pass"}
]
```

Then we proceed.
'''
    steps = agent._parse_plan_steps(plan_text)
    assert len(steps) == 2
    assert steps[0]["title"] == "Write scaffold"
    assert steps[1]["id"] == 2
    print("  PASS: test_parse_plan_steps_from_json_block")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 2 — Structured JSON plan parsing (markdown fallback)
# ══════════════════════════════════════════════════════════════════════════════

async def test_parse_plan_steps_markdown_fallback():
    router, vault, md = get_mock_services()
    agent = make_agent(router, vault, md)

    plan_text = "1. Setup environment\n2. Write code\n3. Run tests\n"
    steps = agent._parse_plan_steps(plan_text)
    assert len(steps) == 3
    assert steps[0]["title"] == "Setup environment"
    assert steps[2]["title"] == "Run tests"
    print("  PASS: test_parse_plan_steps_markdown_fallback")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 3 — Context summarization: passthrough under limit
# ══════════════════════════════════════════════════════════════════════════════

async def test_summarize_passthrough_under_limit():
    router, vault, md = get_mock_services()
    agent = make_agent(router, vault, md)

    events = []
    async def cb(et, d): events.append((et, d))
    agent.callback = cb

    short_text = "short context"
    result = await agent._summarize_if_needed(short_text)
    assert result == short_text
    # No status event should have been emitted
    assert not any(e[0] == "status" and "Summariz" in e[1].get("status", "") for e in events)
    print("  PASS: test_summarize_passthrough_under_limit")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 4 — Context summarization: triggers above limit
# ══════════════════════════════════════════════════════════════════════════════

async def test_summarize_triggers_above_limit():
    router, vault, md = get_mock_services()
    agent = make_agent(router, vault, md)

    events = []
    async def cb(et, d): events.append((et, d))
    agent.callback = cb

    async def mock_gen(*args, **kwargs):
        yield "Bullet: key fact"

    router.generate.return_value = mock_gen()

    long_text = "x" * (AgentRuntime.CONTEXT_CHAR_LIMIT + 100)
    result = await agent._summarize_if_needed(long_text, "test content")
    assert result == "Bullet: key fact"
    assert any(e[0] == "status" and "Summariz" in e[1].get("status", "") for e in events)
    print("  PASS: test_summarize_triggers_above_limit")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 5 — Full run: plan_steps event is emitted
# ══════════════════════════════════════════════════════════════════════════════

async def test_plan_steps_event_emitted():
    router, vault, md = get_mock_services()

    async def mock_plan(*args, **kwargs):
        yield '```json\n[{"id":1,"title":"Step A","acceptance_criteria":"done"}]\n```\nSummary.'
    async def mock_code(*args, **kwargs):
        yield "print('hello')"
    async def mock_verdict(*args, **kwargs):
        yield "VERDICT: PASS"

    router.generate.side_effect = [mock_plan(), mock_code(), mock_verdict()]

    agent = make_agent(router, vault, md)

    async def mock_opencode(*args, **kwargs):
        yield "Execution OK\n"
    agent.opencode.execute_task.return_value = mock_opencode()

    _, events = await run_agent(agent, {"text": "build a CLI tool", "task_id": "test_steps_001"})

    plan_events = [e for e in events if e[0] == "plan_steps"]
    assert plan_events, "No plan_steps event emitted"
    assert plan_events[0][1]["steps"][0]["title"] == "Step A"
    print("  PASS: test_plan_steps_event_emitted")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 6 — Gate payload includes solution_preview
# ══════════════════════════════════════════════════════════════════════════════

async def test_gate_payload_includes_solution_preview():
    router, vault, md = get_mock_services()

    async def mock_plan(*args, **kwargs):
        yield "1. Write code"
    async def mock_code(*args, **kwargs):
        yield "print('preview test')"
    async def mock_verdict(*args, **kwargs):
        yield "VERDICT: PASS"

    router.generate.side_effect = [mock_plan(), mock_code(), mock_verdict()]

    active_gates = {}
    gate_queue = asyncio.Queue()
    await gate_queue.put({"decision": "approve"})
    active_gates["test_gate_preview"] = gate_queue

    agent = make_agent(router, vault, md, active_gates)

    async def mock_opencode(*args, **kwargs):
        yield "Done\n"
    agent.opencode.execute_task.return_value = mock_opencode()

    _, events = await run_agent(agent, {"text": "write script", "task_id": "test_gate_preview"})

    gate_events = [e for e in events if e[0] == "gate"]
    assert gate_events, "No gate event emitted"
    gate_payload = gate_events[0][1]
    assert "solution_preview" in gate_payload, "solution_preview missing from gate payload"
    assert "print" in gate_payload["solution_preview"]
    print("  PASS: test_gate_payload_includes_solution_preview")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 7 — Retry loop: FAIL x2 then PASS (coder called 3 times)
# ══════════════════════════════════════════════════════════════════════════════

async def test_retry_loop_fail_then_pass():
    router, vault, md = get_mock_services()

    async def mock_plan(*args, **kwargs):
        yield "1. Write code"

    call_count = {"n": 0}

    async def mock_code(*args, **kwargs):
        call_count["n"] += 1
        n = call_count["n"]
        yield f"print('attempt {n}')"

    async def mock_verdict_fail(*args, **kwargs):
        yield "VERDICT: FAIL\nREASON: missing import\nFIX: add import sys"

    async def mock_verdict_fail2(*args, **kwargs):
        yield "VERDICT: FAIL\nREASON: still broken\nFIX: add return"

    async def mock_verdict_pass(*args, **kwargs):
        yield "VERDICT: PASS"

    router.generate.side_effect = [
        mock_plan(),       # planner (attempt 1)
        mock_code(),       # coder attempt 1
        mock_verdict_fail(),  # tester: FAIL
        mock_code(),       # coder retry 1
        mock_verdict_fail2(), # tester: FAIL
        mock_code(),       # coder retry 2
        mock_verdict_pass(),  # tester: PASS
    ]

    agent = make_agent(router, vault, md)
    exec_n = {"n": 0}

    async def mock_opencode(*args, **kwargs):
        exec_n["n"] += 1
        yield f"Run {exec_n['n']}\n"

    # Return a new async generator each time
    agent.opencode.execute_task.side_effect = [
        mock_opencode(),
        mock_opencode(),
        mock_opencode(),
    ]

    result, events = await run_agent(agent, {"text": "fix the bug", "task_id": "test_retry_001"})

    # Coder must have been called 3 times
    assert call_count["n"] == 3, f"Expected coder called 3 times, got {call_count['n']}"
    assert "PASS" in result.get("test_result", "")
    assert result.get("retry_count", 0) == 2

    retry_events = [e for e in events if e[0] == "retry"]
    assert len(retry_events) == 2, f"Expected 2 retry events, got {len(retry_events)}"
    print(f"  PASS: test_retry_loop_fail_then_pass (retries={result['retry_count']})")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 8 — Cancelled execution skips retry loop
# ══════════════════════════════════════════════════════════════════════════════

async def test_cancelled_skips_retry():
    router, vault, md = get_mock_services()

    async def mock_plan(*args, **kwargs):
        yield "1. Write code"
    async def mock_code(*args, **kwargs):
        yield "print('x')"
    async def mock_verdict(*args, **kwargs):
        yield "VERDICT: PASS"

    router.generate.side_effect = [mock_plan(), mock_code(), mock_verdict()]

    active_gates = {}
    gate_queue = asyncio.Queue()
    await gate_queue.put({"decision": "deny"})
    active_gates["test_cancel_001"] = gate_queue

    agent = make_agent(router, vault, md, active_gates)

    result, events = await run_agent(agent, {"text": "do stuff", "task_id": "test_cancel_001"})

    agent.opencode.execute_task.assert_not_called()
    assert "cancelled" in result.get("test_result", "").lower()
    assert result.get("retry_count", 0) == 0
    # Must NOT have any retry events
    assert not any(e[0] == "retry" for e in events)
    print("  PASS: test_cancelled_skips_retry")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 9 — session_metadata event emitted at start and end
# ══════════════════════════════════════════════════════════════════════════════

async def test_session_metadata_emitted():
    router, vault, md = get_mock_services()

    async def mock_plan(*args, **kwargs):
        yield "1. Write code"
    async def mock_code(*args, **kwargs):
        yield "print('hello')"
    async def mock_verdict(*args, **kwargs):
        yield "VERDICT: PASS"

    router.generate.side_effect = [mock_plan(), mock_code(), mock_verdict()]

    agent = make_agent(router, vault, md)

    async def mock_opencode(*args, **kwargs):
        yield "OK\n"
    agent.opencode.execute_task.return_value = mock_opencode()

    _, events = await run_agent(agent, {"text": "task", "task_id": "test_meta_001"})

    meta_events = [e for e in events if e[0] == "session_metadata"]
    assert len(meta_events) >= 2, f"Expected >=2 session_metadata events, got {len(meta_events)}"
    statuses = [e[1].get("status") for e in meta_events]
    assert "started" in statuses
    assert "completed" in statuses
    print(f"  PASS: test_session_metadata_emitted ({len(meta_events)} events)")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST 10 — tool_call events emitted for reader and delegator
# ══════════════════════════════════════════════════════════════════════════════

async def test_tool_call_events():
    router, vault, md = get_mock_services()

    async def mock_plan(*args, **kwargs):
        yield "1. Write code"
    async def mock_code(*args, **kwargs):
        yield "print('x')"
    async def mock_verdict(*args, **kwargs):
        yield "VERDICT: PASS"

    router.generate.side_effect = [mock_plan(), mock_code(), mock_verdict()]

    agent = make_agent(router, vault, md)

    async def mock_opencode(*args, **kwargs):
        yield "Done\n"
    agent.opencode.execute_task.return_value = mock_opencode()

    _, events = await run_agent(agent, {"text": "task", "task_id": "test_toolcall_001"})

    tool_events = [e for e in events if e[0] == "tool_call"]
    tool_names = {e[1].get("tool") for e in tool_events}
    assert "vault_search" in tool_names, f"No vault_search tool_call event. Got: {tool_names}"
    assert "opencode" in tool_names, f"No opencode tool_call event. Got: {tool_names}"
    print(f"  PASS: test_tool_call_events (tools={tool_names})")


# ══════════════════════════════════════════════════════════════════════════════
#  RUNNER
# ══════════════════════════════════════════════════════════════════════════════

async def main():
    tests = [
        ("1. parse_plan_steps json block", test_parse_plan_steps_from_json_block),
        ("2. parse_plan_steps markdown fallback", test_parse_plan_steps_markdown_fallback),
        ("3. summarize passthrough under limit", test_summarize_passthrough_under_limit),
        ("4. summarize triggers above limit", test_summarize_triggers_above_limit),
        ("5. plan_steps event emitted", test_plan_steps_event_emitted),
        ("6. gate payload has solution_preview", test_gate_payload_includes_solution_preview),
        ("7. retry loop fail x2 then pass", test_retry_loop_fail_then_pass),
        ("8. cancelled skips retry loop", test_cancelled_skips_retry),
        ("9. session_metadata events", test_session_metadata_emitted),
        ("10. tool_call events", test_tool_call_events),
    ]

    passed = 0
    failed = 0
    for name, fn in tests:
        try:
            await fn()
            passed += 1
        except Exception as e:
            import traceback
            print(f"  FAIL: {name}")
            traceback.print_exc()
            failed += 1

    print(f"\n{'='*50}")
    print(f"Results: {passed}/{passed+failed} passed")
    if failed:
        print(f"FAILED: {failed} tests")
    else:
        print("ALL TESTS PASSED")

asyncio.run(main())
