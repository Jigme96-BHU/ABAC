"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVolunteer } from "@/app/admin/actions";
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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(v: VolunteerRow) {
    if (!confirm(`Delete ${v.name}'s volunteer registration? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteVolunteer(v.id);
      router.refresh();
    });
  }

  return (
    <div>
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 20 }}
        onClick={() => exportCsv(volunteers)}
        disabled={volunteers.length === 0}
      >
        Export CSV
      </button>

      {volunteers.length === 0 ? (
        <p style={{ color: "var(--ink-soft)" }}>No volunteer registrations yet.</p>
      ) : (
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
      )}
    </div>
  );
}
