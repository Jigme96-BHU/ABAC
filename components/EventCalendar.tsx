"use client";

import { useState } from "react";
import { eventDays, monthName, chip, type ABACEvent } from "@/content/events";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

export default function EventCalendar({
  events,
  startYear,
  startMonth,
}: {
  events: ABACEvent[];
  startYear: number;
  startMonth: number;
}) {
  const [{ y, m }, setView] = useState({ y: startYear, m: startMonth });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const shift = (n: number) => {
    setSelectedDay(null); // a selection from the old month wouldn't make sense
    setView(({ y, m }) => {
      const next = m + n;
      if (next < 0) return { y: y - 1, m: 11 };
      if (next > 11) return { y: y + 1, m: 0 };
      return { y, m: next };
    });
  };

  // Monday-first offset
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const marked = new Set(eventDays(events, y, m));

  const dayEvents =
    selectedDay === null
      ? []
      : events.filter((e) => {
          const [ey, em, ed] = e.date.split("-").map(Number);
          return ey === y && em - 1 === m && ed === selectedDay;
        });

  return (
    <div className="cal">
      <div className="cal-head">
        <h3>
          {monthName(m)} {y}
        </h3>
        <div className="cal-nav">
          <button onClick={() => shift(-1)} aria-label="Previous month">
            ‹
          </button>
          <button onClick={() => shift(1)} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      <div className="cal-grid">
        {DOW.map((d, i) => (
          <div className="dow" key={i}>
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div className="day blank" key={`b${i}`}>
            0
          </div>
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const hasEvents = marked.has(d);
          return (
            <button
              key={d}
              type="button"
              className={[
                "day",
                hasEvents ? "ev" : "",
                selectedDay === d ? "sel" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={!hasEvents}
              onClick={() => setSelectedDay(selectedDay === d ? null : d)}
              aria-pressed={selectedDay === d}
            >
              {d}
            </button>
          );
        })}
      </div>

      <p className="cal-key">● Tap a highlighted date to see its events</p>

      {selectedDay !== null && (
        <div className="cal-day-panel">
          {dayEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No events on this day.</p>
          ) : (
            dayEvents.map((e) => {
              const { m: mon, d } = chip(e.date);
              return (
                <div className="cal-day-item" key={e.id}>
                  <span className="cal-day-date">
                    {mon} {d}
                  </span>
                  <div>
                    <strong>{e.title}</strong>
                    <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "2px 0 0" }}>
                      {[e.location, e.time].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
