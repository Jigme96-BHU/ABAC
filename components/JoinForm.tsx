"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitMembership } from "@/app/join/actions";

type Category = "single" | "family";

export default function JoinForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<Category>("single");
  const [extraAdults, setExtraAdults] = useState<string[]>([]);
  const [children, setChildren] = useState<string[]>([]);

  // Adult 1's own fields are shared by both categories, just posted under a
  // different form field name depending on which one the server action reads
  // (see app/join/actions.ts — the Single branch is untouched and still
  // expects the plain "email"/"name"/etc. names it always has). Under Family
  // they post under the same repeated "adult_*" names as every other adult,
  // so the action can read the whole household with formData.getAll() and the
  // number of adults is unbounded.
  const field = (base: string) => (category === "family" ? `adult_${base}` : base);

  function addAdult() {
    setExtraAdults((a) => [...a, crypto.randomUUID()]);
  }
  function removeAdult(key: string) {
    setExtraAdults((a) => a.filter((k) => k !== key));
  }
  function addChild() {
    setChildren((c) => [...c, crypto.randomUUID()]);
  }
  function removeChild(key: string) {
    setChildren((c) => c.filter((k) => k !== key));
  }

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
      <label className="f">Membership type</label>
      <div className="two">
        <label className="category-option">
          <input
            type="radio"
            name="category"
            value="single"
            checked={category === "single"}
            onChange={() => setCategory("single")}
          />
          <span>
            <strong>Single</strong> — $20 Annually per adult, free under 18
          </span>
        </label>
        <label className="category-option">
          <input
            type="radio"
            name="category"
            value="family"
            checked={category === "family"}
            onChange={() => setCategory("family")}
          />
          <span>
            <strong>Family</strong> — $30 Annually
          </span>
        </label>
      </div>

      <label className="f" htmlFor="j-email">
        {category === "family" ? "Adult 1 — Email" : "Email"}
      </label>
      <input id="j-email" name={field("email")} type="email" required placeholder="name@email.com" />

      <label className="f" htmlFor="j-name">
        {category === "family" ? "Adult 1 — Name" : "Name"}
      </label>
      <input
        id="j-name"
        name={field("name")}
        type="text"
        required
        placeholder="Full name as on your Citizenship ID"
      />

      <div className="two">
        <div>
          <label className="f" htmlFor="j-gender">
            Sex
          </label>
          <select id="j-gender" name={field("gender")} defaultValue="">
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
          <input id="j-dob" name={field("dob")} type="date" required />
        </div>
      </div>

      <label className="f" htmlFor="j-cid">
        Citizenship ID (CID)
      </label>
      <input
        id="j-cid"
        name={field("cid")}
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

      {category === "family" && (
        <>
          {extraAdults.map((key, i) => (
            <div key={key} className="household-block">
              <div className="household-block-head">
                <strong>Adult {i + 2}</strong>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeAdult(key)}
                >
                  Remove
                </button>
              </div>

              <label className="f">
                Email <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(optional)</span>
              </label>
              <input name="adult_email" type="email" placeholder="name@email.com" />

              <label className="f">Name</label>
              <input
                name="adult_name"
                type="text"
                required
                placeholder="Full name as on their Citizenship ID"
              />

              <div className="two">
                <div>
                  <label className="f">Sex</label>
                  <select name="adult_gender" defaultValue="">
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="f">Date of birth</label>
                  <input name="adult_dob" type="date" required />
                </div>
              </div>

              <label className="f">Citizenship ID (CID)</label>
              <input
                name="adult_cid"
                type="text"
                required
                inputMode="numeric"
                pattern="\d{11}"
                maxLength={11}
                title="CID must be exactly 11 digits"
                placeholder="11-digit CID number"
              />
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 16 }}
            onClick={addAdult}
          >
            + Add an adult
          </button>

          <label className="f" style={{ marginTop: 20 }}>
            Children under 18
          </label>
          {children.map((key, i) => (
            <div
              key={key}
              className="two"
              style={{ gridTemplateColumns: "2fr 1fr 1fr auto", alignItems: "end", marginBottom: 10 }}
            >
              <div>
                {i === 0 && (
                  <label className="f" style={{ marginTop: 0 }}>
                    Name
                  </label>
                )}
                <input name="child_name" type="text" placeholder="Child's full name" />
              </div>
              <div>
                {i === 0 && (
                  <label className="f" style={{ marginTop: 0 }}>
                    Date of birth
                  </label>
                )}
                <input name="child_dob" type="date" />
              </div>
              <div>
                {i === 0 && (
                  <label className="f" style={{ marginTop: 0 }}>
                    CID
                  </label>
                )}
                <input
                  name="child_cid"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{11}"
                  maxLength={11}
                  title="CID must be exactly 11 digits"
                  placeholder="11-digit CID"
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeChild(key)}
                aria-label="Remove child"
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addChild}>
            + Add a child
          </button>
        </>
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
        {pending ? "Please wait…" : "Register / renew"}
      </button>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, textAlign: "center" }}>
        {category === "family"
          ? "Family membership is $30 Annually — continue to Stripe to pay. Returning members keep their original membership number when their date of birth and CID match."
          : "Members 18 and over continue to Stripe to pay $20. Under-18 registrations are free and activate immediately. Returning members keep their original membership number when their date of birth and CID match."}
      </p>
    </form>
  );
}
