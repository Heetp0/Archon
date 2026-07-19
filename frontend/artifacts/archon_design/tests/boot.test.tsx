import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LoadingScreen from '../src/components/LoadingScreen';
import App from '../src/App';
import { getBootState, isBootDone, markBootDone, startBoot, getBootSteps, clearBootTimers } from '../src/lib/bootState';

describe('Feature 1: Boot Screen State', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    if (window.__archon_boot_global) {
      window.__archon_boot_global.scheduling = false;
      window.__archon_boot_global.listeners.clear();
      window.__archon_boot_global.offlineListeners.clear();
      window.__archon_boot_global.timers.forEach((t) => clearTimeout(t));
      window.__archon_boot_global.timers = [];
    }
  });

  // TIER 1: Feature Coverage (5 tests)
  it('T1.1: renders LoadingScreen and shows ARCHON title', () => {
    const onDismiss = vi.fn();
    render(<LoadingScreen onDismiss={onDismiss} />);
    expect(screen.getByText('ARCHON')).toBeInTheDocument();
  });

  it('T1.2: displays sequential boot steps', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<LoadingScreen onDismiss={onDismiss} />);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    const steps = getBootSteps();
    expect(screen.getByText(steps[0])).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('T1.3: progresses percentage dynamically', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<LoadingScreen onDismiss={onDismiss} />);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    const state = getBootState();
    expect(state.progress).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('T1.4: displays offline state warning', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<LoadingScreen onDismiss={onDismiss} />);

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('DAEMON OFFLINE')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('T1.5: triggers onDismiss callback when skipped', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<LoadingScreen onDismiss={onDismiss} />);

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    const btn = screen.getByTestId('button-enter-interface');
    await act(async () => {
      fireEvent.click(btn);
      vi.advanceTimersByTime(500);
    });
    expect(onDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });

  // TIER 2: Boundary & Corner Cases (5 tests)
  it('T2.1: skips boot when noboot is present in query parameters', () => {
    vi.stubGlobal('location', {
      search: '?noboot=true',
    });
    render(<App />);
    expect(screen.queryByText('ARCHON')).not.toBeInTheDocument();
  });

  it('T2.2: skips boot when already booted once', () => {
    markBootDone();
    const onDismiss = vi.fn();
    render(<LoadingScreen onDismiss={onDismiss} />);
    expect(screen.queryByText('ARCHON')).not.toBeInTheDocument();
  });

  it('T2.3: allows multiple listeners for boot states', () => {
    vi.useFakeTimers();
    const l1 = vi.fn();
    const l2 = vi.fn();
    startBoot(l1, vi.fn());
    startBoot(l2, vi.fn());
    
    // Advance timers to trigger the first scheduled tick (0ms)
    vi.advanceTimersByTime(0);
    
    expect(l1).toHaveBeenCalled();
    expect(l2).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('T2.4: cleans up timers and listeners on unsubscriber call', () => {
    const l1 = vi.fn();
    const unsub = startBoot(l1, vi.fn());
    unsub();
    expect(window.__archon_boot_global?.listeners.has(l1)).toBe(false);
  });

  it('T2.5: handles clearBootTimers safely when window object does not exist or has no global config', () => {
    const originalGlobal = window.__archon_boot_global;
    delete (window as any).__archon_boot_global;
    expect(() => clearBootTimers()).not.toThrow();
    window.__archon_boot_global = originalGlobal;
  });
});
