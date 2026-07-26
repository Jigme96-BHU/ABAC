"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitMembership } from "@/app/join/actions";

export default function JoinForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // On success this never resolves — submitMembership redirects the
      // browser (to Stripe, or straight to /join/success) instead of
      // returning. It only returns at all when there's a validation error.
      const result = await submitMembership(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit}>
      <label className="f" htmlFor="j-email">
        Email
      </label>
      <input id="j-email" name="email" type="email" required placeholder="name@email.com" />

      <label className="f" htmlFor="j-name">
        Name
      </label>
      <input
        id="j-name"
        name="name"
        type="text"
        required
        placeholder="Full name as on your Citizenship ID"
      />

      <div className="two">
        <div>
          <label className="f" htmlFor="j-gender">
            Sex / Gender
          </label>
          <select id="j-gender" name="gender" defaultValue="">
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="f" htmlFor="j-dob">
            Date of birth
          </label>
          <input id="j-dob" name="dob" type="date" required />
        </div>
      </div>

      <label className="f" htmlFor="j-cid">
        Citizenship ID (CID)
      </label>
      <input id="j-cid" name="cid" type="text" required placeholder="11-digit CID number" />

      <div className="two">
        <div>
          <label className="f" htmlFor="j-phone">
            Phone number
          </label>
          <input id="j-phone" name="phone" type="text" placeholder="04xx xxx xxx" />
        </div>
        <div>
          <label className="f" htmlFor="j-suburb">
            Suburb
          </label>
          <input id="j-suburb" name="suburb" type="text" placeholder="e.g. Gungahlin" />
        </div>
      </div>

      <label className="consent">
        <input type="checkbox" required />I confirm my details are accurate and agree to the{" "}
        <a href="/privacy">privacy statement</a>.
      </label>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={pending}>
        {pending ? "Please wait…" : "Register"}
      </button>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, textAlign: "center" }}>
        Members 18 and over continue to Stripe to pay $20. Under-18 registrations are free and
        activate immediately.
      </p>
    </form>
  );
}
