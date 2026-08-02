"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getServiceDocumentUrl, deleteServiceRequest } from "@/app/admin/actions";
import { serviceTypeLabel } from "@/lib/service-types";
import type { ServiceRequestRow } from "@/lib/supabase/types";

const DOCUMENT_FIELDS: { key: keyof ServiceRequestRow; label: string }[] = [
  { key: "passport_path", label: "Passport" },
  { key: "visa_path", label: "Visa" },
  { key: "license_path", label: "License" },
  { key: "proof_of_residency_path", label: "Proof of residency" },
];

export default function ServiceRequestsDashboard({ requests }: { requests: ServiceRequestRow[] }) {
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
