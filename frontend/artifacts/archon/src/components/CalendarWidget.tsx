import React, { useState, useMemo } from "react";
import {
  CalendarDays, Clock, ChevronLeft, ChevronRight,
  Plus, X, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  status: string;
}

interface CalendarWidgetProps {
  events?: CalendarEvent[];
  loading?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

export default function CalendarWidget({ events = [], loading }: CalendarWidgetProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Build month grid
  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; events: CalendarEvent[] }[] = [];

    // Padding before month start
    for (let i = 0; i < startOffset; i++) cells.push({ day: null, events: [] });

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dayEvents = events.filter((e) => {
        const evDate = new Date(e.start.dateTime);
        return isSameDay(evDate, cellDate);
      });
      cells.push({ day: d, events: dayEvents });
    }
    return cells;
  }, [year, month, events]);

  const today = new Date();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="rounded-2xl border border-border-core/25 bg-panel-bg p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-accent-indigo" />
          <h2 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Schedule</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-panel-bg/40 text-text-secondary hover:text-text-primary transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-text-primary w-24 text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-panel-bg/40 text-text-secondary hover:text-text-primary transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs font-mono text-text-secondary">
          Loading calendar...
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[9px] font-mono text-text-secondary uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 flex-1">
            {grid.map((cell, i) => {
              const isToday = cell.day !== null && isSameDay(new Date(year, month, cell.day), today);
              const hasEvents = cell.events.length > 0;
              return (
                <div
                  key={i}
                  className={cn(
                    "relative rounded-lg p-1 min-h-[48px] transition-colors cursor-pointer",
                    cell.day === null ? "bg-transparent" : "hover:bg-panel-bg/30",
                    isToday && "bg-accent-indigo/5 border border-accent-indigo/20",
                    !isToday && hasEvents && "bg-text-primary/[0.02] border border-border-core/15"
                  )}
                  onClick={() => cell.events.length > 0 && setSelectedEvent(cell.events[0])}
                >
                  {cell.day !== null && (
                    <>
                      <span className={cn(
                        "text-[10px] font-mono block text-center",
                        isToday ? "text-accent-indigo font-bold" : "text-text-secondary"
                      )}>
                        {cell.day}
                      </span>
                      {hasEvents && (
                        <div className="mt-0.5 space-y-0.5">
                          {cell.events.slice(0, 2).map((e) => (
                            <div
                              key={e.id}
                              className="text-[8px] font-mono truncate px-1 py-0.5 rounded bg-accent-indigo/10 text-accent-indigo/80"
                            >
                              {e.summary}
                            </div>
                          ))}
                          {cell.events.length > 2 && (
                            <div className="text-[8px] font-mono text-text-secondary px-1">
                              +{cell.events.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Today’s upcoming events */}
          <div className="mt-4 pt-4 border-t border-border-core/15 flex-shrink-0">
            <h3 className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2">Upcoming Today</h3>
            {events.filter((e) => isSameDay(new Date(e.start.dateTime), today)).length === 0 ? (
              <div className="text-xs font-mono text-text-secondary italic">No events scheduled today</div>
            ) : (
              <div className="space-y-1.5 max-h-28 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#1e2030 transparent" }}>
                {events
                  .filter((e) => isSameDay(new Date(e.start.dateTime), today))
                  .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
                  .map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEvent(e)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-panel-bg/30 transition-colors text-left"
                    >
                      <div className="w-1 h-1 rounded-full bg-accent-indigo/60 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-mono text-text-primary truncate">{e.summary}</div>
                        <div className="text-[9px] font-mono text-text-secondary flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime(e.start.dateTime)} – {formatTime(e.end.dateTime)}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-app-bg/80 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-panel-bg border border-border-core/30 rounded-2xl p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-mono font-semibold text-text-primary">{selectedEvent.summary}</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-text-secondary hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono text-text-secondary">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-text-secondary" />
                {formatTime(selectedEvent.start.dateTime)} – {formatTime(selectedEvent.end.dateTime)}
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-text-secondary" />
                  {selectedEvent.location}
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-text-secondary leading-relaxed pt-1">{selectedEvent.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
