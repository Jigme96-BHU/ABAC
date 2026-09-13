"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import StoryForm from "./StoryForm";
import RecentlyDeleted from "./RecentlyDeleted";
import { deleteStory, restoreStory, getDeletedStories } from "@/app/admin/actions";
import { usePendingDelete } from "@/lib/usePendingDelete";
import type { StoryRow } from "@/lib/supabase/types";

export default function StoriesDashboard({ stories }: { stories: StoryRow[] }) {
  const [editing, setEditing] = useState<StoryRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { pendingId: pendingDeleteId, start: startDelete, cancel: cancelDelete } = usePendingDelete();
  const router = useRouter();

  function handleDone() {
    setEditing(null);
    router.refresh();
  }

  function handleDelete(s: StoryRow) {
    if (!confirm(`Delete "${s.title}"?`)) return;
    setError(null);
    startDelete(s.id, () => {
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
              <tr key={s.id} style={pendingDeleteId === s.id ? { opacity: 0.5 } : undefined}>
                <td>{s.date}</td>
                <td>{s.title}</td>
                <td>{s.image_path ? "Yes" : "—"}</td>
                <td>{s.video_path ? "Yes" : "—"}</td>
                <td>{s.published ? "Published" : "Draft"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {pendingDeleteId === s.id ? (
                    <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                      Deleting…{" "}
                      <button className="btn btn-ghost btn-sm" onClick={cancelDelete}>
                        Undo
                      </button>
                    </span>
                  ) : (
                    <>
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
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <RecentlyDeleted
        fetchDeleted={async () => {
          const res = await getDeletedStories();
          return { error: res.error, items: res.stories };
        }}
        onRestore={restoreStory}
        getLabel={(s) => s.title}
        getDeletedAt={(s) => s.deleted_at ?? s.updated_at}
        noun="stories"
      />
    </div>
  );
}
