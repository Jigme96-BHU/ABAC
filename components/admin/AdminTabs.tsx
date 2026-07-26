"use client";

import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import StoriesDashboard from "./StoriesDashboard";
import type { EventRow, StoryRow } from "@/lib/supabase/types";

export default function AdminTabs({
  events,
  stories,
}: {
  events: EventRow[];
  stories: StoryRow[];
}) {
  const [tab, setTab] = useState<"events" | "stories">("events");

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button
          className={tab === "events" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("events")}
        >
          Events ({events.length})
        </button>
        <button
          className={tab === "stories" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setTab("stories")}
        >
          Stories ({stories.length})
        </button>
      </div>

      {tab === "events" ? (
        <AdminDashboard events={events} />
      ) : (
        <StoriesDashboard stories={stories} />
      )}
    </div>
  );
}
