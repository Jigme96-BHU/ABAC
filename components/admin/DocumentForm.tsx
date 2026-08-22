"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createDocument, updateDocument, createDocumentUploadUrl } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENT_CATEGORIES } from "@/lib/document-categories";
import { formatFileSize } from "@/lib/format-bytes";
import type { DocumentRow } from "@/lib/supabase/types";

export default function DocumentForm({
  editing,
  onDone,
}: {
  editing: DocumentRow | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUploadStatus(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      // Straight to Storage from the browser — a real scanned or
      // multi-page PDF routinely exceeds Next.js's 1MB default
      // server-action request-body limit, so routing it through this
      // form's own submit fails silently.
      const file = formData.get("file");
      if (file instanceof File && file.size > 0) {
        setUploadStatus("Uploading…");
        const uploadUrl = await createDocumentUploadUrl(file.type);
        if (uploadUrl.error || !uploadUrl.path || !uploadUrl.token) {
          setError(uploadUrl.error ?? "Couldn't prepare that file for upload.");
          setUploadStatus(null);
          return;
        }
        const browserSupabase = createClient();
        const { error: putError } = await browserSupabase.storage
          .from("documents")
          .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, file);
        if (putError) {
          setError(`Couldn't upload the file: ${putError.message}`);
          setUploadStatus(null);
          return;
        }
        formData.set("file_path", uploadUrl.path);
        formData.set("file_name", file.name);
        formData.set("file_size", String(file.size));
      }
      formData.delete("file");
      setUploadStatus(null);

      const result = editing ? await updateDocument(editing.id, formData) : await createDocument(formData);
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
      <h3 style={{ fontSize: 18, marginBottom: 4 }}>{editing ? "Edit document" : "New document"}</h3>

      <label className="f" htmlFor="doc-title">
        Title
      </label>
      <input id="doc-title" name="title" required defaultValue={editing?.title} />

      <label className="f" htmlFor="doc-description">
        Description <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(optional)</span>
      </label>
      <textarea id="doc-description" name="description" rows={3} defaultValue={editing?.description ?? ""} />

      <label className="f" htmlFor="doc-category">
        Category
      </label>
      <select id="doc-category" name="category" defaultValue={editing?.category ?? "other"}>
        {DOCUMENT_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <label className="f" htmlFor="doc-file">
        File{" "}
        {editing?.file_path && (
          <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>
            (choose a file to replace the current one)
          </span>
        )}
      </label>
      {editing?.file_path && (
        <p style={{ margin: "0 0 8px", fontSize: 14 }}>
          Current file:{" "}
          <a href={editing.file_path} target="_blank" rel="noopener">
            {editing.file_name}
          </a>{" "}
          {editing.file_size != null && (
            <span style={{ color: "var(--ink-soft)" }}>({formatFileSize(editing.file_size)})</span>
          )}
        </p>
      )}
      <input
        id="doc-file"
        name="file"
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        required={!editing}
      />

      <label className="consent">
        <input type="checkbox" name="published" defaultChecked={editing?.published ?? true} />
        Published — visible on the public Policies &amp; Documents page
      </label>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" disabled={pending}>
          {uploadStatus ?? (pending ? "Saving…" : editing ? "Save changes" : "Add document")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
