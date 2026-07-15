import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider, useAppContext } from '../src/context/AppContext';
import { WebSocketProvider } from '../src/context/WebSocketContext';
import { ProjectsProvider } from '../src/context/ProjectsContext';
import Home from '../src/pages/Home';

class MockWebSocket {
  url: string;
  readyState = 0;
  static CONNECTING = 0;
  static OPEN = 1;
  constructor(url: string) {
    this.url = url;
  }
  close() {}
  send() {}
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function SidebarTestControls() {
  const { 
    mode, setMode, 
    contextSidebarOpen, setContextSidebarOpen,
    rightSidebarOpen, setRightSidebarOpen 
  } = useAppContext();

  return (
    <div data-testid="test-controls">
      <button onClick={() => setMode('chat')} data-testid="btn-mode-chat">Set Mode Chat</button>
      <button onClick={() => setMode('dashboard')} data-testid="btn-mode-dashboard">Set Mode Dashboard</button>
      <button onClick={() => setContextSidebarOpen(true)} data-testid="btn-left-open">Open Left</button>
      <button onClick={() => setContextSidebarOpen(false)} data-testid="btn-left-close">Close Left</button>
      <button onClick={() => setRightSidebarOpen(true)} data-testid="btn-right-open">Open Right</button>
      <button onClick={() => setRightSidebarOpen(false)} data-testid="btn-right-close">Close Right</button>
      <span data-testid="lbl-mode">{mode}</span>
      <span data-testid="lbl-left">{contextSidebarOpen ? 'open' : 'closed'}</span>
      <span data-testid="lbl-right">{rightSidebarOpen ? 'open' : 'closed'}</span>
    </div>
  );
}

const renderTestWorkspace = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <WebSocketProvider>
          <ProjectsProvider>
            <SidebarTestControls />
            <Home />
          </ProjectsProvider>
        </WebSocketProvider>
      </AppProvider>
    </QueryClientProvider>
  );
};

describe('Feature 2: Sidebar Layout & Resizing', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  // TIER 1: Feature Coverage (5 tests)
  it('T1.1: displays right sidebar expand button by default', () => {
    renderTestWorkspace();
    expect(screen.getByTitle('Open right sidebar')).toBeInTheDocument();
  });

  it('T1.2: displays left sidebar open trigger in chat mode when collapsed', () => {
    renderTestWorkspace();
    fireEvent.click(screen.getByTestId('btn-mode-chat'));
    expect(screen.getByTitle('Open left sidebar')).toBeInTheDocument();
  });

  it('T1.3: shows left context sidebar when contextSidebarOpen is true and mode is chat', () => {
    renderTestWorkspace();
    fireEvent.click(screen.getByTestId('btn-mode-chat'));
    fireEvent.click(screen.getByTestId('btn-left-open'));
    expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
  });

  it('T1.4: hides left context sidebar in dashboard mode even if contextSidebarOpen is true', () => {
    renderTestWorkspace();
    fireEvent.click(screen.getByTestId('btn-mode-dashboard'));
    fireEvent.click(screen.getByTestId('btn-left-open'));
    expect(screen.queryByTitle('Collapse sidebar')).not.toBeInTheDocument();
  });

  it('T1.5: opens right sidebar when open right button is clicked', () => {
    renderTestWorkspace();
    fireEvent.click(screen.getByTitle('Open right sidebar'));
    expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
  });

  // TIER 2: Boundary & Corner Cases (5 tests)
  it('T2.1: drags right sidebar to resize it', () => {
    renderTestWorkspace();
    fireEvent.click(screen.getByTestId('btn-right-open'));
    
    const resizeHandle = screen.getByTitle('Drag to resize');
    
    fireEvent.mouseDown(resizeHandle);
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 300 });
    
    const sidebar = resizeHandle.parentElement;
    expect(sidebar?.style.width).toBe('300px');
  });

  it('T2.2: enforces minimum width limit of 200px', () => {
    renderTestWorkspace();
    fireEvent.click(screen.getByTestId('btn-right-open'));
    
    const resizeHandle = screen.getByTitle('Drag to resize');
    
    fireEvent.mouseDown(resizeHandle);
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 100 });
    
    const sidebar = resizeHandle.parentElement;
    expect(sidebar?.style.width).toBe('200px');
  });

  it('T2.3: enforces maximum width limit of 600px', () => {
    renderTestWorkspace();
    fireEvent.click(screen.getByTestId('btn-right-open'));
    
    const resizeHandle = screen.getByTitle('Drag to resize');
    
    fireEvent.mouseDown(resizeHandle);
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 700 });
    
    const sidebar = resizeHandle.parentElement;
    expect(sidebar?.style.width).toBe('600px');
  });

  it('T2.4: stops resizing on mouseUp', () => {
    renderTestWorkspace();
    fireEvent.click(screen.getByTestId('btn-right-open'));
    
    const resizeHandle = screen.getByTitle('Drag to resize');
    
    fireEvent.mouseDown(resizeHandle);
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 300 });
    fireEvent.mouseUp(window);
    
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 400 });
    
    const sidebar = resizeHandle.parentElement;
    expect(sidebar?.style.width).toBe('300px');
  });

  it('T2.5: continues resizing on mouseMove even after mouseLeave, and stops on mouseUp', () => {
    renderTestWorkspace();
    fireEvent.click(screen.getByTestId('btn-right-open'));
    
    const resizeHandle = screen.getByTitle('Drag to resize');
    
    fireEvent.mouseDown(resizeHandle);
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 300 });
    
    fireEvent.mouseLeave(resizeHandle.parentElement?.parentElement!);
    
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 400 });
    const sidebar = resizeHandle.parentElement;
    expect(sidebar?.style.width).toBe('400px');
    
    fireEvent.mouseUp(window);
    
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 500 });
    expect(sidebar?.style.width).toBe('400px');
  });
});
