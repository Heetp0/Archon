import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from '../src/pages/Home';
import { AppProvider } from '../src/context/AppContext';
import { WebSocketProvider } from '../src/context/WebSocketContext';
import { ProjectsProvider } from '../src/context/ProjectsContext';

class MockWebSocket {
  url: string;
  readyState = 0;
  static calls: string[] = [];
  static instances: MockWebSocket[] = [];

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.calls.push(url);
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  send(msg: string) {
    // Echo
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderHomeWorkspace = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <WebSocketProvider>
          <ProjectsProvider>
            <Home />
          </ProjectsProvider>
        </WebSocketProvider>
      </AppProvider>
    </QueryClientProvider>
  );
};

describe('Tier 3 & Tier 4: Scenarios and Cross-Feature Interactions', () => {
  const originalLocation = window.location;
  const originalWebSocket = window.WebSocket;
  const originalFetch = window.fetch;

  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    window.sessionStorage.clear();
    MockWebSocket.calls = [];
    MockWebSocket.instances = [];
    vi.restoreAllMocks();

    // Stub global fetch to prevent actual HTTP requests hanging
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events: [] }),
    }));
  });

  afterEach(() => {
    vi.stubGlobal('location', originalLocation);
    vi.stubGlobal('WebSocket', originalWebSocket);
    vi.stubGlobal('fetch', originalFetch);
  });

  // TIER 3: Cross-Feature Combinations
  it('T3.1: interaction - Boot Screen + WebSocket connection status', async () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();
    
    // Dynamically import App to ensure state resets
    const App = (await import('../src/App')).default;
    render(<App />);

    expect(screen.getByText('ARCHON')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    const socket = MockWebSocket.instances[0];
    socket.readyState = MockWebSocket.OPEN;
    act(() => {
      if (socket.onopen) socket.onopen();
    });

    const skipBtn = screen.getByTestId('button-enter-interface');
    await act(async () => {
      fireEvent.click(skipBtn);
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText('ARCHON')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  // TIER 4: Real-World Scenarios (5 Scenarios)
  it('Scenario 1: Full App Load & Boot Flow', async () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();
    
    const App = (await import('../src/App')).default;
    render(<App />);

    expect(screen.getByText('ARCHON')).toBeInTheDocument();
    
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByText('DAEMON OFFLINE')).toBeInTheDocument();
    
    const enterBtn = screen.getByTestId('button-enter-interface');
    await act(async () => {
      fireEvent.click(enterBtn);
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText('ARCHON')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('Scenario 2: Workspace Layout Customization', async () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    renderHomeWorkspace();

    const openBtn = screen.getByTitle('Open right sidebar');
    expect(openBtn).toBeInTheDocument();

    fireEvent.click(openBtn);
    
    const resizeHandle = screen.getByTitle('Drag to resize');
    expect(resizeHandle).toBeInTheDocument();

    fireEvent.mouseDown(resizeHandle);
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 450 });
    fireEvent.mouseUp(window);

    const sidebar = resizeHandle.parentElement;
    expect(sidebar?.style.width).toBe('450px');
  });

  it('Scenario 3: Calendar & Event Details Interaction', async () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    renderHomeWorkspace();

    fireEvent.click(screen.getByTitle('Open right sidebar'));
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('Scenario 4: File Inspection & Active Tabs', async () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    renderHomeWorkspace();

    fireEvent.click(screen.getByTitle('Open right sidebar'));

    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    const tabStrip = document.querySelector('.overflow-x-auto') as HTMLElement;
    expect(within(tabStrip).getByText('config.json')).toBeInTheDocument();

    fireEvent.click(within(tabStrip).getByText('config.json'));
    expect(screen.getByText(/"model"/i)).toBeInTheDocument();
  });

  it('Scenario 5: Secure Replit Proxy WebSocket Connection', async () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('location', {
      hostname: 'repl-id.replit.app',
      protocol: 'https:',
      href: 'https://repl-id.replit.app/'
    });

    renderHomeWorkspace();

    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    expect(MockWebSocket.calls.length).toBeGreaterThan(0);
    // Secure Replit proxy should map connection cleanly
    expect(MockWebSocket.calls[0]).toBe('wss://8765-repl-id.replit.app/ws');
  });
});
