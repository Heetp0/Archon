import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider, useAppContext } from '../src/context/AppContext';
import { WebSocketProvider } from '../src/context/WebSocketContext';
import { ProjectsProvider } from '../src/context/ProjectsContext';
import RightSidebar from '../src/components/RightSidebar';

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

function RightSidebarTestWrapper() {
  const { setRightSidebarOpen } = useAppContext();
  
  React.useEffect(() => {
    setRightSidebarOpen(true);
  }, []);

  return <RightSidebar />;
}

const renderRightSidebar = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <WebSocketProvider>
          <ProjectsProvider>
            <RightSidebarTestWrapper />
          </ProjectsProvider>
        </WebSocketProvider>
      </AppProvider>
    </QueryClientProvider>
  );
};

describe('Feature 4: File Viewer Tabs', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  // TIER 1: Feature Coverage (5 tests)
  it('T1.1: renders tabs for open files', () => {
    renderRightSidebar();
    
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    const tabStrip = document.querySelector('.overflow-x-auto');
    expect(tabStrip).toBeInTheDocument();
    expect(within(tabStrip as HTMLElement).getByText('config.json')).toBeInTheDocument();
    expect(within(tabStrip as HTMLElement).getByText('README.md')).toBeInTheDocument();
  });

  it('T1.2: displays content of the active tab', () => {
    renderRightSidebar();
    
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    expect(screen.getByText(/"model"/i)).toBeInTheDocument();
  });

  it('T1.3: changes active tab on click', () => {
    renderRightSidebar();
    
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    const tabStrip = document.querySelector('.overflow-x-auto');
    const readmeTab = within(tabStrip as HTMLElement).getByText('README.md');
    fireEvent.click(readmeTab);

    expect(screen.getByText('No README generated yet.')).toBeInTheDocument();
  });

  it('T1.4: closes a tab and selects another one', () => {
    renderRightSidebar();
    
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    const tabStrip = document.querySelector('.overflow-x-auto');
    const configTab = within(tabStrip as HTMLElement).getByText('config.json');
    const closeBtn = configTab.parentElement?.querySelector('button');
    fireEvent.click(closeBtn!);

    expect(within(tabStrip as HTMLElement).queryByText('config.json')).not.toBeInTheDocument();
    expect(screen.getByText('No README generated yet.')).toBeInTheDocument();
  });

  it('T1.5: shows empty state when all tabs are closed', () => {
    renderRightSidebar();
    
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    const tabStrip = document.querySelector('.overflow-x-auto') as HTMLElement;

    const closeBtn1 = within(tabStrip).getByText('config.json').parentElement?.querySelector('button');
    fireEvent.click(closeBtn1!);

    const closeBtn2 = within(tabStrip).getByText('README.md').parentElement?.querySelector('button');
    fireEvent.click(closeBtn2!);

    expect(screen.getByText('No files open')).toBeInTheDocument();
  });

  // TIER 2: Boundary & Corner Cases (5 tests)
  it('T2.1: persists open tabs to session storage', () => {
    renderRightSidebar();
    
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    const tabStrip = document.querySelector('.overflow-x-auto') as HTMLElement;
    const closeBtn = within(tabStrip).getByText('config.json').parentElement?.querySelector('button');
    fireEvent.click(closeBtn!);

    const openTabsStored = JSON.parse(window.sessionStorage.getItem('archon_open_tabs') || '[]');
    expect(openTabsStored).toEqual(['readme']);
  });

  it('T2.2: persists active tab to session storage', () => {
    renderRightSidebar();
    
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    const tabStrip = document.querySelector('.overflow-x-auto') as HTMLElement;
    const readmeTab = within(tabStrip).getByText('README.md');
    fireEvent.click(readmeTab);

    expect(window.sessionStorage.getItem('archon_active_tab')).toBe('readme');
  });

  it('T2.3: restores open tabs from session storage on re-mount', () => {
    window.sessionStorage.setItem('archon_open_tabs', JSON.stringify(['readme', 'schema']));
    
    renderRightSidebar();
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    const tabStrip = document.querySelector('.overflow-x-auto') as HTMLElement;
    expect(within(tabStrip).getByText('README.md')).toBeInTheDocument();
    expect(within(tabStrip).getByText('schema.sql')).toBeInTheDocument();
    expect(within(tabStrip).queryByText('config.json')).not.toBeInTheDocument();
  });

  it('T2.4: restores active tab from session storage on re-mount', () => {
    window.sessionStorage.setItem('archon_open_tabs', JSON.stringify(['readme', 'schema']));
    window.sessionStorage.setItem('archon_active_tab', 'schema');
    
    renderRightSidebar();
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    expect(screen.getByText('No schema generated yet.')).toBeInTheDocument();
  });

  it('T2.5: opens new tab from the dropdown list', () => {
    renderRightSidebar();
    const fileTabButton = screen.getByTitle('File Viewer');
    fireEvent.click(fileTabButton);

    const tabStrip = document.querySelector('.overflow-x-auto') as HTMLElement;
    const closeBtn = within(tabStrip).getByText('README.md').parentElement?.querySelector('button');
    fireEvent.click(closeBtn!);

    const dropdownContainer = document.querySelector('.relative.group') as HTMLElement;
    expect(dropdownContainer).toBeInTheDocument();
    
    // Simulate hover to expose dropdown
    fireEvent.mouseOver(dropdownContainer);

    const dropdownItem = within(dropdownContainer).getByText('README.md');
    fireEvent.click(dropdownItem);

    expect(within(tabStrip).getByText('README.md')).toBeInTheDocument();
  });
});
