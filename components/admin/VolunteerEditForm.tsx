"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateVolunteer } from "@/app/admin/actions";
import { ageFrom } from "@/lib/validation";
import type { VolunteerRow } from "@/lib/supabase/types";

export default function VolunteerEditForm({
  volunteer,
  onDone,
  onCancel,
}: {
  volunteer: VolunteerRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [isMinor, setIsMinor] = useState(volunteer.is_minor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await updateVolunteer(volunteer.id, {
          name: String(formData.get("name") ?? ""),
          sex: String(formData.get("sex") ?? ""),
          date_of_birth: String(formData.get("date_of_birth") ?? ""),
          cid: String(formData.get("cid") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          email: String(formData.get("email") ?? ""),
          guardian_name: String(formData.get("guardian_name") ?? ""),
          guardian_phone: String(formData.get("guardian_phone") ?? ""),
          guardian_email: String(formData.get("guardian_email") ?? ""),
        });
        if (result.error || !result.volunteer) {
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
    <form onSubmit={submit} className="form-card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 18, marginBottom: 4 }}>Edit {volunteer.name}</h3>
      <p style={{ margin: "0 0 14px", color: "var(--ink-soft)", fontSize: 13 }}>
        Corrects registration details only.
      </p>

      <label className="f" htmlFor="ve-name">
        Name
      </label>
      <input id="ve-name" name="name" required defaultValue={volunteer.name} />

      <div className="two">
        <div>
          <label className="f" htmlFor="ve-sex">
            Sex
          </label>
          <select id="ve-sex" name="sex" required defaultValue={volunteer.sex}>
            <option value="" disabled>
              Select
            </option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="f" htmlFor="ve-dob">
            Date of birth
          </label>
          <input
            id="ve-dob"
            name="date_of_birth"
            type="date"
            required
            defaultValue={volunteer.date_of_birth}
            onChange={(e) => {
              if (!e.target.value) return;
              setIsMinor(ageFrom(e.target.value) < 18);
            }}
          />
        </div>
      </div>

      <label className="f" htmlFor="ve-cid">
        Citizenship ID (CID)
      </label>
      <input
        id="ve-cid"
        name="cid"
        required
        pattern="\d{11}"
        title="11 digits"
        defaultValue={volunteer.cid}
      />

      <div className="two">
        <div>
          <label className="f" htmlFor="ve-phone">
            Phone
          </label>
          <input id="ve-phone" name="phone" required defaultValue={volunteer.phone} />
        </div>
        <div>
          <label className="f" htmlFor="ve-email">
            Email
          </label>
          <input id="ve-email" name="email" type="email" required defaultValue={volunteer.email} />
        </div>
      </div>

      {isMinor && (
        <>
          <p style={{ margin: "12px 0 4px", fontSize: 13, fontWeight: 600 }}>
            Parent/guardian details (required — volunteer is under 18)
          </p>
          <label className="f" htmlFor="ve-guardian-name">
            Guardian name
          </label>
          <input
            id="ve-guardian-name"
            name="guardian_name"
            required
            defaultValue={volunteer.guardian_name ?? ""}
          />
          <div className="two">
            <div>
              <label className="f" htmlFor="ve-guardian-phone">
                Guardian phone
              </label>
              <input
                id="ve-guardian-phone"
                name="guardian_phone"
                required
                defaultValue={volunteer.guardian_phone ?? ""}
              />
            </div>
            <div>
              <label className="f" htmlFor="ve-guardian-email">
                Guardian email
              </label>
              <input
                id="ve-guardian-email"
                name="guardian_email"
                type="email"
                required
                defaultValue={volunteer.guardian_email ?? ""}
              />
            </div>
          </div>
        </>
      )}

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
