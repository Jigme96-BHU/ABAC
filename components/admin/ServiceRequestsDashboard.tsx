"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getServiceDocumentUrl,
  deleteServiceRequest,
  searchServiceRequests,
  sendServiceDocument,
} from "@/app/admin/actions";
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
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});
  const router = useRouter();

  function clearRowMessage(id: string) {
    setRowMessage((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

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

  function handleSendDocument(e: FormEvent<HTMLFormElement>, r: ServiceRequestRow) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    clearRowMessage(r.id);
    setSendingId(r.id);
    startTransition(async () => {
      const result = await sendServiceDocument(r.id, formData);
      setSendingId(null);
      setRowMessage((prev) => ({
        ...prev,
        [r.id]: result.error ? `Couldn't send: ${result.error}` : `Document emailed to ${r.email}.`,
      }));
      if (!result.error) router.refresh();
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
                <form onSubmit={(e) => handleSendDocument(e, r)}>
                  <input
                    name="document"
                    type="file"
                    accept="application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                    required
                    style={{ fontSize: 12, marginBottom: 4, maxWidth: 200 }}
                  />
                  <button className="btn btn-ghost btn-sm" disabled={pending && sendingId === r.id}>
                    {pending && sendingId === r.id ? "Sending…" : r.fulfilled_at ? "Resend" : "Send"}
                  </button>
                  {r.fulfilled_at && (
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
                      Sent {new Date(r.fulfilled_at).toLocaleDateString("en-AU")}
                    </div>
                  )}
                  {rowMessage[r.id] && (
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>{rowMessage[r.id]}</div>
                  )}
                </form>
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
