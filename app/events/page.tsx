import type { Metadata } from "next";
import { fromRow, byMonth } from "@/content/events";
import { createClient } from "@/lib/supabase/server";
import { getAllStories } from "@/lib/get-stories";
import type { EventRow as DBEventRow } from "@/lib/supabase/types";
import EventCalendar from "@/components/EventCalendar";
import EventRow from "@/components/EventRow";
import StoryCard from "@/components/StoryCard";
import EventsBanner from "@/components/EventsBanner";

export const metadata: Metadata = {
  title: "Events",
  description:
    "What's coming up in the ACT Bhutanese community, plus photos and write-ups from ABAC's recent celebrations and gatherings.",
};

export default async function EventsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("events")
    .select("*")
    .eq("published", true)
    .gte("date", today)
    .order("date", { ascending: true })
    .returns<DBEventRow[]>();

  const upcoming = (rows ?? []).map(fromRow);
  const groups = byMonth(upcoming);
  const now = new Date();
  const allStories = await getAllStories();

  return (
    <main>
      <EventsBanner />

      {/* Forward-looking: the calendar lives here, at the top, because it is
          about what is coming up — not for browsing past write-ups. */}
      <section className="block">
        <div className="wrap">
          <p style={{ color: "var(--ink-soft)", marginBottom: 28, maxWidth: 640 }}>
            What&apos;s coming up in the Canberra Bhutanese community — and, below, photos and
            write-ups from events we&apos;ve already held.
          </p>

          <h3 style={{ fontSize: 20, marginBottom: 14 }}>Upcoming events</h3>

          <div className="events-layout">
            <EventCalendar
              events={upcoming}
              startYear={now.getFullYear()}
              startMonth={now.getMonth()}
            />

            <div>
              {groups.length === 0 ? (
                <p style={{ color: "var(--ink-soft)" }}>
                  No upcoming events posted yet — check back soon, or follow ABAC on Facebook
                  for the latest.
                </p>
              ) : (
                groups.map(([label, events]) => (
                  <div key={label} style={{ marginBottom: 6 }}>
                    <p className="eyebrow-en" style={{ marginTop: 0, marginBottom: 10 }}>
                      {label}
                    </p>
                    {events.map((e) => (
                      <EventRow key={e.id} event={e} detail />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Past events — the photo feed, matching the live site's
          "Events and Announcements". Same real posts as Stories. */}
      <section className="block alt">
        <div className="wrap">
          <span className="dz-eyebrow" style={{ fontSize: 32 }}>འདས་པའི་ལས་རིམ་ཚུ་དང་གནད་དོན་གཙོ་ཅན།</span>
          <h2 style={{ fontSize: 32, marginBottom: 6 }}>Past events &amp; highlights</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 28, maxWidth: 640 }}>
            Photos and stories from our recent gatherings, celebrations, and milestones.
          </p>
          <div className="story-grid">
            {allStories.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
