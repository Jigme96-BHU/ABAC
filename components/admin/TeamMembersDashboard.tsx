"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TeamMemberForm from "./TeamMemberForm";
import { deleteTeamMember } from "@/app/admin/actions";
import type { TeamMemberRow } from "@/lib/supabase/types";

const CATEGORY_LABELS: Record<string, string> = {
  executive: "Executive",
  founders: "Founders",
  advisory: "Advisory",
  former_presidents: "Former Presidents",
};

export default function TeamMembersDashboard({ members }: { members: TeamMemberRow[] }) {
  const [editing, setEditing] = useState<TeamMemberRow | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDone() {
    setEditing(null);
    router.refresh();
  }

  function handleDelete(m: TeamMemberRow) {
    if (!confirm(`Delete "${m.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteTeamMember(m.id);
      router.refresh();
    });
  }

  const groupedByCategory = members.reduce(
    (acc, member) => {
      if (!acc[member.category]) {
        acc[member.category] = [];
      }
      acc[member.category].push(member);
      return acc;
    },
    {} as Record<string, TeamMemberRow[]>
  );

  // Sort categories in a sensible order
  const categoryOrder = ["executive", "founders", "advisory", "former_presidents"];
  const sortedCategories = categoryOrder.filter((cat) => groupedByCategory[cat]);

  return (
    <div>
      {editing ? (
        <TeamMemberForm editing={editing === "new" ? null : editing} onDone={handleDone} />
      ) : (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginBottom: 20 }}
          onClick={() => setEditing("new")}
        >
          + New member
        </button>
      )}

      {members.length === 0 ? (
        <p style={{ color: "var(--ink-soft)" }}>No team members yet — add the first one above.</p>
      ) : (
        sortedCategories.map((category) => (
          <div key={category} style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--ink-soft)" }}>
              {CATEGORY_LABELS[category]}
            </h3>
            <table className="hist-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {groupedByCategory[category]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.role}</td>
                      <td>{m.email || "—"}</td>
                      <td>{m.active ? "Active" : "Inactive"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => setEditing(m)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
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
          </div>
        ))
      )}
    </div>
  );
}
