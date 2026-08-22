"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  approveCorporateMember,
  rejectCorporateMember,
  createAdminCorporateLogoUploadUrl,
  recordCorporateLogo,
  removeCorporateLogo,
  searchCorporateMembers,
  createCorporateMemberManually,
  deleteCorporateMember,
  getCorporateMembersForExport,
  getSignedDocumentUrl,
  hideCorporatePartner,
  type CorporateExportFilter,
} from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import { CORPORATE_TIERS, corporateTierLabel, type CorporateTier } from "@/lib/corporate-tiers";
import type { CorporateMemberRow } from "@/lib/supabase/types";

const STATUS_LABEL: Record<CorporateMemberRow["status"], string> = {
  pending: "Pending review",
  approved: "Approved — awaiting payment",
  active: "Active",
  rejected: "Rejected",
};

const EXPORT_COLUMNS: CsvColumn<CorporateMemberRow>[] = [
  { header: "Business name", value: (m) => m.business_name },
  { header: "ABN", value: (m) => m.abn ?? "" },
  { header: "Tier", value: (m) => corporateTierLabel(m.tier) },
  { header: "Status", value: (m) => STATUS_LABEL[m.status] },
  { header: "Contact name", value: (m) => m.contact_name },
  { header: "Email", value: (m) => m.email },
  { header: "Phone", value: (m) => m.phone },
  { header: "Website", value: (m) => m.website ?? "" },
  { header: "Submitted", value: (m) => new Date(m.created_at).toLocaleDateString("en-AU") },
  { header: "Joined", value: (m) => (m.joined_at ? new Date(m.joined_at).toLocaleDateString("en-AU") : "") },
  { header: "Expires", value: (m) => (m.expires_at ? new Date(m.expires_at).toLocaleDateString("en-AU") : "") },
];

export default function CorporateDashboard({ corporateMembers }: { corporateMembers: CorporateMemberRow[] }) {
  const [view, setView] = useState<"list" | "search" | "add" | "export">("list");

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button className={view === "list" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("list")}>
          All applications
        </button>
        <button className={view === "search" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("search")}>
          Search
        </button>
        <button className={view === "add" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("add")}>
          + Add manually
        </button>
        <button className={view === "export" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("export")}>
          Bulk export
        </button>
      </div>

      {view === "list" ? (
        <CorporateTable members={corporateMembers} />
      ) : view === "search" ? (
        <CorporateSearchView />
      ) : view === "add" ? (
        <CorporateAddForm onDone={() => setView("list")} />
      ) : (
        <CorporateExportView />
      )}
    </div>
  );
}

function CorporateTable({ members }: { members: CorporateMemberRow[] }) {
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [busyPath, setBusyPath] = useState<string | null>(null);
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
    if (!confirm(`Reject ${m.business_name}'s application? They'll receive an email notifying them.`)) return;
    clearRowError(m.id);
    startTransition(async () => {
      const result = await rejectCorporateMember(m.id);
      if (result.error) setRowError((prev) => ({ ...prev, [m.id]: result.error! }));
      router.refresh();
    });
  }

  function handleDelete(m: CorporateMemberRow) {
    if (!confirm(`Delete ${m.business_name}'s record permanently? This can't be undone.`)) return;
    clearRowError(m.id);
    startTransition(async () => {
      const result = await deleteCorporateMember(m.id);
      if (result.error) setRowError((prev) => ({ ...prev, [m.id]: result.error! }));
      router.refresh();
    });
  }

  function handleLogoSubmit(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("logo");
    clearRowError(id);
    if (!(file instanceof File) || file.size === 0) {
      setRowError((prev) => ({ ...prev, [id]: "Please choose a logo file to upload." }));
      return;
    }
    startTransition(async () => {
      // Straight to Storage from the browser — a high-res logo export can
      // exceed Next.js's 1MB default server-action request-body limit.
      const uploadUrl = await createAdminCorporateLogoUploadUrl(file.type);
      if (uploadUrl.error || !uploadUrl.path || !uploadUrl.token) {
        setRowError((prev) => ({ ...prev, [id]: uploadUrl.error ?? "Couldn't prepare that file for upload." }));
        return;
      }
      const browserSupabase = createClient();
      const { error: putError } = await browserSupabase.storage
        .from("corporate-logos")
        .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, file);
      if (putError) {
        setRowError((prev) => ({ ...prev, [id]: `Couldn't upload the logo: ${putError.message}` }));
        return;
      }
      const result = await recordCorporateLogo(id, uploadUrl.path);
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

  function handleToggleHidden(m: CorporateMemberRow) {
    clearRowError(m.id);
    startTransition(async () => {
      const result = await hideCorporatePartner(m.id, !m.hidden_from_partners);
      if (result.error) setRowError((prev) => ({ ...prev, [m.id]: result.error! }));
      router.refresh();
    });
  }

  function handleViewCertificate(path: string) {
    setBusyPath(path);
    startTransition(async () => {
      const result = await getSignedDocumentUrl("corporate-documents", path);
      setBusyPath(null);
      if (result.error || !result.url) {
        alert(`Couldn't open that document: ${result.error ?? "unknown error"}`);
        return;
      }
      window.open(result.url, "_blank", "noopener");
    });
  }

  if (members.length === 0) {
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
        {members.map((m) => (
          <tr key={m.id}>
            <td>
              <strong>{m.business_name}</strong>
              {m.website && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{m.website}</div>}
              {m.business_certificate_path && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "2px 8px", fontSize: 11, marginTop: 4 }}
                  onClick={() => handleViewCertificate(m.business_certificate_path!)}
                  disabled={pending && busyPath === m.business_certificate_path}
                >
                  {pending && busyPath === m.business_certificate_path ? "Opening…" : "View certificate"}
                </button>
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
              {m.status === "active" && m.hidden_from_partners && (
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Hidden from Our Partners</div>
              )}
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
                  <button className="btn btn-primary btn-sm" style={{ marginRight: 6 }} onClick={() => handleApprove(m)} disabled={pending}>
                    Approve
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ marginRight: 6 }} onClick={() => handleReject(m)} disabled={pending}>
                    Reject
                  </button>
                </>
              )}
              {m.status === "active" && (
                <div style={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  {m.logo_path ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <a href={m.logo_path} target="_blank" rel="noopener" style={{ fontSize: 12 }}>
                        View logo
                      </a>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveLogo(m.id)} disabled={pending}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleLogoSubmit(e, m.id)} style={{ display: "flex", gap: 6 }}>
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
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggleHidden(m)} disabled={pending}>
                    {m.hidden_from_partners ? "Show on Our Partners" : "Hide from Our Partners"}
                  </button>
                </div>
              )}
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 6, color: "#c33" }}
                onClick={() => handleDelete(m)}
                disabled={pending}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CorporateSearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CorporateMemberRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await searchCorporateMembers(query);
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
          placeholder="Business name, contact, email, or ABN"
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
      {results.length > 0 ? <CorporateTable members={results} /> : <p style={{ color: "var(--ink-soft)" }}>Search by business name, contact, email, or ABN.</p>}
    </div>
  );
}

function CorporateAddForm({ onDone }: { onDone: () => void }) {
  const [tier, setTier] = useState<CorporateTier>("gold");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("tier", tier);
    startTransition(async () => {
      const result = await createCorporateMemberManually(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="form-card" style={{ maxWidth: 520 }}>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 0 }}>
        For a sponsor whose application came in outside the public form — e.g. agreed by phone or in person. This
        still goes through the normal Approve step (a Stripe payment link is emailed) before it becomes active.
      </p>

      <label className="f" style={{ marginTop: 0 }}>Business name</label>
      <input name="business_name" type="text" required />

      <div className="two">
        <div>
          <label className="f">ABN (optional)</label>
          <input name="abn" type="text" />
        </div>
        <div>
          <label className="f">Website (optional)</label>
          <input name="website" type="url" />
        </div>
      </div>

      <label className="f">Contact name</label>
      <input name="contact_name" type="text" required />

      <div className="two">
        <div>
          <label className="f">Role (optional)</label>
          <input name="contact_role" type="text" />
        </div>
        <div>
          <label className="f">Phone</label>
          <input name="phone" type="tel" required />
        </div>
      </div>

      <label className="f">Email</label>
      <input name="email" type="email" required />

      <label className="f">Address (optional)</label>
      <input name="address" type="text" />

      <label className="f">Tier</label>
      <select value={tier} onChange={(e) => setTier(e.target.value as CorporateTier)}>
        {CORPORATE_TIERS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <label className="f">Notes (optional)</label>
      <textarea name="notes" rows={2} />

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add application"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function CorporateExportView() {
  const [filter, setFilter] = useState<CorporateExportFilter>({});
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function toggleTier(tier: CorporateTier) {
    setFilter((f) => {
      const current = f.tiers ?? [];
      const tiers = current.includes(tier) ? current.filter((t) => t !== tier) : [...current, tier];
      return { ...f, tiers: tiers.length > 0 ? tiers : undefined };
    });
  }

  function toggleStatus(status: CorporateMemberRow["status"]) {
    setFilter((f) => {
      const current = f.statuses ?? [];
      const statuses = current.includes(status) ? current.filter((s) => s !== status) : [...current, status];
      return { ...f, statuses: statuses.length > 0 ? statuses : undefined };
    });
  }

  function runExport() {
    setMessage(null);
    startTransition(async () => {
      const res = await getCorporateMembersForExport(filter);
      if (res.error) {
        setMessage(`Couldn't export: ${res.error}`);
        return;
      }
      if (res.rows.length === 0) {
        setMessage("No corporate members match those filters.");
        return;
      }
      downloadCsv(res.rows, EXPORT_COLUMNS, "abac-corporate-members");
      setMessage(`Exported ${res.rows.length} corporate members.`);
    });
  }

  return (
    <div className="form-card" style={{ maxWidth: 480 }}>
      <label className="f" style={{ marginTop: 0 }}>Tier</label>
      <div style={{ marginBottom: 4 }}>
        {CORPORATE_TIERS.map((t) => (
          <label key={t.value} style={{ display: "block", marginBottom: 4 }}>
            <input type="checkbox" checked={filter.tiers?.includes(t.value) ?? false} onChange={() => toggleTier(t.value)} /> {t.label}
          </label>
        ))}
      </div>

      <label className="f">Status</label>
      <div style={{ marginBottom: 4 }}>
        {(["pending", "approved", "active", "rejected"] as const).map((s) => (
          <label key={s} style={{ display: "block", marginBottom: 4 }}>
            <input type="checkbox" checked={filter.statuses?.includes(s) ?? false} onChange={() => toggleStatus(s)} /> {STATUS_LABEL[s]}
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
