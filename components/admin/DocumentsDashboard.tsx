"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DocumentForm from "./DocumentForm";
import RecentlyDeleted from "./RecentlyDeleted";
import { deleteDocument, restoreDocument, getDeletedDocuments } from "@/app/admin/actions";
import { documentCategoryLabel } from "@/lib/document-categories";
import { usePendingDelete } from "@/lib/usePendingDelete";
import type { DocumentRow } from "@/lib/supabase/types";

export default function DocumentsDashboard({ documents }: { documents: DocumentRow[] }) {
  const [editing, setEditing] = useState<DocumentRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { pendingId: pendingDeleteId, start: startDelete, cancel: cancelDelete } = usePendingDelete();
  const router = useRouter();

  function handleDone() {
    setEditing(null);
    router.refresh();
  }

  function handleDelete(d: DocumentRow) {
    if (!confirm(`Delete "${d.title}"?`)) return;
    setError(null);
    startDelete(d.id, () => {
      startTransition(async () => {
        try {
          const result = await deleteDocument(d.id);
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
        <DocumentForm editing={editing === "new" ? null : editing} onDone={handleDone} />
      ) : (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginBottom: 20 }}
          onClick={() => setEditing("new")}
        >
          + New document
        </button>
      )}

      {error && (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <p style={{ color: "var(--ink-soft)" }}>No documents yet — add the first one above.</p>
      ) : (
        <table className="hist-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>File</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} style={pendingDeleteId === d.id ? { opacity: 0.5 } : undefined}>
                <td>{d.title}</td>
                <td>{documentCategoryLabel(d.category)}</td>
                <td>
                  <a href={d.file_path} target="_blank" rel="noopener">
                    {d.file_name}
                  </a>
                </td>
                <td>{d.published ? "Published" : "Draft"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {pendingDeleteId === d.id ? (
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
                        onClick={() => setEditing(d)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(d)}
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
          const res = await getDeletedDocuments();
          return { error: res.error, items: res.documents };
        }}
        onRestore={restoreDocument}
        getLabel={(d) => d.title}
        getDeletedAt={(d) => d.deleted_at ?? d.updated_at}
        noun="documents"
      />
    </div>
  );
}
