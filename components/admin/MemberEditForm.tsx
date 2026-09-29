"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateMember } from "@/app/admin/actions";
import type { MemberRow } from "@/lib/supabase/types";

export default function MemberEditForm({
  member,
  onDone,
  onCancel,
}: {
  member: MemberRow;
  onDone: (updated: MemberRow) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await updateMember(member.id, {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          gender: String(formData.get("gender") ?? ""),
          date_of_birth: String(formData.get("date_of_birth") ?? ""),
          cid: String(formData.get("cid") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          suburb: String(formData.get("suburb") ?? ""),
        });
        if (result.error || !result.member) {
          setError(result.error ?? "Couldn't save changes — please try again.");
          return;
        }
        onDone(result.member);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed — please try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="form-card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 18, marginBottom: 4 }}>Edit {member.name}</h3>
      <p style={{ margin: "0 0 14px", color: "var(--ink-soft)", fontSize: 13 }}>
        Corrects personal details only — status, fee, and membership dates aren&apos;t editable
        here.
      </p>

      <label className="f" htmlFor="me-name">
        Name
      </label>
      <input id="me-name" name="name" required defaultValue={member.name} />

      <label className="f" htmlFor="me-email">
        Email
      </label>
      <input id="me-email" name="email" type="email" required defaultValue={member.email} />

      <div className="two">
        <div>
          <label className="f" htmlFor="me-gender">
            Sex
          </label>
          <select id="me-gender" name="gender" defaultValue={member.gender ?? ""}>
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="f" htmlFor="me-dob">
            Date of birth
          </label>
          <input
            id="me-dob"
            name="date_of_birth"
            type="date"
            required
            defaultValue={member.date_of_birth}
          />
        </div>
      </div>

      <label className="f" htmlFor="me-cid">
        Citizenship ID (CID)
      </label>
      <input
        id="me-cid"
        name="cid"
        required
        pattern="\d{11}"
        title="11 digits"
        defaultValue={member.cid}
      />

      <div className="two">
        <div>
          <label className="f" htmlFor="me-phone">
            Phone
          </label>
          <input id="me-phone" name="phone" defaultValue={member.phone ?? ""} />
        </div>
        <div>
          <label className="f" htmlFor="me-suburb">
            Suburb
          </label>
          <input id="me-suburb" name="suburb" defaultValue={member.suburb ?? ""} />
        </div>
      </div>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
