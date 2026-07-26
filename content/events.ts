import type { EventRow } from "@/lib/supabase/types";

/** Public-site shape for an event — what EventRow/EventCalendar render.
 *  Close to the database row (lib/supabase/types.ts) but uses `undefined`
 *  instead of `null` for optional fields, which is friendlier in JSX. */
export type ABACEvent = {
  id: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  time?: string;
  location: string;
  note?: string;
  access: "open" | "members";
  cta: "rsvp" | "volunteer" | null;
};

export function fromRow(row: EventRow): ABACEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time ?? undefined,
    location: row.location,
    note: row.note ?? undefined,
    access: row.access,
    cta: row.cta,
  };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const monthName = (m: number) => MONTHS[m];

export function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}

/** "Aug" / "15" for the date chip */
export function chip(iso: string) {
  const { m, d } = parts(iso);
  return { m: MONTHS[m].slice(0, 3), d: String(d).padStart(2, "0") };
}

/** groups events under "August 2026" headings, in date order */
export function byMonth(events: ABACEvent[]) {
  const groups = new Map<string, ABACEvent[]>();
  for (const e of [...events].sort((a, b) => a.date.localeCompare(b.date))) {
    const { y, m } = parts(e.date);
    const key = `${MONTHS[m]} ${y}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups];
}

/** day-of-month numbers that have events, for the calendar dots */
export function eventDays(events: ABACEvent[], year: number, month: number) {
  return events
    .filter((e) => {
      const p = parts(e.date);
      return p.y === year && p.m === month;
    })
    .map((e) => parts(e.date).d);
}
