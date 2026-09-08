import os

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

update_file('src/components/modes/ChatMode.tsx', [
    ('  const activeChatId = useWebSocketStore(s => s.activeChatId);\n', '')
])
