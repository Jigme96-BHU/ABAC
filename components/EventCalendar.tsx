"use client";

import { useState } from "react";
import { eventDays, monthName } from "@/content/events";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

export default function EventCalendar({
  startYear,
  startMonth,
}: {
  startYear: number;
  startMonth: number;
}) {
  const [{ y, m }, setView] = useState({ y: startYear, m: startMonth });

  const shift = (n: number) =>
    setView(({ y, m }) => {
      const next = m + n;
      if (next < 0) return { y: y - 1, m: 11 };
      if (next > 11) return { y: y + 1, m: 0 };
      return { y, m: next };
    });

  // Monday-first offset
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const marked = new Set(eventDays(y, m));

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
          return (
            <div className={marked.has(d) ? "day ev" : "day"} key={d}>
              {d}
            </div>
          );
        })}
      </div>

      <p className="cal-key">● Highlighted dates have community events</p>
    </div>
  );
}
