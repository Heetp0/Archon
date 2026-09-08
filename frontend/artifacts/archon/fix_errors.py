import os

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

update_file('src/components/modes/AgentMode.tsx', [
    ('import { useWebSocketStore } from "@/store/websocketStore";\nimport { useWebSocketStore } from "@/store/websocketStore";', 'import { useWebSocketStore } from "@/store/websocketStore";')
])

update_file('src/components/modes/ChatMode.tsx', [
    ('  const chatMessages = activeChatId ? messagesMap[activeChatId] || [] : [];\n  const { activeProjectId, activeChatId, createChat } = useProjectsContext();', '  const { activeProjectId, activeChatId, createChat } = useProjectsContext();\n  const chatMessages = activeChatId ? messagesMap[activeChatId] || [] : [];')
])
