"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteVolunteer, searchVolunteers } from "@/app/admin/actions";
import { ageFrom } from "@/lib/validation";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import type { VolunteerRow } from "@/lib/supabase/types";

const CSV_COLUMNS: CsvColumn<VolunteerRow>[] = [
  { header: "Name", value: (v) => v.name },
  { header: "Sex", value: (v) => v.sex },
  { header: "Date of birth", value: (v) => v.date_of_birth },
  { header: "CID", value: (v) => v.cid },
  { header: "Phone", value: (v) => v.phone },
  { header: "Email", value: (v) => v.email },
  { header: "Guardian name", value: (v) => v.guardian_name ?? "" },
  { header: "Guardian phone", value: (v) => v.guardian_phone ?? "" },
  { header: "Guardian email", value: (v) => v.guardian_email ?? "" },
  { header: "Registered", value: (v) => v.created_at },
];

function exportCsv(volunteers: VolunteerRow[]) {
  downloadCsv(volunteers, CSV_COLUMNS, "abac-volunteers");
}

export default function VolunteersDashboard({ volunteers }: { volunteers: VolunteerRow[] }) {
  const [view, setView] = useState<"all" | "search">("all");

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button className={view === "all" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("all")}>
          All volunteers
        </button>
        <button className={view === "search" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} onClick={() => setView("search")}>
          Search
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => exportCsv(volunteers)}
          disabled={volunteers.length === 0}
        >
          Export CSV
        </button>
      </div>

      {view === "all" ? <VolunteersTable volunteers={volunteers} /> : <VolunteerSearchView />}
    </div>
  );
}

function VolunteerSearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VolunteerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await searchVolunteers(query);
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
          placeholder="Name, email, phone, or CID"
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
        <VolunteersTable volunteers={results} />
      ) : (
        <p style={{ color: "var(--ink-soft)" }}>Search by name, email, phone, or CID.</p>
      )}
    </div>
  );
}

function VolunteersTable({ volunteers }: { volunteers: VolunteerRow[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(v: VolunteerRow) {
    if (!confirm(`Delete ${v.name}'s volunteer registration? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteVolunteer(v.id);
      router.refresh();
    });
  }

  if (volunteers.length === 0) {
    return <p style={{ color: "var(--ink-soft)" }}>No volunteer registrations yet.</p>;
  }

  return (
    <table className="hist-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Age</th>
          <th>Sex</th>
          <th>CID</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Guardian</th>
          <th>Registered</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {volunteers.map((v) => (
          <tr key={v.id}>
            <td>{v.name}</td>
            <td>{ageFrom(v.date_of_birth)}</td>
            <td>{v.sex}</td>
            <td>{v.cid}</td>
            <td>{v.phone}</td>
            <td>{v.email}</td>
            <td>
              {v.is_minor ? (
                <>
                  {v.guardian_name}
                  <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                    {v.guardian_phone} · {v.guardian_email}
                  </div>
                </>
              ) : (
                "—"
              )}
            </td>
            <td>{new Date(v.created_at).toLocaleDateString("en-AU")}</td>
            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(v)} disabled={pending}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
