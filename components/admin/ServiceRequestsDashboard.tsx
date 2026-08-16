"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getServiceDocumentUrl,
  deleteServiceRequest,
  searchServiceRequests,
  createRenderedDocumentUploadUrl,
  sendServiceDocument,
  RENDERED_DOCUMENT_MAX_BYTES,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { serviceTypeLabel } from "@/lib/service-types";
import type { ServiceRequestRow } from "@/lib/supabase/types";

const DOCUMENT_FIELDS: { key: keyof ServiceRequestRow; label: string }[] = [
  { key: "passport_path", label: "Passport" },
  { key: "visa_path", label: "Visa" },
  { key: "photo_id_path", label: "Proof of ID" },
  { key: "proof_of_residency_path", label: "Proof of residency" },
];

export default function ServiceRequestsDashboard({ requests }: { requests: ServiceRequestRow[] }) {
  const [view, setView] = useState<"all" | "search">("all");

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button className={view === "all" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("all")}>
          All requests
        </button>
        <button className={view === "search" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("search")}>
          Search
        </button>
      </div>

      {view === "all" ? <RequestsTable requests={requests} /> : <ServiceSearchView />}
    </div>
  );
}

function ServiceSearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ServiceRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await searchServiceRequests(query);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResults(res.results);
    });
  }

  return (
    <div>
      <form onSubmit={runSearch} style={{ display: "flex", gap: 8, marginBottom: 20, maxWidth: 480 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Requester name, email, or phone"
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-sm" disabled={pending}>
          Search
        </button>
      </form>
      {error && (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}
      {results.length > 0 ? (
        <RequestsTable requests={results} />
      ) : (
        <p style={{ color: "var(--ink-soft)" }}>Search by requester name, email, or phone.</p>
      )}
    </div>
  );
}

function RequestsTable({ requests }: { requests: ServiceRequestRow[] }) {
  const [pending, startTransition] = useTransition();
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const router = useRouter();

  function handleView(path: string) {
    setBusyPath(path);
    startTransition(async () => {
      const result = await getServiceDocumentUrl(path);
      setBusyPath(null);
      if (result.error || !result.url) {
        alert(`Couldn't open that document: ${result.error ?? "unknown error"}`);
        return;
      }
      window.open(result.url, "_blank", "noopener");
    });
  }

  function handleDelete(r: ServiceRequestRow) {
    if (!confirm(`Delete ${r.requester_name}'s service request? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteServiceRequest(r.id);
      router.refresh();
    });
  }

  if (requests.length === 0) {
    return <p style={{ color: "var(--ink-soft)" }}>No service requests yet.</p>;
  }

  return (
    <table className="hist-table">
      <thead>
        <tr>
          <th>Requester</th>
          <th>Service</th>
          <th>Contact</th>
          <th>Documents</th>
          <th>Status</th>
          <th>Submitted</th>
          <th>Send document</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => (
          <tr key={r.id}>
            <td>{r.requester_name}</td>
            <td>{serviceTypeLabel(r.service_type)}</td>
            <td>
              {r.email}
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{r.phone}</div>
            </td>
            <td>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                {DOCUMENT_FIELDS.map(({ key, label }) => {
                  const path = r[key] as string | null;
                  if (!path) return null;
                  return (
                    <button
                      key={key}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => handleView(path)}
                      disabled={pending && busyPath === path}
                    >
                      {pending && busyPath === path ? "Opening…" : `View ${label}`}
                    </button>
                  );
                })}
              </div>
            </td>
            <td>{r.status === "active" ? "Paid" : "Pending payment"}</td>
            <td>{new Date(r.created_at).toLocaleDateString("en-AU")}</td>
            <td style={{ minWidth: 220 }}>
              {r.status === "active" ? (
                <SendDocumentCell request={r} onSent={() => router.refresh()} />
              ) : (
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Awaiting payment</span>
              )}
            </td>
            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r)} disabled={pending}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Uploads straight to Supabase Storage via a signed URL rather than
 *  through this form's own submit — routing a real scanned/signed letter
 *  through a Next.js server action's request body hits its 1MB default
 *  limit and fails silently, which is exactly what made the previous
 *  version of this feature unreliable. No file-type restriction: "any
 *  document file" is the point, so whatever extension the admin's file
 *  actually has is what gets used. */
function SendDocumentCell({ request, onSent }: { request: ServiceRequestRow; onSent: () => void }) {
  const [writeEmailOpen, setWriteEmailOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("document");
    setError(null);
    setStatus(null);

    if (!(file instanceof File) || file.size === 0) {
      setError("Please choose a file to send.");
      return;
    }
    if (file.size > RENDERED_DOCUMENT_MAX_BYTES) {
      setError("That file is over 10MB — please choose a smaller one.");
      return;
    }

    startTransition(async () => {
      setStatus("Uploading…");
      const uploadUrl = await createRenderedDocumentUploadUrl(request.id, file.name);
      if (uploadUrl.error || !uploadUrl.path || !uploadUrl.token) {
        setError(uploadUrl.error ?? "Couldn't prepare that file for upload.");
        setStatus(null);
        return;
      }

      const browserSupabase = createClient();
      const { error: putError } = await browserSupabase.storage
        .from("service-documents")
        .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, file);
      if (putError) {
        setError(`Couldn't upload the file: ${putError.message}`);
        setStatus(null);
        return;
      }

      setStatus("Sending email…");
      const message = writeEmailOpen ? customMessage.trim() || undefined : undefined;
      const result = await sendServiceDocument(request.id, uploadUrl.path, file.name, message);
      setStatus(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      form.reset();
      setCustomMessage("");
      setWriteEmailOpen(false);
      onSent();
    });
  }

  return (
    <form onSubmit={submit}>
      <input name="document" type="file" required style={{ fontSize: 12, marginBottom: 4, maxWidth: 200 }} />

      <div style={{ marginBottom: writeEmailOpen ? 6 : 4 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ padding: "3px 8px", fontSize: 11 }}
          onClick={() => setWriteEmailOpen((o) => !o)}
        >
          {writeEmailOpen ? "Hide message" : "Write email"}
        </button>
      </div>

      {writeEmailOpen && (
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Optional note to include in the email…"
          rows={3}
          style={{ fontSize: 12, marginBottom: 6, maxWidth: 200, width: "100%" }}
        />
      )}

      <button className="btn btn-ghost btn-sm" disabled={pending}>
        {status ?? (request.fulfilled_at ? "Resend" : "Send")}
      </button>

      {request.fulfilled_at && !status && (
        <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
          Sent {new Date(request.fulfilled_at).toLocaleDateString("en-AU")}
        </div>
      )}
      {error && <div style={{ fontSize: 11, color: "#c33", marginTop: 4 }}>{error}</div>}
    </form>
  );
}
