, system-ui, sans-serif;
  --shadow-input: 0 1px 2px -1px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04);
  --shadow-input-hover: 0 1px 2px -1px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.08);
  --shadow-input-focus: 0 0 0 2px rgba(217, 119, 87, 0.1), 0 4px 12px -2px rgba(0, 0, 0, 0.08);
  --color-background: var(--bg-0);
  --color-foreground: var(--text-100);
  --color-card: var(--bg-100);
  --color-card-foreground: var(--text-100);
  --color-popover: var(--bg-100);
  --color-popover-foreground: var(--text-100);
  --color-primary: var(--text-100);
  --color-primary-foreground: var(--bg-0);
  --color-secondary: var(--bg-200);
  --color-secondary-foreground: var(--text-100);
  --color-muted: var(--bg-200);
  --color-muted-foreground: var(--text-400);
  --color-accent-foreground: var(--bg-0);
  --color-destructive: oklch(0.577 0.245 27.325);
  --color-border: var(--bg-300);
  --color-input: var(--bg-300);
  --color-ring: var(--accent);
}

:root {
  --bg-0: #FAF9F5;
  --bg-000: #FAF9F5;
  --bg-100: #FFFFFF;
  --bg-200: #F0EEE6;
  --bg-300: #DDDDDD;
  --text-100: #1F1E1D;
  --text-200: #3D3D3A;
  --text-300: #73726C;
  --text-400: #888888;
  --text-500: #999999;
  --accent: #D97757;
  --accent-hover: #C6613F;
  --radius: 0.5rem;
  --ease-silk: cubic-bezier(0.2, 0.0, 0, 1.0);
}

.dark {
  --bg-0: #212121;
  --bg-000: #212121;
  --bg-100: #262624;
  --bg-200: #30302E;
  --bg-300: #454540;
  --text-100: #ECECEC;
  --text-200: #E1E1E0;
  --text-300: #B4B4B4;
  --text-400: #8A8A88;
  --text-500: #6B6B65;
  --accent: #D2996E;
  --accent-hover: #E5AA7F;
}


@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}23:T1421,import React, { useState } from 'react';
import ClaudeChatInput from '../components/ui/claude-style-chat-input';
import { FileText, Loader2, Code, Archive } from 'lucide-react';

const Icons = {
    FileText,
    Loader2,
    Code,
    Archive
};

const ChatboxDemo = () => {
    const [messages, setMessages] = useState<string[]>([]);

    const handleSendMessage = (message: string, files: File[]) => {
        console.log('Sending message:', message);
        console.log('Attached files:', files);
        setMessages([...messages, message]);
    };

    const currentHour = new Date().getHours();
    let greeting = 'Good morning';
    if (currentHour >= 12 && currentHour < 18) {
        greeting = 'Good afternoon';
    } else if (currentHour >= 18) {
        greeting = 'Good evening';
    }

    const userName = 'Saify';

    return (
        <div className=