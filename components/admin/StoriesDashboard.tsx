"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import StoryForm from "./StoryForm";
import { deleteStory } from "@/app/admin/actions";
import type { StoryRow } from "@/lib/supabase/types";

export default function StoriesDashboard({ stories }: { stories: StoryRow[] }) {
  const [editing, setEditing] = useState<StoryRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDone() {
    setEditing(null);
    router.refresh();
  }

  function handleDelete(s: StoryRow) {
    if (!confirm(`Delete "${s.title}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteStory(s.id);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed — please try again.");
      }
    });
  }

  return (
    <div>
      {editing ? (
        <StoryForm editing={editing === "new" ? null : editing} onDone={handleDone} />
      ) : (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginBottom: 20 }}
          onClick={() => setEditing("new")}
        >
          + New story
        </button>
      )}

      {error && (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {stories.length === 0 ? (
        <p style={{ color: "var(--ink-soft)" }}>No stories yet — add the first one above.</p>
      ) : (
        <table className="hist-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Photo</th>
              <th>Video</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stories.map((s) => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>{s.title}</td>
                <td>{s.image_path ? "Yes" : "—"}</td>
                <td>{s.video_path ? "Yes" : "—"}</td>
                <td>{s.published ? "Published" : "Draft"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginRight: 6 }}
                    onClick={() => setEditing(s)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(s)}
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
