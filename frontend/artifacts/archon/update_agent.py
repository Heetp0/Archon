import os

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

update_file('src/components/modes/AgentMode.tsx', [
    ('const {\n    agentStatuses, taskQueue, connected,\n    terminalLines, dangerousCommand,\n    sendAgentCommand, approveCommand, denyCommand,\n  } = useWebSocketContext();', 'const { sendAgentCommand, approveCommand, denyCommand, connected } = useWebSocketContext();\n  const agentStatuses = useWebSocketStore(s => s.agentStatuses);\n  const taskQueue = useWebSocketStore(s => s.taskQueue);\n  const terminalLines = useWebSocketStore(s => s.terminalLines);\n  const dangerousCommand = useWebSocketStore(s => s.dangerousCommand);'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])
