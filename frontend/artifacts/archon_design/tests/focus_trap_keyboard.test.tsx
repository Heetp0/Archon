import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { useFocusTrap } from '../src/hooks/useFocusTrap';

function TestModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const ref = useFocusTrap(isOpen, onClose);
  return (
    <div>
      <button data-testid="trigger">Trigger</button>
      {isOpen && (
        <div ref={ref} data-testid="modal">
          <button data-testid="first">First</button>
          <button data-testid="second">Second</button>
          <button data-testid="third">Third</button>
        </div>
      )}
    </div>
  );
}

describe('useFocusTrap Keyboard Events', () => {
  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<TestModal isOpen={true} onClose={onClose} />);
    
    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('wraps focus to first element when Tab is pressed on last element', () => {
    const onClose = vi.fn();
    render(<TestModal isOpen={true} onClose={onClose} />);
    
    const first = screen.getByTestId('first');
    const third = screen.getByTestId('third');
    
    // Focus last element (third)
    act(() => {
      third.focus();
    });
    expect(document.activeElement).toBe(third);

    // Press Tab
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', shiftKey: false });
    
    // Focus should wrap to first element
    expect(document.activeElement).toBe(first);
  });

  it('wraps focus to last element when Shift+Tab is pressed on first element', () => {
    const onClose = vi.fn();
    render(<TestModal isOpen={true} onClose={onClose} />);
    
    const first = screen.getByTestId('first');
    const third = screen.getByTestId('third');
    
    // Focus first element
    act(() => {
      first.focus();
    });
    expect(document.activeElement).toBe(first);

    // Press Shift + Tab
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', shiftKey: true });
    
    // Focus should wrap to third element
    expect(document.activeElement).toBe(third);
  });
});
