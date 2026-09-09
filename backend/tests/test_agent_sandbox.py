import os
import sys
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from opencode_client import OpenCodeClient
from agent_runtime import AgentRuntime
from model_router import ModelRouter
from vault_search import VaultSearch
from markit_down import MarkitDownNormalizer

def get_mock_services():
    router = MagicMock(spec=ModelRouter)
    vault_search = MagicMock(spec=VaultSearch)
    vault_search.search.return_value = [
        {"relative_path": "note1.md", "text": "context 1", "title": "Note 1"}
    ]
    markit_down = MagicMock(spec=MarkitDownNormalizer)
    return router, vault_search, markit_down

@pytest.fixture
def mock_services():
    return get_mock_services()

@pytest.mark.asyncio
async def test_opencode_path_traversal_rejection():
    """Verify that path traversal outside workspace root raises ValueError."""
    workspace = os.path.abspath(r"D:\The core")
    client = OpenCodeClient(workspace_root=workspace)
    
    with pytest.raises(ValueError) as exc_info:
        async for _ in client.execute_task("malicious task", subproject_path="../../windows/system32"):
            pass
    assert "traverses outside workspace root" in str(exc_info.value)

@pytest.mark.asyncio
async def test_opencode_valid_subproject():
    """Verify that a valid subproject path is correctly resolved within workspace."""
    workspace = os.path.abspath(r"D:\The core")
    client = OpenCodeClient(workspace_root=workspace)
    
    with patch("asyncio.create_subprocess_shell") as mock_shell:
        mock_proc = AsyncMock()
        mock_proc.returncode = 0
        mock_stdout = AsyncMock()
        mock_stdout.readline.side_effect = [b"Done\n", b""]
        mock_proc.stdout = mock_stdout
        mock_shell.return_value = mock_proc
        
        lines = []
        async for line in client.execute_task("legit task", subproject_path="Workspace/ProjectHub"):
            lines.append(line)
            
        assert lines == ["Done\n"]
        call_kwargs = mock_shell.call_args[1]
        expected_cwd = os.path.abspath(os.path.join(workspace, "Workspace/ProjectHub"))
        assert call_kwargs["cwd"] == expected_cwd

@pytest.mark.asyncio
async def test_agent_runtime_gate_denial(mock_services):
    """Verify that user denying approval gate prevents code execution."""
    router, vault_search, markit_down = mock_services
    
    async def mock_gen_plan(*args, **kwargs):
        yield "Plan: write code"
    async def mock_gen_code(*args, **kwargs):
        yield "```python\nprint('hello')\n```"
    async def mock_gen_test(*args, **kwargs):
        yield "VERDICT: PASS"
        
    router.generate.side_effect = [mock_gen_plan(), mock_gen_code(), mock_gen_test()]
    
    active_gates = {}
    gate_queue = asyncio.Queue()
    await gate_queue.put({"decision": "deny"})
    active_gates["test_gate_denial"] = gate_queue
    
    agent = AgentRuntime(router, vault_search, markit_down, active_gates)
    agent.opencode = MagicMock(spec=OpenCodeClient)
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {"text": "write script", "task_id": "test_gate_denial"}
    result = await agent.run(payload, callback)
    
    agent.opencode.execute_task.assert_not_called()
    assert result["test_result"] == "Execution cancelled by user."
    assert any(e[0] == "token" and "[USER REJECTED]" in e[1].get("content", "") for e in events)

@pytest.mark.asyncio
async def test_agent_runtime_gate_approval(mock_services):
    """Verify that user approving gate allows execution to proceed."""
    router, vault_search, markit_down = mock_services
    
    async def mock_gen_plan(*args, **kwargs):
        yield "Plan: write code"
    async def mock_gen_code(*args, **kwargs):
        yield "```python\nprint('hello')\n```"
    async def mock_gen_test(*args, **kwargs):
        yield "VERDICT: PASS"
        
    router.generate.side_effect = [mock_gen_plan(), mock_gen_code(), mock_gen_test()]
    
    active_gates = {}
    gate_queue = asyncio.Queue()
    await gate_queue.put({"decision": "approve"})
    active_gates["test_gate_approval"] = gate_queue
    
    agent = AgentRuntime(router, vault_search, markit_down, active_gates)
    agent.opencode = MagicMock(spec=OpenCodeClient)
    
    async def mock_opencode_stream(*args, **kwargs):
        yield "Execution finished with code 0\n"
        
    agent.opencode.execute_task.return_value = mock_opencode_stream()
    
    events = []
    async def callback(event_type, payload):
        events.append((event_type, payload))
        
    payload = {"text": "write script", "task_id": "test_gate_approval"}
    result = await agent.run(payload, callback)
    
    agent.opencode.execute_task.assert_called_once()
    assert "PASS" in result["test_result"]
    assert any(e[0] == "gate" and e[1].get("action") == "execute_code" for e in events)
    assert any(e[0] == "token" and "Execution finished with code 0" in e[1].get("content", "") for e in events)
