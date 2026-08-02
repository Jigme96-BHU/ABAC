"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitCorporateApplication } from "@/app/join/actions";
import { CORPORATE_TIERS, type CorporateTier } from "@/lib/corporate-tiers";

const TIER_TAGLINE: Record<CorporateTier, string> = {
  diamond: "Principal community partner",
  platinum: "Featured community partner",
  gold: "Community supporter",
};

const TIER_BENEFITS: Record<CorporateTier, string[]> = {
  diamond: [
    "Premier logo placement across the website, event materials, and signage",
    "Speaking or booth opportunity at ABAC's flagship annual event",
    "Named mention in every quarterly newsletter",
    "Priority acknowledgement at the AGM",
    "Everything included in Platinum",
  ],
  platinum: [
    "Logo placement at major community events (Losar, National Day)",
    "Dedicated mention in the ABAC newsletter",
    "Two social media features per year",
    "Everything included in Gold",
  ],
  gold: [
    "Listed as a Gold Corporate Partner on the ABAC website",
    "Name included in printed event materials",
    "One social media feature per year",
  ],
};

export default function CorporateForm() {
  const [tier, setTier] = useState<CorporateTier>("gold");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await submitCorporateApplication(formData);
      if (result.ok) {
        setSent(true);
        form.reset();
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  if (sent) {
    return (
      <div className="notice ok">
        <strong>Application received.</strong> Thank you for your interest — the committee
        reviews applications within 3 working days, and you&apos;ll get an email confirming
        we&apos;ve received it.
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>
        A membership category for community businesses and any business entity that wants to
        support and partner with ABAC&apos;s cultural, welfare, and community programs. Open
        beyond the Bhutanese community. Choose a tier below to see its benefits and apply.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {CORPORATE_TIERS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={tier === t.value ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            onClick={() => setTier(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pay-box" style={{ marginBottom: 20 }}>
        <div className="pay-head">
          <strong>{CORPORATE_TIERS.find((t) => t.value === tier)?.label} tier</strong>
          <span className="fee">Fee to be confirmed</span>
        </div>
        <p style={{ margin: "0 0 10px", color: "var(--ink-soft)", fontSize: 13 }}>
          {TIER_TAGLINE[tier]}
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5 }}>
          {TIER_BENEFITS[tier].map((b) => (
            <li key={b} style={{ marginBottom: 6 }}>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={submit}>
        <input type="hidden" name="tier" value={tier} />

        <label className="f" style={{ marginTop: 0 }} htmlFor="c-business">
          Business / organisation name
        </label>
        <input id="c-business" name="business_name" type="text" required placeholder="e.g. Snow Lion Trading Pty Ltd" />

        <div className="two">
          <div>
            <label className="f" htmlFor="c-abn">
              ABN <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(if applicable)</span>
            </label>
            <input id="c-abn" name="abn" type="text" placeholder="11 digit ABN" />
          </div>
          <div>
            <label className="f" htmlFor="c-website">
              Website <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(optional)</span>
            </label>
            <input id="c-website" name="website" type="url" placeholder="https://" />
          </div>
        </div>

        <label className="f" htmlFor="c-contact">
          Contact person — full name
        </label>
        <input id="c-contact" name="contact_name" type="text" required />

        <div className="two">
          <div>
            <label className="f" htmlFor="c-role">
              Position / role
            </label>
            <input id="c-role" name="contact_role" type="text" placeholder="e.g. Director, Marketing Manager" />
          </div>
          <div>
            <label className="f" htmlFor="c-phone">
              Business phone
            </label>
            <input id="c-phone" name="phone" type="tel" required placeholder="02 xxxx xxxx" />
          </div>
        </div>

        <label className="f" htmlFor="c-email">
          Business email
        </label>
        <input id="c-email" name="email" type="email" required placeholder="name@business.com" />

        <label className="f" htmlFor="c-address">
          Business address
        </label>
        <input id="c-address" name="address" type="text" placeholder="Street, suburb, ACT" />

        <label className="f" htmlFor="c-notes">
          Anything you&apos;d like ABAC to know? <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(optional)</span>
        </label>
        <textarea id="c-notes" name="notes" rows={3} placeholder="e.g. sponsorship ideas, event interests" />

        <label className="consent" style={{ marginTop: 20 }}>
          <input type="checkbox" required />I confirm these details are accurate and agree to
          the <a href="/privacy">privacy statement</a>.
        </label>

        {error && (
          <div className="notice warn" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={pending}>
          {pending ? "Please wait…" : "Submit corporate application"}
        </button>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, textAlign: "center" }}>
          Applications are reviewed by the committee within 3 working days. You&apos;ll get a
          payment link by email once approved.
        </p>
      </form>
    </div>
  );
}
