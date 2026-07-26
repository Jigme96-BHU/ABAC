"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createEvent, updateEvent, type EventInput } from "@/app/admin/actions";
import type { EventRow } from "@/lib/supabase/types";

const EMPTY: EventInput = {
  title: "",
  date: "",
  time: "",
  location: "",
  note: "",
  access: "open",
  cta: "",
  published: true,
};

function fromRow(row: EventRow): EventInput {
  return {
    title: row.title,
    date: row.date,
    time: row.time ?? "",
    location: row.location,
    note: row.note ?? "",
    access: row.access,
    cta: row.cta ?? "",
    published: row.published,
  };
}

export default function EventForm({
  editing,
  onDone,
}: {
  editing: EventRow | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState<EventInput>(editing ? fromRow(editing) : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof EventInput>(key: K, value: EventInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateEvent(editing.id, form) : await createEvent(form);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="form-card" style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, marginBottom: 4 }}>{editing ? "Edit event" : "New event"}</h3>

      <label className="f" htmlFor="ev-title">
        Title
      </label>
      <input
        id="ev-title"
        required
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
      />

      <div className="two">
        <div>
          <label className="f" htmlFor="ev-date">
            Date
          </label>
          <input
            id="ev-date"
            type="date"
            required
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
        <div>
          <label className="f" htmlFor="ev-time">
            Time (optional)
          </label>
          <input
            id="ev-time"
            placeholder="11 am – 3 pm"
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
          />
        </div>
      </div>

      <label className="f" htmlFor="ev-location">
        Location
      </label>
      <input
        id="ev-location"
        required
        value={form.location}
        onChange={(e) => set("location", e.target.value)}
      />

      <label className="f" htmlFor="ev-note">
        Note (optional)
      </label>
      <input id="ev-note" value={form.note} onChange={(e) => set("note", e.target.value)} />

      <div className="two">
        <div>
          <label className="f" htmlFor="ev-access">
            Access
          </label>
          <select
            id="ev-access"
            value={form.access}
            onChange={(e) => set("access", e.target.value as EventInput["access"])}
          >
            <option value="open">Open to everyone</option>
            <option value="members">Members only</option>
          </select>
        </div>
        <div>
          <label className="f" htmlFor="ev-cta">
            Button (optional)
          </label>
          <select
            id="ev-cta"
            value={form.cta}
            onChange={(e) => set("cta", e.target.value as EventInput["cta"])}
          >
            <option value="">None</option>
            <option value="rsvp">RSVP</option>
            <option value="volunteer">Volunteer</option>
          </select>
        </div>
      </div>

      <label className="consent">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => set("published", e.target.checked)}
        />
        Published — visible on the public Events page
      </label>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add event"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
