"use client";

import Image from "next/image";
import { useState, useTransition, type FormEvent } from "react";
import { createTeamMember, updateTeamMember } from "@/app/admin/actions";
import type { TeamMemberRow } from "@/lib/supabase/types";

const CATEGORIES = [
  { value: "executive", label: "Executive" },
  { value: "founders", label: "Founders" },
  { value: "advisory", label: "Advisory" },
  { value: "former_presidents", label: "Former Presidents" },
];

export default function TeamMemberForm({
  editing,
  onDone,
}: {
  editing: TeamMemberRow | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = editing
        ? await updateTeamMember(editing.id, formData)
        : await createTeamMember(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="form-card"
      style={{ marginBottom: 24 }}
      key={editing?.id ?? "new"}
    >
      <h3 style={{ fontSize: 18, marginBottom: 4 }}>{editing ? "Edit member" : "New member"}</h3>

      <label className="f" htmlFor="tm-name">
        Name *
      </label>
      <input id="tm-name" name="name" required defaultValue={editing?.name} />

      <label className="f" htmlFor="tm-role">
        Role/Title *
      </label>
      <input
        id="tm-role"
        name="role"
        required
        placeholder="e.g., President, Treasurer, Secretary"
        defaultValue={editing?.role}
      />

      <label className="f" htmlFor="tm-category">
        Category *
      </label>
      <select id="tm-category" name="category" required defaultValue={editing?.category ?? "executive"}>
        {CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>

      <label className="f" htmlFor="tm-email">
        Email
      </label>
      <input id="tm-email" name="email" type="email" defaultValue={editing?.email ?? ""} />

      <label className="f" htmlFor="tm-phone">
        Phone
      </label>
      <input id="tm-phone" name="phone" type="tel" defaultValue={editing?.phone ?? ""} />

      <label className="f" htmlFor="tm-bio">
        Bio
      </label>
      <textarea
        id="tm-bio"
        name="bio"
        rows={3}
        placeholder="Short description (optional)"
        defaultValue={editing?.bio ?? ""}
      />

      <label className="f" htmlFor="tm-photo">
        Photo {editing?.photo_path && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(choose a file to replace)</span>}
      </label>
      {editing?.photo_path && (
        <Image
          src={editing.photo_path}
          alt={editing.name}
          width={120}
          height={120}
          style={{ borderRadius: 8, marginBottom: 8, display: "block", objectFit: "cover" }}
          unoptimized
        />
      )}
      <input id="tm-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />

      <label className="f" htmlFor="tm-order">
        Display Order (within category)
      </label>
      <input
        id="tm-order"
        name="display_order"
        type="number"
        defaultValue={editing?.display_order ?? 0}
      />

      <label className="f" htmlFor="tm-term-start">
        Term Start Date
      </label>
      <input
        id="tm-term-start"
        name="term_start"
        type="date"
        defaultValue={editing?.term_start ?? ""}
      />

      <label className="f" htmlFor="tm-term-end">
        Term End Date
      </label>
      <input
        id="tm-term-end"
        name="term_end"
        type="date"
        defaultValue={editing?.term_end ?? ""}
      />

      <label className="consent">
        <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} />
        Active — show this member on the public page
      </label>

      <label className="consent">
        <input type="checkbox" name="is_founder" defaultChecked={editing?.is_founder ?? false} />
        Also a founder of ABAC (Former Presidents only)
      </label>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add member"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
