import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { WebSocketProvider, useWebSocketContext } from '../src/context/WebSocketContext';
import { useWebSocket } from '../src/hooks/useWebSocket';
import { subscribeActiveChat } from '../src/context/ProjectsContext';

vi.mock('../src/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

vi.mock('../src/context/ProjectsContext', () => ({
  subscribeActiveChat: vi.fn(),
}));

describe('Challenger Tests: R2 WebSocketContext sendChat history and stale closure check', () => {
  const mockSend = vi.fn();
  const mockFlushMessages = vi.fn();
  let mockSubscribeCallback: any = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSend.mockReset();
    mockFlushMessages.mockReset();
    mockSubscribeCallback = null;

    vi.mocked(useWebSocket).mockReturnValue({
      connected: true,
      connecting: false,
      send: mockSend,
      messages: [],
      flushMessages: mockFlushMessages,
    });

    vi.mocked(subscribeActiveChat).mockImplementation((cb: any) => {
      mockSubscribeCallback = cb;
      cb(null); // Initial activeChatId is null
      return () => {};
    });
  });

  it('R2: sendChat transmits history mapped to {role, content} and prevents stale closures', async () => {
    // 1. Render the WebSocketProvider wrapper and get context
    let contextValue: any = null;
    function HelperComponent() {
      contextValue = useWebSocketContext();
      return null;
    }

    render(
      <WebSocketProvider>
        <HelperComponent />
      </WebSocketProvider>
    );

    expect(contextValue).not.toBeNull();
    expect(mockSubscribeCallback).not.toBeNull();

    // 2. Change activeChatId to "chat-A"
    act(() => {
      mockSubscribeCallback("chat-A");
    });

    // 3. Call sendChat first time - history should be empty since messagesMap["chat-A"] is empty
    act(() => {
      contextValue.sendChat("First User Msg", "model-1");
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    let lastCallPayload = mockSend.mock.calls[0][0];
    expect(lastCallPayload.mode).toBe("chat");
    expect(lastCallPayload.payload.content).toBe("First User Msg");
    expect(lastCallPayload.payload.model).toBe("model-1");
    expect(lastCallPayload.payload.history).toEqual([]); // empty history initially

    // The first call also appends the first user message into messagesMap internally.
    // 4. Call sendChat second time - history should now contain the first message mapped to {role, content} format
    act(() => {
      contextValue.sendChat("Second User Msg", "model-1");
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    lastCallPayload = mockSend.mock.calls[1][0];
    expect(lastCallPayload.payload.content).toBe("Second User Msg");
    // Verify mapped format: must only have role and content! (no id, no model, etc.)
    expect(lastCallPayload.payload.history).toEqual([
      { role: "user", content: "First User Msg" }
    ]);

    // 5. Verify no stale activeChatId closure:
    // Change activeChatId to "chat-B" immediately and send.
    // Since "chat-B" has no message history, it should send history: []
    act(() => {
      mockSubscribeCallback("chat-B");
    });

    act(() => {
      contextValue.sendChat("Third User Msg", "model-1");
    });

    expect(mockSend).toHaveBeenCalledTimes(3);
    lastCallPayload = mockSend.mock.calls[2][0];
    expect(lastCallPayload.payload.content).toBe("Third User Msg");
    expect(lastCallPayload.payload.history).toEqual([]); // empty history since chat-B has no messages
  });
});
