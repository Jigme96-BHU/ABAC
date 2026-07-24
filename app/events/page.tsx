import type { Metadata } from "next";
import { EVENTS, PLACEHOLDER_EVENTS, byMonth } from "@/content/events";
import EventCalendar from "@/components/EventCalendar";
import EventRow from "@/components/EventRow";
import PlaceholderNotice from "@/components/PlaceholderNotice";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Browse ABAC community events in Canberra by month — cultural celebrations, Dzongkha classes, sports and festivals.",
};

export default function EventsPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <span className="dz-eyebrow">ལས་རིམ</span>
          <h2 style={{ fontSize: 32, marginBottom: 6 }}>Events calendar</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>
            Browse the calendar by month — highlighted dates have events. Member-only events
            unlock when you sign in with an active membership.
          </p>

          {PLACEHOLDER_EVENTS && (
            <PlaceholderNotice>
              These events were invented for the design mockup. Real dates and venues need to
              come from the committee before this page goes live.
            </PlaceholderNotice>
          )}

          <EventCalendar startYear={2026} startMonth={7} />

          {byMonth(EVENTS).map(([label, events]) => (
            <div key={label}>
              <p className="eyebrow-en" style={{ marginTop: 26 }}>
                {label}
              </p>
              {events.map((e) => (
                <EventRow key={e.id} event={e} detail />
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
