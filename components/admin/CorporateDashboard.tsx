"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  approveCorporateMember,
  rejectCorporateMember,
  uploadCorporateLogo,
  removeCorporateLogo,
} from "@/app/admin/actions";
import { corporateTierLabel } from "@/lib/corporate-tiers";
import type { CorporateMemberRow } from "@/lib/supabase/types";

const STATUS_LABEL: Record<CorporateMemberRow["status"], string> = {
  pending: "Pending review",
  approved: "Approved — awaiting payment",
  active: "Active",
  rejected: "Rejected",
};

export default function CorporateDashboard({ corporateMembers }: { corporateMembers: CorporateMemberRow[] }) {
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const router = useRouter();

  function clearRowError(id: string) {
    setRowError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleApprove(m: CorporateMemberRow) {
    if (!confirm(`Approve ${m.business_name}'s application? This emails them a Stripe payment link.`)) return;
    clearRowError(m.id);
    startTransition(async () => {
      const result = await approveCorporateMember(m.id);
      if (result.error) setRowError((prev) => ({ ...prev, [m.id]: result.error! }));
      router.refresh();
    });
  }

  function handleReject(m: CorporateMemberRow) {
    if (!confirm(`Reject ${m.business_name}'s application?`)) return;
    clearRowError(m.id);
    startTransition(async () => {
      const result = await rejectCorporateMember(m.id);
      if (result.error) setRowError((prev) => ({ ...prev, [m.id]: result.error! }));
      router.refresh();
    });
  }

  function handleLogoSubmit(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    clearRowError(id);
    startTransition(async () => {
      const result = await uploadCorporateLogo(id, formData);
      if (result.error) setRowError((prev) => ({ ...prev, [id]: result.error! }));
      router.refresh();
    });
  }

  function handleRemoveLogo(id: string) {
    clearRowError(id);
    startTransition(async () => {
      const result = await removeCorporateLogo(id);
      if (result.error) setRowError((prev) => ({ ...prev, [id]: result.error! }));
      router.refresh();
    });
  }

  if (corporateMembers.length === 0) {
    return <p style={{ color: "var(--ink-soft)" }}>No corporate applications yet.</p>;
  }

  return (
    <table className="hist-table">
      <thead>
        <tr>
          <th>Business</th>
          <th>Tier</th>
          <th>Contact</th>
          <th>Status</th>
          <th>Submitted</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {corporateMembers.map((m) => (
          <tr key={m.id}>
            <td>
              <strong>{m.business_name}</strong>
              {m.website && (
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{m.website}</div>
              )}
            </td>
            <td>{corporateTierLabel(m.tier)}</td>
            <td>
              {m.contact_name}
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                {m.email} · {m.phone}
              </div>
            </td>
            <td>
              {STATUS_LABEL[m.status]}
              {rowError[m.id] && (
                <div className="notice warn" style={{ marginTop: 6, fontSize: 12, padding: "6px 10px" }}>
                  {rowError[m.id]}
                </div>
              )}
            </td>
            <td>{new Date(m.created_at).toLocaleDateString("en-AU")}</td>
            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              {m.status === "pending" && (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginRight: 6 }}
                    onClick={() => handleApprove(m)}
                    disabled={pending}
                  >
                    Approve
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleReject(m)} disabled={pending}>
                    Reject
                  </button>
                </>
              )}
              {m.status === "active" && (
                <div style={{ minWidth: 220 }}>
                  {m.logo_path ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <a href={m.logo_path} target="_blank" rel="noopener" style={{ fontSize: 12 }}>
                        View logo
                      </a>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRemoveLogo(m.id)}
                        disabled={pending}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleLogoSubmit(e, m.id)} style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <input
                        name="logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        required
                        style={{ fontSize: 12, maxWidth: 150 }}
                      />
                      <button className="btn btn-ghost btn-sm" disabled={pending}>
                        Upload logo
                      </button>
                    </form>
                  )}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
