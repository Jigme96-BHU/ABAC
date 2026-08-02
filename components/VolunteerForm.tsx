"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitVolunteerRegistration } from "@/app/volunteers/actions";
import { ageFrom } from "@/lib/validation";

export default function VolunteerForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [dob, setDob] = useState("");

  const age = dob ? ageFrom(dob) : null;
  const isMinor = age !== null && age >= 0 && age < 18;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await submitVolunteerRegistration(formData);
      if (result.ok) {
        setSent(true);
        form.reset();
        setDob("");
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  if (sent) {
    return (
      <div className="notice ok">
        <strong>Thanks for registering!</strong> The committee will be in touch about upcoming
        volunteering opportunities.
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label className="f" htmlFor="v-name">
        Name
      </label>
      <input id="v-name" name="name" type="text" required placeholder="Full name as on your Citizenship ID" />

      <div className="two">
        <div>
          <label className="f" htmlFor="v-sex">
            Sex
          </label>
          <select id="v-sex" name="sex" required defaultValue="">
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
          <label className="f" htmlFor="v-dob">
            Date of birth
          </label>
          <input
            id="v-dob"
            name="dob"
            type="date"
            required
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>
      </div>

      <label className="f" htmlFor="v-cid">
        Citizenship ID (CID)
      </label>
      <input
        id="v-cid"
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
          <label className="f" htmlFor="v-phone">
            Phone number
          </label>
          <input id="v-phone" name="phone" type="text" required placeholder="04xx xxx xxx" />
        </div>
        <div>
          <label className="f" htmlFor="v-email">
            Email
          </label>
          <input id="v-email" name="email" type="email" required placeholder="name@email.com" />
        </div>
      </div>

      {isMinor && (
        <div style={{ marginTop: 20, paddingTop: 4 }}>
          <label className="f" style={{ marginTop: 0 }}>
            Parent / guardian details{" "}
            <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>
              (required — this volunteer is under 18)
            </span>
          </label>

          <label className="f" htmlFor="v-g-name">
            Guardian name
          </label>
          <input id="v-g-name" name="guardian_name" type="text" required={isMinor} />

          <div className="two">
            <div>
              <label className="f" htmlFor="v-g-phone">
                Guardian phone
              </label>
              <input id="v-g-phone" name="guardian_phone" type="text" required={isMinor} placeholder="04xx xxx xxx" />
            </div>
            <div>
              <label className="f" htmlFor="v-g-email">
                Guardian email
              </label>
              <input id="v-g-email" name="guardian_email" type="email" required={isMinor} placeholder="name@email.com" />
            </div>
          </div>

          <label className="consent">
            <input type="checkbox" name="guardian_consent" required={isMinor} />I am this volunteer&apos;s
            parent/guardian and I consent to their registration.
          </label>
        </div>
      )}

      <label className="consent" style={{ marginTop: 20 }}>
        <input type="checkbox" required />I confirm my details are accurate and agree to the{" "}
        <a href="/privacy">privacy statement</a>.
      </label>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={pending}>
        {pending ? "Please wait…" : "Register to volunteer"}
      </button>
    </form>
  );
}
