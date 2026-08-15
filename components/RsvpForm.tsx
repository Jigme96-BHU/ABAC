"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitEventRsvp } from "@/app/events/actions";
import type { ABACEvent } from "@/content/events";

/** Replaces the RSVP button's old permanently-disabled state
 *  ("Available once memberships go live") — reveal-in-place, same pattern
 *  as ServiceRequestForm's "Avail service" button. */
export default function RsvpForm({ event }: { event: ABACEvent }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await submitEventRsvp(event.id, event.title, event.date, event.location, formData);
      if (result.ok) {
        setSent(true);
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  if (sent) {
    return <span className="badge open">RSVP confirmed</span>;
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        RSVP
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 12,
        background: "#fafafa",
        borderRadius: 8,
        minWidth: 220,
      }}
    >
      <input name="name" type="text" placeholder="Full name" required style={{ fontSize: 13 }} />
      <input name="email" type="email" placeholder="Email" required style={{ fontSize: 13 }} />
      <input name="phone" type="tel" placeholder="Phone" required style={{ fontSize: 13 }} />
      {error && (
        <div className="notice warn" style={{ fontSize: 12, padding: "6px 10px" }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Sending…" : "Confirm RSVP"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
