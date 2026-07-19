import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CalendarWidget from '../src/components/CalendarWidget';

const mockEvents = [
  {
    id: 'e1',
    summary: 'Dentist Appointment',
    description: 'Routine checkup and cleaning',
    location: 'Dental Care Clinic',
    start: { dateTime: new Date().toISOString() },
    end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
    status: 'confirmed'
  },
  {
    id: 'e2',
    summary: 'Team Sync',
    description: 'Weekly alignment meeting',
    location: 'Zoom',
    start: { dateTime: new Date().toISOString() },
    end: { dateTime: new Date(Date.now() + 1800000).toISOString() },
    status: 'confirmed'
  },
  {
    id: 'e3',
    summary: 'Design Review',
    description: 'Reviewing next gen dashboard designs',
    location: 'Meeting Room A',
    start: { dateTime: new Date(Date.now() + 86400000).toISOString() }, // Tomorrow
    end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
    status: 'confirmed'
  }
];

describe('Feature 3: Calendar Widget & Modal', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  // TIER 1: Feature Coverage (5 tests)
  it('T1.1: renders loading message when loading is true', () => {
    render(<CalendarWidget loading={true} />);
    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('T1.2: renders the Schedule title and header when loaded', () => {
    render(<CalendarWidget events={[]} loading={false} />);
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('T1.3: renders all 7 day headers', () => {
    render(<CalendarWidget events={[]} loading={false} />);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('T1.4: displays event summary tags inside calendar cells', () => {
    render(<CalendarWidget events={mockEvents} loading={false} />);
    expect(screen.getAllByText('Dentist Appointment')[0]).toBeInTheDocument();
  });

  it('T1.5: displays upcoming events list for today', () => {
    render(<CalendarWidget events={mockEvents} loading={false} />);
    expect(screen.getByText('Upcoming Today')).toBeInTheDocument();
    const items = screen.getAllByText('Dentist Appointment');
    expect(items.length).toBeGreaterThan(1);
  });

  // TIER 2: Boundary & Corner Cases (5 tests)
  it('T2.1: navigates to next month on next button click', () => {
    const { container } = render(<CalendarWidget events={[]} loading={false} />);
    const initialMonthText = screen.getByText(/[January|February|March|April|May|June|July|August|September|October|November|December]\s\d{4}/).textContent;
    
    const buttons = container.querySelectorAll('button');
    const nextBtn = buttons[1];
    fireEvent.click(nextBtn);
    
    const newMonthText = screen.getByText(/[January|February|March|April|May|June|July|August|September|October|November|December]\s\d{4}/).textContent;
    expect(newMonthText).not.toBe(initialMonthText);
  });

  it('T2.2: navigates to previous month on previous button click', () => {
    const { container } = render(<CalendarWidget events={[]} loading={false} />);
    const initialMonthText = screen.getByText(/[January|February|March|April|May|June|July|August|September|October|November|December]\s\d{4}/).textContent;
    
    const buttons = container.querySelectorAll('button');
    const prevBtn = buttons[0];
    fireEvent.click(prevBtn);
    
    const newMonthText = screen.getByText(/[January|February|March|April|May|June|July|August|September|October|November|December]\s\d{4}/).textContent;
    expect(newMonthText).not.toBe(initialMonthText);
  });

  it('T2.3: opens event details modal when clicking day cell with events', () => {
    render(<CalendarWidget events={mockEvents} loading={false} />);
    
    const cell = screen.getAllByText('Dentist Appointment')[0];
    fireEvent.click(cell.parentElement!);

    expect(screen.getByText('Routine checkup and cleaning')).toBeInTheDocument();
    expect(screen.getByText('Dental Care Clinic')).toBeInTheDocument();
  });

  it('T2.4: dismisses event modal when clicking close button', () => {
    render(<CalendarWidget events={mockEvents} loading={false} />);
    
    const cell = screen.getAllByText('Dentist Appointment')[0];
    fireEvent.click(cell.parentElement!);
    
    const closeBtn = document.querySelector('.fixed button');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn!);

    expect(screen.queryByText('Routine checkup and cleaning')).not.toBeInTheDocument();
  });

  it('T2.5: dismisses event modal when clicking backdrop', () => {
    render(<CalendarWidget events={mockEvents} loading={false} />);
    
    const cell = screen.getAllByText('Dentist Appointment')[0];
    fireEvent.click(cell.parentElement!);
    
    const backdrop = document.querySelector('.fixed.inset-0');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);

    expect(screen.queryByText('Routine checkup and cleaning')).not.toBeInTheDocument();
  });
});
