/** ⚠️ PLACEHOLDER DATA — NOT REAL ABAC EVENTS.
 *
 *  Every entry below was invented for the design prototype. The live
 *  WordPress site has no structured events feed to migrate from, so these
 *  carry over unchanged purely so the calendar and event rows have something
 *  to lay out.
 *
 *  Nothing here has been confirmed by the committee. Do not publish this page
 *  until the real dates, venues and fees replace these. Phase 3 moves this
 *  table into Supabase so the committee edits it in the browser.
 */

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

export const PLACEHOLDER_EVENTS = true;

export const EVENTS: ABACEvent[] = [
  {
    id: "losar-picnic",
    title: "Losar community picnic",
    date: "2026-08-15",
    time: "11 am – 3 pm",
    location: "Weston Park, Yarralumla",
    note: "Bring a plate to share",
    access: "open",
    cta: "rsvp",
  },
  {
    id: "youth-leadership",
    title: "Youth leadership workshop",
    date: "2026-08-29",
    location: "Gungahlin Library",
    note: "Ages 15–25",
    access: "members",
    cta: null,
  },
  {
    id: "dzongkha-term-4",
    title: "Dzongkha class — term 4 start",
    date: "2026-09-05",
    time: "Saturdays 10 am",
    location: "Belconnen Community Centre",
    access: "members",
    cta: null,
  },
  {
    id: "blessed-rainy-day",
    title: "Blessed Rainy Day gathering",
    date: "2026-09-23",
    location: "Venue to be announced",
    access: "open",
    cta: "rsvp",
  },
  {
    id: "multicultural-festival",
    title: "National Multicultural Festival stall",
    date: "2027-02-27",
    location: "Civic",
    note: "Scan the stall QR code to join ABAC on the spot",
    access: "open",
    cta: "volunteer",
  },
];

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
export function eventDays(year: number, month: number) {
  return EVENTS.filter((e) => {
    const p = parts(e.date);
    return p.y === year && p.m === month;
  }).map((e) => parts(e.date).d);
}
