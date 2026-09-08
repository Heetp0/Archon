import os

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

update_file('src/components/modes/ObsidianMode.tsx', [
    ('const { sendChat, isStreaming, connected } = useWebSocketContext();', 'const { sendChat, connected } = useWebSocketContext();\n  const isStreaming = useWebSocketStore(s => s.isStreaming);'),
    ('import { useWebSocketContext } from "@/context/WebSocketContext";', 'import { useWebSocketContext } from "@/context/WebSocketContext";\nimport { useWebSocketStore } from "@/store/websocketStore";')
])
