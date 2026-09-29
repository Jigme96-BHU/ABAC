"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateCorporateMember } from "@/app/admin/actions";
import type { CorporateMemberRow } from "@/lib/supabase/types";

export default function CorporateEditForm({
  member,
  onDone,
  onCancel,
}: {
  member: CorporateMemberRow;
  onDone: () => void;
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
        const result = await updateCorporateMember(member.id, {
          business_name: String(formData.get("business_name") ?? ""),
          abn: String(formData.get("abn") ?? ""),
          website: String(formData.get("website") ?? ""),
          contact_name: String(formData.get("contact_name") ?? ""),
          contact_role: String(formData.get("contact_role") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          address: String(formData.get("address") ?? ""),
          notes: String(formData.get("notes") ?? ""),
        });
        if (result.error || !result.member) {
          setError(result.error ?? "Couldn't save changes — please try again.");
          return;
        }
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed — please try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="form-card" style={{ maxWidth: 520, marginBottom: 20 }}>
      <h3 style={{ fontSize: 18, marginBottom: 4 }}>Edit {member.business_name}</h3>
      <p style={{ margin: "0 0 14px", color: "var(--ink-soft)", fontSize: 13 }}>
        Corrects business and contact details only — tier and status aren&apos;t editable here.
      </p>

      <label className="f" style={{ marginTop: 0 }}>
        Business name
      </label>
      <input name="business_name" type="text" required defaultValue={member.business_name} />

      <div className="two">
        <div>
          <label className="f">ABN (optional)</label>
          <input name="abn" type="text" defaultValue={member.abn ?? ""} />
        </div>
        <div>
          <label className="f">Website (optional)</label>
          <input name="website" type="url" defaultValue={member.website ?? ""} />
        </div>
      </div>

      <label className="f">Contact name</label>
      <input name="contact_name" type="text" required defaultValue={member.contact_name} />

      <div className="two">
        <div>
          <label className="f">Role (optional)</label>
          <input name="contact_role" type="text" defaultValue={member.contact_role ?? ""} />
        </div>
        <div>
          <label className="f">Phone</label>
          <input name="phone" type="tel" required defaultValue={member.phone} />
        </div>
      </div>

      <label className="f">Email</label>
      <input name="email" type="email" required defaultValue={member.email} />

      <label className="f">Address (optional)</label>
      <input name="address" type="text" defaultValue={member.address ?? ""} />

      <label className="f">Notes (optional)</label>
      <textarea name="notes" rows={2} defaultValue={member.notes ?? ""} />

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
