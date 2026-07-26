"use client";

import Image from "next/image";
import { useState, useTransition, type FormEvent } from "react";
import { createStory, updateStory } from "@/app/admin/actions";
import type { StoryRow } from "@/lib/supabase/types";

export default function StoryForm({
  editing,
  onDone,
}: {
  editing: StoryRow | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = editing
        ? await updateStory(editing.id, editing.slug, formData)
        : await createStory(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="form-card"
      style={{ marginBottom: 24 }}
      key={editing?.id ?? "new"}
    >
      <h3 style={{ fontSize: 18, marginBottom: 4 }}>{editing ? "Edit story" : "New story"}</h3>

      <label className="f" htmlFor="st-title">
        Title
      </label>
      <input id="st-title" name="title" required defaultValue={editing?.title} />

      <label className="f" htmlFor="st-date">
        Date
      </label>
      <input id="st-date" name="date" type="date" required defaultValue={editing?.date} />

      <label className="f" htmlFor="st-excerpt">
        Excerpt <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(card summary, one or two sentences)</span>
      </label>
      <input id="st-excerpt" name="excerpt" required defaultValue={editing?.excerpt} />

      <label className="f" htmlFor="st-body">
        Description
      </label>
      <textarea
        id="st-body"
        name="body"
        rows={6}
        required
        defaultValue={editing?.body}
        placeholder="Separate paragraphs with a blank line."
      />

      <label className="f" htmlFor="st-image">
        Photo {editing?.image_path && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(choose a file to replace the current one)</span>}
      </label>
      {editing?.image_path && (
        <Image
          src={editing.image_path}
          alt=""
          width={160}
          height={Math.round((160 * (editing.image_height ?? 1)) / (editing.image_width ?? 1))}
          style={{ borderRadius: 8, marginBottom: 8, display: "block" }}
          unoptimized
        />
      )}
      <input id="st-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />

      <label className="consent">
        <input type="checkbox" name="published" defaultChecked={editing?.published ?? true} />
        Published — visible on the public Events and Stories pages
      </label>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add story"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
