import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ChatMode from '../src/components/modes/ChatMode';
import RightSidebar from '../src/components/RightSidebar';
import SettingsModal from '../src/components/SettingsModal';
import CouncilMode from '../src/components/modes/CouncilMode';

const mockUseWebSocketContext = vi.fn();
const mockUseProjectsContext = vi.fn();
const mockUseFileAttach = vi.fn();
const mockUseAppContext = vi.fn();

vi.mock('../src/context/WebSocketContext', () => ({
  useWebSocketContext: () => mockUseWebSocketContext(),
  WebSocketProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../src/context/ProjectsContext', () => ({
  useProjectsContext: () => mockUseProjectsContext(),
  ProjectsProvider: ({ children }: any) => <>{children}</>,
  subscribeActiveChat: vi.fn(() => () => {}),
}));

vi.mock('../src/hooks/useFileAttach', () => ({
  useFileAttach: () => mockUseFileAttach(),
}));

vi.mock('../src/context/AppContext', () => ({
  useAppContext: () => mockUseAppContext(),
  AppProvider: ({ children }: any) => <>{children}</>,
}));

describe('Challenger Tests: R1, R3, R4', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    mockUseWebSocketContext.mockReturnValue({
      messages: [
        { id: 'u1', role: 'user', content: 'User **bold** `code` *italic*' },
        { id: 'a1', role: 'assistant', content: 'Assistant **bold** `code` *italic*', model: 'groq/llama-3.1-8b-instant' }
      ],
      isStreaming: false,
      sendChat: vi.fn(),
      connected: true,
      availableModels: [],
      telemetry: { tokens: 0, cost: 0, latency: 0 },
      citations: [],
      researchText: '',
      agentStatuses: [],
      taskQueue: [],
      terminalLines: [],
      dangerousCommand: null,
      calendarEvents: [],
    });

    mockUseProjectsContext.mockReturnValue({
      activeProjectId: 'project-1',
      activeChatId: 'chat-1',
      createChat: vi.fn(),
      projects: [
        {
          id: 'project-1',
          name: 'Project 1',
          path: 'D:\\project1',
          contextFiles: [],
          agentSettings: {
            Planner: { model: 'groq/llama-3.1-8b-instant' },
            Coder: { model: 'groq/llama-3.1-8b-instant' },
            Tester: { model: 'groq/llama-3.1-8b-instant' },
          }
        }
      ],
      removeContextFile: vi.fn(),
    });

    mockUseFileAttach.mockReturnValue({
      inputRef: { current: null },
      openPicker: vi.fn(),
      handleFilesSelected: vi.fn(),
    });

    mockUseAppContext.mockReturnValue({
      mode: 'chat',
      rightSidebarOpen: true,
      setRightSidebarOpen: vi.fn(),
      settingsOpen: true,
      setSettingsOpen: vi.fn(),
      settingsProjectId: 'project-1',
      setSettingsProjectId: vi.fn(),
    });
  });

  it('R1: ChatMode renders assistant messages using react-markdown and user messages as plain text without layout shifts', () => {
    render(<ChatMode />);

    // Check user message: should display markdown syntax as plain text
    const userContainer = screen.getByText('User **bold** `code` *italic*');
    expect(userContainer).toBeInTheDocument();
    // Verify no strong, code, or em tags are present inside the user container
    expect(userContainer.querySelector('strong')).toBeNull();
    expect(userContainer.querySelector('code')).toBeNull();
    expect(userContainer.querySelector('em')).toBeNull();

    // Check assistant message: should render parsed markdown tags
    const assistantBold = screen.getByText('bold');
    expect(assistantBold.tagName.toLowerCase()).toBe('strong');

    const assistantCode = screen.getByText('code');
    expect(assistantCode.tagName.toLowerCase()).toBe('code');

    const assistantItalic = screen.getByText('italic');
    expect(assistantItalic.tagName.toLowerCase()).toBe('em');

    // Layout shift check: ensure the classes are set to prevent layout shifts
    const assistantContainer = assistantBold.closest('div');
    expect(assistantContainer).toHaveClass('prose');
    expect(assistantContainer).toHaveClass('prose-invert');
  });

  it('R3: clicking Clear Session button in RightSidebar triggers window.confirm', () => {
    const clearChatMock = vi.fn();
    mockUseWebSocketContext.mockReturnValue({
      connected: true,
      connecting: false,
      telemetry: { tokens: 100, cost: 0.05, latency: 150 },
      citations: [],
      researchText: '',
      isStreaming: false,
      sendResearch: vi.fn(),
      clearChat: clearChatMock,
      messages: [],
    });

    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<RightSidebar />);

    const clearButton = screen.getByText('Clear Session');
    expect(clearButton).toBeInTheDocument();

    // Case 1: confirm returns false
    confirmSpy.mockReturnValue(false);
    fireEvent.click(clearButton);
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('clear this session'));
    expect(clearChatMock).not.toHaveBeenCalled();

    // Case 2: confirm returns true
    confirmSpy.mockReturnValue(true);
    fireEvent.click(clearButton);
    expect(clearChatMock).toHaveBeenCalled();
  });

  it('R4: SettingsModal maps Cerebras to openai/llama3.3-70b', () => {
    render(<SettingsModal />);

    // Switch to Models tab
    const modelsTabBtn = screen.getByTestId('settings-tab-models');
    fireEvent.click(modelsTabBtn);

    // Click the first select trigger to open the dropdown
    const selectTriggers = screen.getAllByRole('combobox');
    expect(selectTriggers.length).toBeGreaterThan(0);
    fireEvent.click(selectTriggers[0]);

    // Check if Cerebras option is rendered
    const option = screen.getByText(/Cerebras.*Llama 3.3 70B/);
    expect(option).toBeInTheDocument();
  });

  it('R4: CouncilMode maps Cerebras to openai/llama3.3-70b', () => {
    mockUseWebSocketContext.mockReturnValue({
      councilMessages: {},
      isStreaming: false,
      sendCouncil: vi.fn(),
      connected: true,
      availableModels: [], // Triggers fallbacks
    });

    render(<CouncilMode />);

    // Get all elements with text "Synthesizer" and find the one whose parent container displays the mapped Llama 3.3 70B
    const synthesizerHeaders = screen.getAllByText('Synthesizer');
    const match = synthesizerHeaders.some(el => {
      const headerContainer = el.closest('div');
      return headerContainer?.textContent?.includes('Llama 3.3 70B');
    });
    expect(match).toBe(true);
  });
});
