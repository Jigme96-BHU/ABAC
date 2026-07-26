"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import EventForm from "./EventForm";
import { deleteEvent } from "@/app/admin/actions";
import type { EventRow } from "@/lib/supabase/types";

export default function AdminDashboard({ events }: { events: EventRow[] }) {
  const [editing, setEditing] = useState<EventRow | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDone() {
    setEditing(null);
    router.refresh();
  }

  function handleDelete(ev: EventRow) {
    if (!confirm(`Delete "${ev.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteEvent(ev.id);
      router.refresh();
    });
  }

  return (
    <div>
      {editing ? (
        <EventForm editing={editing === "new" ? null : editing} onDone={handleDone} />
      ) : (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginBottom: 20 }}
          onClick={() => setEditing("new")}
        >
          + New event
        </button>
      )}

      {events.length === 0 ? (
        <p style={{ color: "var(--ink-soft)" }}>No events yet — add the first one above.</p>
      ) : (
        <table className="hist-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Access</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.date}</td>
                <td>{ev.title}</td>
                <td>{ev.access === "members" ? "Members only" : "Open"}</td>
                <td>{ev.published ? "Published" : "Draft"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginRight: 6 }}
                    onClick={() => setEditing(ev)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(ev)}
                    disabled={pending}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
