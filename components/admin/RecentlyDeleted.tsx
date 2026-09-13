"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Shared "Recently Deleted" panel for every /admin tab — lazy-loads only
 *  when opened (same on-demand pattern already used for RSVPs and search),
 *  shows just enough to identify each row plus how long ago it was deleted,
 *  and a Restore button. Rows here are soft-deleted (see
 *  0031_soft_delete_and_trash.sql) and get permanently purged after 30 days
 *  by a daily cron if never restored. */
export default function RecentlyDeleted<T extends { id: string }>({
  fetchDeleted,
  onRestore,
  onPermanentDelete,
  getLabel,
  getDeletedAt,
  noun,
}: {
  fetchDeleted: () => Promise<{ error: string | null; items: T[] }>;
  onRestore: (id: string) => Promise<{ error: string | null }>;
  onPermanentDelete: (id: string) => Promise<{ error: string | null }>;
  getLabel: (item: T) => string;
  getDeletedAt: (item: T) => string;
  noun: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetchDeleted();
        if (res.error) {
          setError(res.error);
          return;
        }
        setItems(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load recently deleted items.");
      }
    });
  }

  function handleRestore(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await onRestore(id);
        if (res.error) {
          setError(res.error);
          return;
        }
        setItems((prev) => (prev ? prev.filter((item) => item.id !== id) : prev));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Restore failed — please try again.");
      }
    });
  }

  function handlePermanentDelete(id: string, label: string) {
    if (!confirm(`Permanently delete "${label}"? This cannot be undone — it will not wait for the 30-day trash period.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await onPermanentDelete(id);
        if (res.error) {
          setError(res.error);
          return;
        }
        setItems((prev) => (prev ? prev.filter((item) => item.id !== id) : prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed — please try again.");
      }
    });
  }

  return (
    <div style={{ marginTop: 28 }}>
      <button className="btn btn-ghost btn-sm" onClick={toggle}>
        {open ? "Hide recently deleted" : "Recently deleted"}
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          {error && (
            <div className="notice warn" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}
          {items === null ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Loading…</p>
          ) : items.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
              No deleted {noun} in the last 30 days.
            </p>
          ) : (
            <table className="hist-table">
              <thead>
                <tr>
                  <th>{noun.charAt(0).toUpperCase() + noun.slice(1)}</th>
                  <th>Deleted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{getLabel(item)}</td>
                    <td>{new Date(getDeletedAt(item)).toLocaleDateString("en-AU")}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginRight: 6 }}
                        onClick={() => handleRestore(item.id)}
                        disabled={pending}
                      >
                        Restore
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#c33" }}
                        onClick={() => handlePermanentDelete(item.id, getLabel(item))}
                        disabled={pending}
                      >
                        Delete permanently
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ color: "var(--ink-soft)", fontSize: 12, marginTop: 8 }}>
            Permanently removed 30 days after deletion if not restored.
          </p>
        </div>
      )}
    </div>
  );
}
