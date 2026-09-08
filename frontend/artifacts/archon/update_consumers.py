import os

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

update_file('src/pages/Home.tsx', [
    ('const { connected, connecting, isStreaming } = useWebSocketContext();', 'const { connected, connecting } = useWebSocketContext();\n  const isStreaming = useWebSocketStore((state) => state.isStreaming);'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])

update_file('src/components/RightSidebar.tsx', [
    ('const {\n    connected, connecting, telemetry, citations, researchText, isStreaming, sendResearch, clearChat,\n  } = useWebSocketContext();', 'const { connected, connecting, sendResearch } = useWebSocketContext();\n  const telemetry = useWebSocketStore(s => s.telemetry);\n  const citations = useWebSocketStore(s => s.citations);\n  const researchText = useWebSocketStore(s => s.researchText);\n  const isStreaming = useWebSocketStore(s => s.isStreaming);\n  const clearChat = useWebSocketStore(s => s.clearChat);'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])

update_file('src/components/modes/ChatMode.tsx', [
    ('const { messages: chatMessages, isStreaming, sendChat, connected, availableModels, cancelStream } = useWebSocketContext();', 'const { sendChat, connected, cancelStream } = useWebSocketContext();\n  const isStreaming = useWebSocketStore(s => s.isStreaming);\n  const availableModels = useWebSocketStore(s => s.availableModels);\n  const activeChatId = useWebSocketStore(s => s.activeChatId);\n  const messagesMap = useWebSocketStore(s => s.messagesMap);\n  const chatMessages = activeChatId ? messagesMap[activeChatId] || [] : [];'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])

update_file('src/components/modes/CouncilMode.tsx', [
    ('const { councilMessages, isStreaming, sendCouncil, connected, availableModels } = useWebSocketContext();', 'const { sendCouncil, connected } = useWebSocketContext();\n  const councilMessages = useWebSocketStore(s => s.councilMessages);\n  const isStreaming = useWebSocketStore(s => s.isStreaming);\n  const availableModels = useWebSocketStore(s => s.availableModels);'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])

update_file('src/components/modes/ResearchMode.tsx', [
    ('const { isStreaming, researchText, citations } = useWebSocketContext();', 'const isStreaming = useWebSocketStore(s => s.isStreaming);\n  const researchText = useWebSocketStore(s => s.researchText);\n  const citations = useWebSocketStore(s => s.citations);'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])

update_file('src/components/modes/AgentMode.tsx', [
    ('const {\n    agentStatuses,\n    terminalLines,\n    dangerousCommand,\n    sendAgentCommand,\n    approveCommand,\n    denyCommand,\n    connected\n  } = useWebSocketContext();', 'const { sendAgentCommand, approveCommand, denyCommand, connected } = useWebSocketContext();\n  const agentStatuses = useWebSocketStore(s => s.agentStatuses);\n  const terminalLines = useWebSocketStore(s => s.terminalLines);\n  const dangerousCommand = useWebSocketStore(s => s.dangerousCommand);'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])

update_file('src/components/modes/DashboardMode.tsx', [
    ('const { agentStatuses, connected, telemetry, terminalLines, calendarEvents } = useWebSocketContext();', 'const { connected } = useWebSocketContext();\n  const agentStatuses = useWebSocketStore(s => s.agentStatuses);\n  const telemetry = useWebSocketStore(s => s.telemetry);\n  const terminalLines = useWebSocketStore(s => s.terminalLines);\n  const calendarEvents = useWebSocketStore(s => s.calendarEvents);'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])

update_file('src/components/modes/AgentsDirectoryMode.tsx', [
    ('const { agentStatuses } = useWebSocketContext();', 'const agentStatuses = useWebSocketStore(s => s.agentStatuses);'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])
