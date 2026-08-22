"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getServiceDocumentUrl,
  deleteServiceRequest,
  searchServiceRequests,
  updateServiceAction,
  getServiceRequestsForExport,
  type ServiceRequestExportFilter,
} from "@/app/admin/actions";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import { serviceTypeLabel, SERVICE_TYPES } from "@/lib/service-types";
import type { ServiceRequestRow } from "@/lib/supabase/types";

const DOCUMENT_FIELDS: { key: keyof ServiceRequestRow; label: string }[] = [
  { key: "passport_path", label: "Passport" },
  { key: "visa_path", label: "Visa" },
  { key: "photo_id_path", label: "Proof of ID" },
  { key: "proof_of_residency_path", label: "Proof of residency" },
];

const ACTION_LABEL: Record<ServiceRequestRow["action_status"], string> = {
  pending: "Pending",
  done: "Done",
  declined: "Declined",
};

const EXPORT_COLUMNS: CsvColumn<ServiceRequestRow>[] = [
  { header: "Requester", value: (r) => r.requester_name },
  { header: "Email", value: (r) => r.email },
  { header: "Phone", value: (r) => r.phone },
  { header: "Service", value: (r) => serviceTypeLabel(r.service_type) },
  { header: "Payment status", value: (r) => (r.status === "active" ? "Paid" : "Pending payment") },
  { header: "Fee (cents)", value: (r) => String(r.fee_cents) },
  { header: "Member rate used", value: (r) => (r.is_member ? "Yes" : "No") },
  { header: "Action taken", value: (r) => ACTION_LABEL[r.action_status] },
  { header: "Comment", value: (r) => r.admin_comment ?? "" },
  { header: "Submitted", value: (r) => new Date(r.created_at).toLocaleDateString("en-AU") },
];

export default function ServiceRequestsDashboard({ requests }: { requests: ServiceRequestRow[] }) {
  const [view, setView] = useState<"all" | "search" | "export">("all");

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button className={view === "all" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("all")}>
          All requests
        </button>
        <button className={view === "search" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("search")}>
          Search
        </button>
        <button className={view === "export" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("export")}>
          Bulk export
        </button>
      </div>

      {view === "all" ? (
        <RequestsTable requests={requests} />
      ) : view === "search" ? (
        <ServiceSearchView />
      ) : (
        <ServiceExportView />
      )}
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
          <th>Action Taken</th>
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
            <td style={{ minWidth: 200 }}>
              <ActionTakenCell request={r} onChanged={() => router.refresh()} />
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

/** Committee workflow state — separate from the payment `status` column
 *  shown in the "Status" column to its left. Clicking a status button
 *  saves it together with whatever's currently in the comment box, so
 *  noting a reason and setting the status is one action; "Save comment"
 *  lets the admin update just the note without changing the status. */
function ActionTakenCell({ request, onChanged }: { request: ServiceRequestRow; onChanged: () => void }) {
  const [comment, setComment] = useState(request.admin_comment ?? "");
  const [savingStatus, setSavingStatus] = useState<ServiceRequestRow["action_status"] | null>(null);
  const [savingComment, setSavingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setStatus(actionStatus: ServiceRequestRow["action_status"]) {
    setError(null);
    setSavingStatus(actionStatus);
    startTransition(async () => {
      const result = await updateServiceAction(request.id, actionStatus, comment);
      setSavingStatus(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChanged();
    });
  }

  function saveComment() {
    setError(null);
    setSavingComment(true);
    startTransition(async () => {
      const result = await updateServiceAction(request.id, request.action_status, comment);
      setSavingComment(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChanged();
    });
  }

  const statusButton = (value: ServiceRequestRow["action_status"], label: string) => (
    <button
      key={value}
      type="button"
      className={request.action_status === value ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
      style={{ padding: "4px 10px", fontSize: 12 }}
      onClick={() => setStatus(value)}
      disabled={pending}
    >
      {pending && savingStatus === value ? "Saving…" : label}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        {statusButton("done", "Done")}
        {statusButton("pending", "Pending")}
        {statusButton("declined", "Declined")}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (optional)…"
        rows={2}
        style={{ fontSize: 12, width: "100%", maxWidth: 200, marginBottom: 4 }}
      />
      <button className="btn btn-ghost btn-sm" style={{ padding: "3px 8px", fontSize: 11 }} onClick={saveComment} disabled={pending}>
        {pending && savingComment ? "Saving…" : "Save comment"}
      </button>

      {error && <div style={{ fontSize: 11, color: "#c33", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function ServiceExportView() {
  const [filter, setFilter] = useState<ServiceRequestExportFilter>({});
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function toggleActionStatus(status: "pending" | "done" | "declined") {
    setFilter((f) => {
      const current = f.actionStatuses ?? [];
      const next = current.includes(status) ? current.filter((s) => s !== status) : [...current, status];
      return { ...f, actionStatuses: next.length > 0 ? next : undefined };
    });
  }

  function toggleServiceType(type: "letter_of_residency" | "character_reference") {
    setFilter((f) => {
      const current = f.serviceTypes ?? [];
      const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
      return { ...f, serviceTypes: next.length > 0 ? next : undefined };
    });
  }

  function runExport() {
    setMessage(null);
    startTransition(async () => {
      const res = await getServiceRequestsForExport(filter);
      if (res.error) {
        setMessage(`Couldn't export: ${res.error}`);
        return;
      }
      if (res.rows.length === 0) {
        setMessage("No service requests match those filters.");
        return;
      }
      downloadCsv(res.rows, EXPORT_COLUMNS, "abac-service-requests");
      setMessage(`Exported ${res.rows.length} service requests.`);
    });
  }

  return (
    <div className="form-card" style={{ maxWidth: 480 }}>
      <label className="f" style={{ marginTop: 0 }}>Action taken</label>
      <div style={{ marginBottom: 4 }}>
        {(["pending", "done", "declined"] as const).map((s) => (
          <label key={s} style={{ display: "block", marginBottom: 4 }}>
            <input type="checkbox" checked={filter.actionStatuses?.includes(s) ?? false} onChange={() => toggleActionStatus(s)} /> {ACTION_LABEL[s]}
          </label>
        ))}
      </div>

      <label className="f">Service type</label>
      <div style={{ marginBottom: 4 }}>
        {SERVICE_TYPES.map((s) => (
          <label key={s.value} style={{ display: "block", marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={filter.serviceTypes?.includes(s.value) ?? false}
              onChange={() => toggleServiceType(s.value)}
            />{" "}
            {s.label}
          </label>
        ))}
      </div>

      <label className="f">Submitted between</label>
      <div className="two">
        <input
          type="date"
          value={filter.dateRange?.start ?? ""}
          onChange={(e) => setFilter((f) => ({ ...f, dateRange: { start: e.target.value, end: f.dateRange?.end ?? "" } }))}
        />
        <input
          type="date"
          value={filter.dateRange?.end ?? ""}
          onChange={(e) => setFilter((f) => ({ ...f, dateRange: { start: f.dateRange?.start ?? "", end: e.target.value } }))}
        />
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={runExport} disabled={pending}>
        {pending ? "Exporting…" : "Export CSV"}
      </button>
      {message && <p style={{ marginTop: 10, fontSize: 13, color: "var(--ink-soft)" }}>{message}</p>}
    </div>
  );
}
