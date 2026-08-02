"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DocumentForm from "./DocumentForm";
import { deleteDocument } from "@/app/admin/actions";
import { documentCategoryLabel } from "@/lib/document-categories";
import type { DocumentRow } from "@/lib/supabase/types";

export default function DocumentsDashboard({ documents }: { documents: DocumentRow[] }) {
  const [editing, setEditing] = useState<DocumentRow | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDone() {
    setEditing(null);
    router.refresh();
  }

  function handleDelete(d: DocumentRow) {
    if (!confirm(`Delete "${d.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteDocument(d.id);
      router.refresh();
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
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{documentCategoryLabel(d.category)}</td>
                <td>
                  <a href={d.file_path} target="_blank" rel="noopener">
                    {d.file_name}
                  </a>
                </td>
                <td>{d.published ? "Published" : "Draft"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
