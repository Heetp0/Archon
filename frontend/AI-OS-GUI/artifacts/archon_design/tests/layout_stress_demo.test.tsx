import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import LayoutStressDemo from '../src/components/ui/demo';

beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class MockPointerEvent extends MouseEvent {
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
      }
    }
    window.PointerEvent = MockPointerEvent as any;
  }

  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (typeof window.HTMLElement.prototype.releasePointerCapture === 'undefined') {
    window.HTMLElement.prototype.releasePointerCapture = function () {};
  }
  if (typeof window.HTMLElement.prototype.hasPointerCapture === 'undefined') {
    window.HTMLElement.prototype.hasPointerCapture = function () { return false; };
  }
});

describe('LayoutStressDemo Performance and Interaction Stress Testing', () => {
  it('should render and handle rapid menu toggling without freezing or lagging', () => {
    render(<LayoutStressDemo />);

    const triggers = screen.getAllByRole('button');
    expect(triggers.length).toBe(9); // 4 corners + 2 centers + 2 sides + 1 center pivot

    const t0 = performance.now();

    // Toggle 5 times (10 clicks total)
    for (let i = 0; i < 5; i++) {
      const pivotTrigger = screen.getByText('Center Pivot');
      act(() => {
        fireEvent.pointerDown(pivotTrigger, { button: 0 });
        fireEvent.pointerUp(pivotTrigger);
        fireEvent.click(pivotTrigger);
      });

      act(() => {
        fireEvent.pointerDown(pivotTrigger, { button: 0 });
        fireEvent.pointerUp(pivotTrigger);
        fireEvent.click(pivotTrigger);
      });
    }

    const t1 = performance.now();
    const duration = t1 - t0;
    console.log(`Rapid toggling 5 times took: ${duration.toFixed(2)}ms`);
    
    // Assert that the duration is well within performance budget for JSDOM (< 3000ms)
    expect(duration).toBeLessThan(3000);
  });

  it('should navigate through submenu pages rapidly without errors', async () => {
    render(<LayoutStressDemo />);
    
    const pivotTrigger = screen.getByText('Center Pivot');
    act(() => {
      fireEvent.pointerDown(pivotTrigger, { button: 0 });
      fireEvent.pointerUp(pivotTrigger);
      fireEvent.click(pivotTrigger);
    });

    const t0 = performance.now();

    // Click "Quick Preferences" to navigate to preferences page
    const preferencesTrigger = await screen.findByText('Quick Preferences');
    act(() => {
      fireEvent.pointerDown(preferencesTrigger, { button: 0 });
      fireEvent.pointerUp(preferencesTrigger);
      fireEvent.click(preferencesTrigger);
    });

    // Check if preferences page content is rendered
    expect(await screen.findByText('Theme Mode')).toBeInTheDocument();

    // Click "Back" specifically from the multiple Back buttons
    const backBtns = screen.getAllByText('Back');
    expect(backBtns.length).toBeGreaterThan(0);
    
    // The second back button corresponds to the preferences submenu (based on DOM order)
    const backBtn = backBtns[backBtns.length - 1];
    
    act(() => {
      fireEvent.pointerDown(backBtn, { button: 0 });
      fireEvent.pointerUp(backBtn);
      fireEvent.click(backBtn);
    });

    expect(await screen.findByText('Profile Settings')).toBeInTheDocument();

    const t1 = performance.now();
    console.log(`Submenu navigation took: ${(t1 - t0).toFixed(2)}ms`);
    expect(t1 - t0).toBeLessThan(1500);
  });
});
