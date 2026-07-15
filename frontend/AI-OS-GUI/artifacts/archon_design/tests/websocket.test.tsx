import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { useWebSocket } from '../src/hooks/useWebSocket';
import { getDaemonConnectionDetails } from '../src/lib/storage';

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
    // Echo or track
  }
}

describe('Feature 5: WebSocket Secure Proxy Mappings', () => {
  const originalLocation = window.location;
  const originalWebSocket = window.WebSocket;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    MockWebSocket.calls = [];
    MockWebSocket.instances = [];
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.stubGlobal('location', originalLocation);
    vi.stubGlobal('WebSocket', originalWebSocket);
  });

  // TIER 1: Feature Coverage (5 tests)
  it('T1.1: resolves connection details on standard localhost', () => {
    vi.stubGlobal('location', { hostname: 'localhost', protocol: 'http:' });
    const details = getDaemonConnectionDetails();
    expect(details.wsUrl).toBe('ws://localhost:8765');
    expect(details.httpUrl).toBe('http://localhost:8765');
  });

  it('T1.2: resolves connection details with custom host/port from localStorage', () => {
    vi.stubGlobal('location', { hostname: 'localhost', protocol: 'http:' });
    window.localStorage.setItem('archon_daemon_host', '192.168.1.50');
    window.localStorage.setItem('archon_daemon_port', '9000');
    const details = getDaemonConnectionDetails();
    expect(details.wsUrl).toBe('ws://192.168.1.50:9000');
    expect(details.httpUrl).toBe('http://192.168.1.50:9000');
  });

  it('T1.3: hook useWebSocket initializes in connecting state', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    const { result } = renderHook(() => useWebSocket());
    expect(result.current.connecting).toBe(true);
    expect(result.current.connected).toBe(false);
  });

  it('T1.4: hook updates state to connected when open event fires', async () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    const { result } = renderHook(() => useWebSocket());
    
    await act(async () => {
      // Simulate socket opening
      const socket = MockWebSocket.instances[0];
      socket.readyState = MockWebSocket.OPEN;
      if (socket.onopen) socket.onopen();
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.connecting).toBe(false);
  });

  it('T1.5: hook handles incoming status message events', async () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    const { result } = renderHook(() => useWebSocket());
    
    await act(async () => {
      const socket = MockWebSocket.instances[0];
      socket.readyState = MockWebSocket.OPEN;
      if (socket.onopen) socket.onopen();
    });

    await act(async () => {
      const socket = MockWebSocket.instances[0];
      if (socket.onmessage) {
        socket.onmessage({
          data: JSON.stringify({
            id: 'msg-1',
            event: 'status',
            payload: { status: 'running', model: 'Coder' }
          })
        });
      }
    });

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].event).toBe('status');
  });

  // TIER 2: Boundary & Corner Cases (5 tests)
  it('T2.1: resolves secure proxy mappings on Replit .dev subdomain', () => {
    vi.stubGlobal('location', { hostname: 'app.replit.dev', protocol: 'https:' });
    const details = getDaemonConnectionDetails();
    expect(details.wsUrl).toBe('wss://8765-app.replit.dev');
    expect(details.httpUrl).toBe('https://8765-app.replit.dev');
  });

  it('T2.2: resolves secure proxy mappings on Replit .app subdomain', () => {
    vi.stubGlobal('location', { hostname: 'app.replit.app', protocol: 'https:' });
    const details = getDaemonConnectionDetails();
    expect(details.wsUrl).toBe('wss://8765-app.replit.app');
    expect(details.httpUrl).toBe('https://8765-app.replit.app');
  });

  it('T2.3: resolves secure proxy mappings on Replit .co subdomain', () => {
    vi.stubGlobal('location', { hostname: 'app.replit.co', protocol: 'https:' });
    const details = getDaemonConnectionDetails();
    expect(details.wsUrl).toBe('wss://8765-app.replit.co');
    expect(details.httpUrl).toBe('https://8765-app.replit.co');
  });

  it('T2.4: avoids double-prefixing if port is already prefixed on Replit host', () => {
    vi.stubGlobal('location', { hostname: '8765-app.replit.app', protocol: 'https:' });
    const details = getDaemonConnectionDetails();
    expect(details.wsUrl).toBe('wss://8765-app.replit.app');
    expect(details.httpUrl).toBe('https://8765-app.replit.app');
  });

  it('T2.5: schedules reconnect and increases delay backoff limit on connection close', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
    const { result } = renderHook(() => useWebSocket());

    await act(async () => {
      const socket = MockWebSocket.instances[0];
      // Close socket to trigger reconnection scheduling
      socket.close();
    });

    expect(result.current.connected).toBe(false);
    expect(MockWebSocket.calls.length).toBe(1); // Only the initial call

    // Reconnection is scheduled with exponential backoff (starting at 2s)
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(MockWebSocket.calls.length).toBe(2); // Second connection attempt
    vi.useRealTimers();
  });
});
