"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import EventForm from "./EventForm";
import { deleteEvent, getEventRsvps } from "@/app/admin/actions";
import type { EventRow } from "@/lib/supabase/types";

type Rsvp = { id: string; name: string; email: string; phone: string; created_at: string };

export default function AdminDashboard({ events }: { events: EventRow[] }) {
  const [editing, setEditing] = useState<EventRow | "new" | null>(null);
  const [rsvpEventId, setRsvpEventId] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
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

  function toggleRsvps(ev: EventRow) {
    if (rsvpEventId === ev.id) {
      setRsvpEventId(null);
      return;
    }
    startTransition(async () => {
      const result = await getEventRsvps(ev.id);
      setRsvps(result.rsvps);
      setRsvpEventId(ev.id);
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
              <Fragment key={ev.id}>
                <tr>
                  <td>{ev.date}</td>
                  <td>{ev.title}</td>
                  <td>{ev.access === "members" ? "Members only" : "Open"}</td>
                  <td>{ev.published ? "Published" : "Draft"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {ev.cta === "rsvp" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginRight: 6 }}
                        onClick={() => toggleRsvps(ev)}
                        disabled={pending}
                      >
                        {rsvpEventId === ev.id ? "Hide RSVPs" : "View RSVPs"}
                      </button>
                    )}
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
                {rsvpEventId === ev.id && (
                  <tr key={`${ev.id}-rsvps`}>
                    <td colSpan={5} style={{ background: "#fafafa", padding: 16 }}>
                      {rsvps.length === 0 ? (
                        <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13 }}>No RSVPs yet for this event.</p>
                      ) : (
                        <table className="hist-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Phone</th>
                              <th>Submitted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rsvps.map((r) => (
                              <tr key={r.id}>
                                <td>{r.name}</td>
                                <td>{r.email}</td>
                                <td>{r.phone}</td>
                                <td>{new Date(r.created_at).toLocaleDateString("en-AU")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
