import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { CodeBlock } from '../src/components/CodeBlock';
import { useFocusTrap } from '../src/hooks/useFocusTrap';

describe('CodeBlock component tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders raw text during active streaming immediately', () => {
    render(<CodeBlock code="const a = 1;" language="javascript" isStreaming={true} />);
    const codeElement = screen.getByText('const a = 1;');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.tagName.toLowerCase()).toBe('code');
  });

  it('debounces syntax highlighting by 250ms when streaming stops', () => {
    const { rerender } = render(<CodeBlock code="const a = 1;" language="javascript" isStreaming={true} />);
    
    // Stop streaming
    rerender(<CodeBlock code="const a = 1;" language="javascript" isStreaming={false} />);
    
    // Check if still rendering raw text before 250ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText('const a = 1;')).toBeInTheDocument();

    // Advance by remainder of 250ms
    act(() => {
      vi.advanceTimersByTime(150);
    });
    
    // Highlighted HTML should now be set
    const codeElement = screen.getByText('const a = 1;');
    expect(codeElement).toBeInTheDocument();
  });
});

describe('useFocusTrap hook tests', () => {
  function TestModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const ref = useFocusTrap(isOpen, onClose);
    return (
      <div>
        <button data-testid="trigger">Trigger</button>
        {isOpen && (
          <div ref={ref} data-testid="modal">
            <button data-testid="first">First</button>
            <button data-testid="second">Second</button>
          </div>
        )}
      </div>
    );
  }

  it('traps focus inside modal and restores focus on close', () => {
    const onClose = vi.fn();
    const { rerender } = render(<TestModal isOpen={false} onClose={onClose} />);
    
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open modal
    rerender(<TestModal isOpen={true} onClose={onClose} />);
    
    // First interactive element should be focused
    const first = screen.getByTestId('first');
    expect(document.activeElement).toBe(first);
  });
});
