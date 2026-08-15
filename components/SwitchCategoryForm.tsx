"use client";

import { useState, useTransition, type FormEvent } from "react";
import { quoteCategorySwitch, submitCategorySwitch, type SwitchQuote } from "@/app/join/actions";

type Target = "single" | "family";

/** Two steps on purpose: the price depends on how many days are left on the
 *  existing membership, so we look the member up and show what they'll pay
 *  before asking them for anything else. The quote shown here is advisory —
 *  the server re-prices from the database on submit. */
export default function SwitchCategoryForm() {
  const [target, setTarget] = useState<Target>("family");
  const [quote, setQuote] = useState<Extract<SwitchQuote, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [extraAdults, setExtraAdults] = useState<string[]>([]);
  const [children, setChildren] = useState<string[]>([]);

  function reset() {
    setQuote(null);
    setError(null);
    setExtraAdults([]);
    setChildren([]);
  }

  function lookUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await quoteCategorySwitch(formData);
      if (result.ok) setQuote(result);
      else {
        setQuote(null);
        setError(result.message);
      }
    });
  }

  function confirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // On success this never resolves — it redirects to Stripe, or straight
      // to /join/success when there is nothing to pay.
      const result = await submitCategorySwitch(formData);
      if (result?.error) setError(result.error);
    });
  }

  const amount = quote ? (quote.amountDueCents / 100).toFixed(2) : "0.00";
  const free = quote ? quote.amountDueCents < 50 : false;

  if (!quote) {
    return (
      <form onSubmit={lookUp}>
        <label className="f">Change to</label>
        <div className="two">
          <label className="category-option">
            <input
              type="radio"
              name="target_type"
              value="family"
              checked={target === "family"}
              onChange={() => setTarget("family")}
            />
            <span>
              <strong>Family</strong> — from Single
            </span>
          </label>
          <label className="category-option">
            <input
              type="radio"
              name="target_type"
              value="single"
              checked={target === "single"}
              onChange={() => setTarget("single")}
            />
            <span>
              <strong>Single</strong> — from Family
            </span>
          </label>
        </div>

        <div className="two">
          <div>
            <label className="f" htmlFor="sw-dob">
              Your date of birth
            </label>
            <input id="sw-dob" name="dob" type="date" required />
          </div>
          <div>
            <label className="f" htmlFor="sw-cid">
              Your CID
            </label>
            <input
              id="sw-cid"
              name="cid"
              type="text"
              required
              inputMode="numeric"
              pattern="\d{11}"
              maxLength={11}
              title="CID must be exactly 11 digits"
              placeholder="11-digit CID number"
            />
          </div>
        </div>

        {error && (
          <div className="notice warn" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} disabled={pending}>
          {pending ? "Checking…" : "Check price"}
        </button>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, textAlign: "center" }}>
          You keep your membership number and your existing renewal date — you only pay the
          difference for the days you have left.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={confirm}>
      <input type="hidden" name="target_type" value={quote.targetType} />

      <div className="pay-box">
        <div className="pay-head">
          <strong>{quote.name}</strong>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{quote.memberNo}</span>
        </div>
        <table className="hist-table">
          <tbody>
            <tr>
              <td>Currently</td>
              <td style={{ textAlign: "right" }}>
                {quote.currentType === "family" ? "Family" : "Single"}
              </td>
            </tr>
            <tr>
              <td>Changing to</td>
              <td style={{ textAlign: "right" }}>
                {quote.targetType === "family" ? "Family" : "Single"}
              </td>
            </tr>
            <tr>
              <td>Days left on your membership</td>
              <td style={{ textAlign: "right" }}>{quote.daysLeft}</td>
            </tr>
            <tr>
              <td>
                <strong>To pay today</strong>
              </td>
              <td style={{ textAlign: "right" }}>
                <strong>{free ? "Nothing" : `$${amount}`}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 12 }}>
          Your renewal date does not change.
        </p>
      </div>

      <label className="f" style={{ marginTop: 20 }} htmlFor="sw-email">
        Your email
      </label>
      <input id="sw-email" name="adult_email" type="email" required placeholder="name@email.com" />

      <label className="f" htmlFor="sw-name">
        Your name
      </label>
      <input
        id="sw-name"
        name="adult_name"
        type="text"
        required
        defaultValue={quote.name}
        placeholder="Full name as on your Citizenship ID"
      />

      <div className="two">
        <div>
          <label className="f" htmlFor="sw-gender">
            Sex
          </label>
          <select id="sw-gender" name="adult_gender" defaultValue="">
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="f" htmlFor="sw-dob2">
            Date of birth
          </label>
          <input id="sw-dob2" name="adult_dob" type="date" required />
        </div>
      </div>

      <label className="f" htmlFor="sw-cid2">
        Citizenship ID (CID)
      </label>
      <input
        id="sw-cid2"
        name="adult_cid"
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
          <label className="f" htmlFor="sw-phone">
            Phone number
          </label>
          <input id="sw-phone" name="phone" type="text" placeholder="04xx xxx xxx" />
        </div>
        <div>
          <label className="f" htmlFor="sw-suburb">
            Suburb
          </label>
          <input id="sw-suburb" name="suburb" type="text" placeholder="e.g. Gungahlin" />
        </div>
      </div>

      {quote.targetType === "family" && (
        <>
          {extraAdults.map((key, i) => (
            <div key={key} className="household-block">
              <div className="household-block-head">
                <strong>Adult {i + 2}</strong>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setExtraAdults((a) => a.filter((k) => k !== key))}
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
            onClick={() => setExtraAdults((a) => [...a, crypto.randomUUID()])}
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
                onClick={() => setChildren((c) => c.filter((k) => k !== key))}
                aria-label="Remove child"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setChildren((c) => [...c, crypto.randomUUID()])}
          >
            + Add a child
          </button>
        </>
      )}

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} disabled={pending}>
        {pending ? "Please wait…" : free ? "Confirm change" : `Pay $${amount} and change`}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ width: "100%", marginTop: 8 }}
        onClick={reset}
      >
        Start over
      </button>
    </form>
  );
}
