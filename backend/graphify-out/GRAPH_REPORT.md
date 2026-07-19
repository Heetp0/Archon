# Graph Report - D:\The core\Workspace\CodeSpace\archon\daemon  (2026-06-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 163 nodes · 344 edges · 12 communities (8 shown, 4 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `MarkitDownNormalizer` - 29 edges
2. `ModelRouter` - 29 edges
3. `VaultSearch` - 23 edges
4. `AutopilotSupervisor` - 16 edges
5. `AgentRuntime` - 15 edges
6. `DeepResearch` - 15 edges
7. `OpenCodeClient` - 14 edges
8. `BaseAgent` - 12 edges
9. `ConnectionManager` - 12 edges
10. `ChatAgent` - 11 edges

## Surprising Connections (you probably didn't know these)
- `AgentState` --uses--> `AutopilotSupervisor`  [INFERRED]
  agent_runtime.py → autopilot_supervisor.py
- `AgentState` --uses--> `MarkitDownNormalizer`  [INFERRED]
  agent_runtime.py → markit_down.py
- `AgentState` --uses--> `ModelRouter`  [INFERRED]
  agent_runtime.py → model_router.py
- `AgentState` --uses--> `OpenCodeClient`  [INFERRED]
  agent_runtime.py → opencode_client.py
- `AgentRuntime` --uses--> `AutopilotSupervisor`  [INFERRED]
  agent_runtime.py → autopilot_supervisor.py

## Import Cycles
- None detected.

## Communities (12 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (13): ABC, AgentRuntime, AgentState, BaseAgent, ChatAgent, CouncilDebate, DummyConfig, test_agent_runtime() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (9): AutopilotSupervisor, Update heartbeat timestamp for a given agent., Return False if agent has timed out since last heartbeat., Log action, check if same action has been repeated > 5 times consecutively., Add bytes to write budget. Halt if budget exceeded., Add tokens to budget. Halt if budget exceeded., DeepResearch, test_deep_research() (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (10): Any, Runs the agent engine.         payload: The request payload from the frontend., TestVaultParser, compute_sha256(), parse_frontmatter(), parse_note(), Recursively scans the vault and parses all markdown notes.     Skips ignored fo, Parses YAML-like frontmatter at the start of a list of lines.     Returns parse (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (8): ECCBridge, Scan ecc/skills/ and return skill metadata list., Load language-specific rules (e.g. 'python' -> ecc/rules/python/)., Run AgentShield security scan on a proposed shell command before execution., Verify that path is inside the allowed workspace_root sandbox., Extract and verify paths in command, blocking directory escapes., Scan command via AgentShield + Sandbox checks, and execute securely., SecureShellRunner

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (4): OpenCodeClient, Executes a coding/refactoring task using the OpenCode CLI.         Streams stdo, TestIntegrationCore, TestOpenCodeClient

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (4): Run graphify on the vault. --update mode only re-processes changed files., Load graph.json for structural queries (node/edge traversal)., Return GRAPH_REPORT.md content for the Dashboard insight card., VaultGraphService

### Community 8 - "Community 8"
Cohesion: 0.52
Nodes (3): ConnectionManager, websocket_endpoint(), WebSocket

## Knowledge Gaps
- **1 isolated node(s):** `DummyConfig`
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ModelRouter` connect `Community 6` to `Community 0`, `Community 1`, `Community 4`, `Community 8`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `MarkitDownNormalizer` connect `Community 5` to `Community 0`, `Community 1`, `Community 8`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `AutopilotSupervisor` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `MarkitDownNormalizer` (e.g. with `AgentRuntime` and `AgentState`) actually correct?**
  _`MarkitDownNormalizer` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `ModelRouter` (e.g. with `AgentRuntime` and `AgentState`) actually correct?**
  _`ModelRouter` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `VaultSearch` (e.g. with `AgentRuntime` and `AgentState`) actually correct?**
  _`VaultSearch` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `AutopilotSupervisor` (e.g. with `AgentRuntime` and `AgentState`) actually correct?**
  _`AutopilotSupervisor` has 3 INFERRED edges - model-reasoned connections that need verification._