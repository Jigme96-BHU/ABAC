"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  searchMembers,
  getMemberDetail,
  resendMembershipConfirmation,
  getMembersForExport,
  createMemberManually,
  deleteMember,
  type MemberDetail,
  type MembersExportFilter,
} from "@/app/admin/actions";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import { formatMemberNo, formatDate } from "@/lib/member-number";
import { serviceTypeLabel } from "@/lib/service-types";
import type { MemberRow } from "@/lib/supabase/types";

function memberNo(m: MemberRow): string {
  return formatMemberNo(m.member_no, new Date(m.joined_at ?? m.created_at).getFullYear());
}

function statusLabel(m: MemberRow): string {
  if (m.status === "pending") return "Pending payment";
  if (m.status === "expired") return "Expired";
  if (m.expires_at && new Date(m.expires_at) < new Date()) return "Expired";
  return "Active";
}

const EXPORT_COLUMNS: CsvColumn<MemberRow>[] = [
  { header: "Member no", value: (m) => memberNo(m) },
  { header: "Name", value: (m) => m.name },
  { header: "Email", value: (m) => m.email },
  { header: "Phone", value: (m) => m.phone ?? "" },
  { header: "Suburb", value: (m) => m.suburb ?? "" },
  { header: "Date of birth", value: (m) => m.date_of_birth },
  { header: "CID", value: (m) => m.cid },
  { header: "Membership type", value: (m) => m.membership_type },
  { header: "Dependent", value: (m) => (m.is_dependent ? "Yes" : "No") },
  { header: "Status", value: (m) => statusLabel(m) },
  { header: "Joined", value: (m) => (m.joined_at ? formatDate(m.joined_at) : "") },
  { header: "Expires", value: (m) => (m.expires_at ? formatDate(m.expires_at) : "") },
  { header: "Fee (cents)", value: (m) => String(m.fee_cents) },
];

export default function MembersDashboard() {
  const [view, setView] = useState<"search" | "add" | "bulk">("search");

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          className={view === "search" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setView("search")}
        >
          Search a member
        </button>
        <button
          className={view === "add" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setView("add")}
        >
          + Add manually
        </button>
        <button
          className={view === "bulk" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
          onClick={() => setView("bulk")}
        >
          Bulk export
        </button>
      </div>

      {view === "search" ? (
        <MemberSearchView />
      ) : view === "add" ? (
        <MemberAddForm onDone={() => setView("search")} />
      ) : (
        <MemberBulkExportView />
      )}
    </div>
  );
}

function MemberSearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberRow[]>([]);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDetail(null);
    startTransition(async () => {
      try {
        const res = await searchMembers(query);
        if (res.error) {
          setError(res.error);
          return;
        }
        setResults(res.results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed — please try again.");
      }
    });
  }

  function openDetail(id: string) {
    setError(null);
    setResendMessage(null);
    startTransition(async () => {
      try {
        const res = await getMemberDetail(id);
        if (res.error) {
          setError(res.error);
          return;
        }
        setDetail(res.detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load that member — please try again.");
      }
    });
  }

  function handleResend(memberId: string) {
    setResendMessage(null);
    startTransition(async () => {
      const res = await resendMembershipConfirmation(memberId);
      setResendMessage(res.error ? `Couldn't resend: ${res.error}` : "Confirmation email resent.");
    });
  }

  function handleDelete(m: MemberRow) {
    if (!confirm(`Delete ${m.name}'s membership record permanently? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteMember(m.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResults((prev) => prev.filter((r) => r.id !== m.id));
      if (detail?.member.id === m.id) setDetail(null);
    });
  }

  return (
    <div>
      <form onSubmit={runSearch} style={{ display: "flex", gap: 8, marginBottom: 20, maxWidth: 480 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, email, CID, or membership number"
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

      {detail ? (
        <MemberDetailPanel
          detail={detail}
          onClose={() => setDetail(null)}
          onResend={handleResend}
          onDelete={handleDelete}
          resendMessage={resendMessage}
          pending={pending}
        />
      ) : results.length > 0 ? (
        <table className="hist-table">
          <thead>
            <tr>
              <th>Member no</th>
              <th>Name</th>
              <th>Email</th>
              <th>Type</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((m) => (
              <tr key={m.id}>
                <td>{memberNo(m)}</td>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td>{m.membership_type === "family" ? "Family" : "Single"}{m.is_dependent ? " (dependent)" : ""}</td>
                <td>{statusLabel(m)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="btn btn-ghost btn-sm" style={{ marginRight: 6 }} onClick={() => openDetail(m.id)} disabled={pending}>
                    View
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(m)} disabled={pending}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: "var(--ink-soft)" }}>Search by name, email, CID, or membership number.</p>
      )}
    </div>
  );
}

function MemberDetailPanel({
  detail,
  onClose,
  onResend,
  onDelete,
  resendMessage,
  pending,
}: {
  detail: MemberDetail;
  onClose: () => void;
  onResend: (memberId: string) => void;
  onDelete: (member: MemberRow) => void;
  resendMessage: string | null;
  pending: boolean;
}) {
  const { member, household, servicesAvailed } = detail;

  return (
    <div className="form-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>{member.name}</h3>
          <p style={{ margin: "4px 0 0", color: "var(--ink-soft)", fontSize: 13 }}>{memberNo(member)}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Back to results
        </button>
      </div>

      <table className="hist-table" style={{ marginBottom: 20 }}>
        <tbody>
          <tr><td>Email</td><td>{member.email}</td></tr>
          <tr><td>Phone</td><td>{member.phone ?? "—"}</td></tr>
          <tr><td>Suburb</td><td>{member.suburb ?? "—"}</td></tr>
          <tr><td>Date of birth</td><td>{member.date_of_birth}</td></tr>
          <tr><td>CID</td><td>{member.cid}</td></tr>
          <tr><td>Gender</td><td>{member.gender ?? "—"}</td></tr>
          <tr><td>Membership type</td><td>{member.membership_type === "family" ? "Family" : "Single"}{member.is_dependent ? " (dependent)" : ""}</td></tr>
          <tr><td>Status</td><td>{statusLabel(member)}</td></tr>
          <tr><td>Joined</td><td>{member.joined_at ? formatDate(member.joined_at) : "—"}</td></tr>
          <tr><td>Expires</td><td>{member.expires_at ? formatDate(member.expires_at) : "—"}</td></tr>
          <tr><td>Fee paid</td><td>${(member.fee_cents / 100).toFixed(2)} AUD</td></tr>
        </tbody>
      </table>

      {household.length > 1 && (
        <>
          <h4 style={{ fontSize: 14, marginBottom: 8 }}>Household</h4>
          <table className="hist-table" style={{ marginBottom: 20 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Member no</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {household.map((h) => (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{memberNo(h)}</td>
                  <td>{h.is_dependent ? "Dependent child" : "Adult"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h4 style={{ fontSize: 14, marginBottom: 8 }}>Services availed</h4>
      {servicesAvailed.length === 0 ? (
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 20 }}>None on record for this email.</p>
      ) : (
        <table className="hist-table" style={{ marginBottom: 20 }}>
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Requested</th>
            </tr>
          </thead>
          <tbody>
            {servicesAvailed.map((s) => (
              <tr key={s.id}>
                <td>{serviceTypeLabel(s.service_type)}</td>
                <td>{s.status === "active" ? "Paid" : "Pending payment"}</td>
                <td>{new Date(s.created_at).toLocaleDateString("en-AU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        {member.status === "active" && (
          <button className="btn btn-ghost btn-sm" onClick={() => onResend(member.id)} disabled={pending}>
            Resend confirmation email
          </button>
        )}
        <button className="btn btn-ghost btn-sm" style={{ color: "#c33" }} onClick={() => onDelete(member)} disabled={pending}>
          Delete member
        </button>
        {resendMessage && (
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{resendMessage}</span>
        )}
      </div>
    </div>
  );
}

function MemberBulkExportView() {
  const [filter, setFilter] = useState<MembersExportFilter>({});
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function runExport() {
    setMessage(null);
    startTransition(async () => {
      const res = await getMembersForExport(filter);
      if (res.error) {
        setMessage(`Couldn't export: ${res.error}`);
        return;
      }
      if (res.rows.length === 0) {
        setMessage("No members match those filters.");
        return;
      }
      downloadCsv(res.rows, EXPORT_COLUMNS, "abac-members");
      setMessage(`Exported ${res.rows.length} members.`);
    });
  }

  return (
    <div className="form-card" style={{ maxWidth: 480 }}>
      <label className="f" style={{ marginTop: 0 }}>Joined between</label>
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

      <label className="f">Status</label>
      <select
        value={filter.status ?? ""}
        onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as MembersExportFilter["status"] }))}
      >
        <option value="">All</option>
        <option value="active">Active only</option>
        <option value="inactive">Inactive only (expired / pending)</option>
      </select>

      <label className="f">Membership type</label>
      <select
        value={filter.membershipType ?? ""}
        onChange={(e) => setFilter((f) => ({ ...f, membershipType: (e.target.value || undefined) as MembersExportFilter["membershipType"] }))}
      >
        <option value="">All</option>
        <option value="single">Single</option>
        <option value="family">Family</option>
      </select>

      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={runExport} disabled={pending}>
        {pending ? "Exporting…" : "Export CSV"}
      </button>
      {message && <p style={{ marginTop: 10, fontSize: 13, color: "var(--ink-soft)" }}>{message}</p>}
    </div>
  );
}

function MemberAddForm({ onDone }: { onDone: () => void }) {
  const [membershipType, setMembershipType] = useState<"single" | "family">("single");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("membership_type", membershipType);
    startTransition(async () => {
      const result = await createMemberManually(formData);
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
        For a member who paid or registered outside the website — cash, bank transfer, or a
        paper form at an event. This activates the membership immediately; use it only once
        payment has actually been received.
      </p>

      <label className="f" style={{ marginTop: 0 }}>Email</label>
      <input name="email" type="email" required />

      <label className="f">Name</label>
      <input name="name" type="text" required placeholder="Full name as on their Citizenship ID" />

      <div className="two">
        <div>
          <label className="f">Sex (optional)</label>
          <select name="gender" defaultValue="">
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="f">Date of birth</label>
          <input name="dob" type="date" required />
        </div>
      </div>

      <label className="f">Citizenship ID (CID)</label>
      <input
        name="cid"
        type="text"
        required
        inputMode="numeric"
        pattern="\d{11}"
        maxLength={11}
        title="CID must be exactly 11 digits"
        placeholder="11-digit CID number"
      />

      <div className="two">
        <div>
          <label className="f">Phone (optional)</label>
          <input name="phone" type="text" />
        </div>
        <div>
          <label className="f">Suburb (optional)</label>
          <input name="suburb" type="text" />
        </div>
      </div>

      <label className="f">Membership type</label>
      <select value={membershipType} onChange={(e) => setMembershipType(e.target.value as "single" | "family")}>
        <option value="single">Single</option>
        <option value="family">Family</option>
      </select>

      <div className="two">
        <div>
          <label className="f">Fee paid (AUD)</label>
          <input name="fee" type="number" min="0" step="0.01" defaultValue={membershipType === "family" ? "30" : "20"} />
        </div>
        <div>
          <label className="f">Joined date</label>
          <input name="joined_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
