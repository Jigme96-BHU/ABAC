"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  submitCorporateApplication,
  createCorporateCertificateUploadUrl,
  createCorporateLogoUploadUrl,
} from "@/app/join/actions";
import { createClient } from "@/lib/supabase/client";
import { CORPORATE_TIERS, type CorporateTier } from "@/lib/corporate-tiers";

/** Fixed positions rather than Math.random(): the server and client must
 *  render identical markup or React throws a hydration mismatch. The illusion
 *  of randomness comes from the staggered delays and mismatched durations —
 *  no two stars are ever lit at the same moment, and the cycle lengths never
 *  line up, so the glitter never visibly repeats. */
const TIER_SPARKS = [
  { x: 6, y: 24, size: 5, delay: 0.0, dur: 2.3 },
  { x: 14, y: 68, size: 3, delay: 1.4, dur: 1.9 },
  { x: 21, y: 12, size: 4, delay: 2.7, dur: 2.6 },
  { x: 27, y: 82, size: 5, delay: 0.6, dur: 2.1 },
  { x: 33, y: 41, size: 3, delay: 3.3, dur: 2.8 },
  { x: 39, y: 74, size: 4, delay: 1.9, dur: 1.7 },
  { x: 45, y: 18, size: 6, delay: 0.9, dur: 2.5 },
  { x: 51, y: 57, size: 3, delay: 2.2, dur: 2.0 },
  { x: 57, y: 88, size: 4, delay: 3.8, dur: 2.4 },
  { x: 63, y: 29, size: 5, delay: 0.3, dur: 2.9 },
  { x: 69, y: 63, size: 3, delay: 1.6, dur: 1.8 },
  { x: 74, y: 15, size: 4, delay: 2.9, dur: 2.2 },
  { x: 80, y: 79, size: 5, delay: 1.1, dur: 2.7 },
  { x: 86, y: 36, size: 3, delay: 3.5, dur: 1.9 },
  { x: 91, y: 70, size: 4, delay: 0.5, dur: 2.4 },
  { x: 95, y: 22, size: 5, delay: 2.4, dur: 2.1 },
  { x: 10, y: 47, size: 4, delay: 4.1, dur: 2.6 },
  { x: 47, y: 92, size: 3, delay: 1.2, dur: 2.0 },
];

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
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setUploadStatus(null);
    startTransition(async () => {
      // Both files go straight to Storage from the browser — a real
      // scanned certificate or a high-res logo can exceed Next.js's 1MB
      // default server-action request-body limit, which this form
      // (having no try/catch around the action call) previously failed on
      // silently: no error shown, nothing submitted.
      const browserSupabase = createClient();

      const certificate = formData.get("business_certificate");
      if (certificate instanceof File && certificate.size > 0) {
        setUploadStatus("Uploading certificate…");
        const uploadUrl = await createCorporateCertificateUploadUrl(certificate.type);
        if (uploadUrl.error || !uploadUrl.path || !uploadUrl.token) {
          setError(uploadUrl.error ?? "Couldn't prepare the certificate for upload.");
          setUploadStatus(null);
          return;
        }
        const { error: putError } = await browserSupabase.storage
          .from("corporate-documents")
          .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, certificate);
        if (putError) {
          setError(`Couldn't upload the certificate: ${putError.message}`);
          setUploadStatus(null);
          return;
        }
        formData.set("certificate_path", uploadUrl.path);
      }
      formData.delete("business_certificate");

      const logo = formData.get("logo");
      if (logo instanceof File && logo.size > 0) {
        setUploadStatus("Uploading logo…");
        const uploadUrl = await createCorporateLogoUploadUrl(logo.type);
        if (uploadUrl.error || !uploadUrl.path || !uploadUrl.token) {
          setError(uploadUrl.error ?? "Couldn't prepare the logo for upload.");
          setUploadStatus(null);
          return;
        }
        const { error: putError } = await browserSupabase.storage
          .from("corporate-logos")
          .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, logo);
        if (putError) {
          setError(`Couldn't upload the logo: ${putError.message}`);
          setUploadStatus(null);
          return;
        }
        formData.set("logo_path", uploadUrl.path);
      }
      formData.delete("logo");
      setUploadStatus(null);

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
            aria-pressed={tier === t.value}
            className={`btn btn-sm tier-btn tier-${t.value}${tier === t.value ? " is-selected" : ""}`}
            onClick={() => setTier(t.value)}
          >
            <span className="tier-sparks" aria-hidden="true">
              {TIER_SPARKS.map((sp, i) => (
                <i
                  key={i}
                  className="spark"
                  style={{
                    left: `${sp.x}%`,
                    top: `${sp.y}%`,
                    width: sp.size,
                    height: sp.size,
                    animationDelay: `${sp.delay}s`,
                    animationDuration: `${sp.dur}s`,
                  }}
                />
              ))}
            </span>
            {/* Wrapped so the label paints above the glitter layers — a bare
                text node can't be given a stacking order. */}
            <span className="tier-label">{t.label}</span>
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
              Business phone / mobile
            </label>
            <input
              id="c-phone"
              name="phone"
              type="tel"
              required
              placeholder="02 xxxx xxxx or +61 4xx xxx xxx"
            />
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

        <label className="f" htmlFor="c-certificate">
          Business Certificate <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(optional, PDF/JPG/PNG)</span>
        </label>
        <input id="c-certificate" name="business_certificate" type="file" accept="application/pdf,image/jpeg,image/png" />

        <label className="f" htmlFor="c-logo">
          Business Logo{" "}
          <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>
            (optional, PNG/JPG/WebP/SVG/GIF — shown on Our Partners once your sponsorship is active)
          </span>
        </label>
        <input id="c-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" />

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
          {uploadStatus ?? (pending ? "Please wait…" : "Submit corporate application")}
        </button>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, textAlign: "center" }}>
          Applications are reviewed by the committee within 3 working days. You&apos;ll get a
          payment link by email once approved.
        </p>
      </form>
    </div>
  );
}
