"use client";

import { useState, useTransition, type FormEvent } from "react";
import { checkCorporateStatus, type CorporateStatusResult } from "@/app/join/actions";
import { formatDate } from "@/lib/member-number";

const TIER_LABELS: Record<string, string> = {
  diamond: "Diamond",
  platinum: "Platinum",
  gold: "Gold",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Under review",
  approved: "Approved — awaiting payment",
  active: "Active",
  inactive: "Expired",
  rejected: "Not approved",
};

const STATUS_MESSAGE: Record<string, string> = {
  pending: "Your application is under review by the committee. You'll receive an email with next steps within 3 working days.",
  approved: "Your application has been approved — you'll receive a payment link by email to complete your sponsorship.",
  active: "Your sponsorship is active. Thank you for supporting ABAC!",
  inactive: "Your sponsorship has expired. Use the Corporate Membership form below to renew.",
  rejected: "Unfortunately, your application was not approved. Please contact bhutancanberra@gmail.com for details.",
};

/** Same collapsible-button pattern as StatusCheckForm.tsx (Community
 *  membership) — kept visually consistent across both status checks on
 *  /join rather than each having its own bespoke look. */
export default function CorporateStatusCheck() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CorporateStatusResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const businessName = String(formData.get("business_name") ?? "");
    const abn = String(formData.get("abn") ?? "");
    const email = String(formData.get("email") ?? "");
    startTransition(async () => {
      const res = await checkCorporateStatus(businessName, abn, email);
      // A sponsorship whose expiry date has passed is treated as expired
      // even if the stored status still says "active" — same client-side
      // freshness check the community StatusCheckForm doesn't need, since
      // that lookup's effective_status is already computed server-side.
      if (res.found && res.status === "active" && res.expires_at && new Date(res.expires_at) < new Date()) {
        setResult({ ...res, status: "inactive" });
      } else {
        setResult(res);
      }
    });
  }

  return (
    <div id="corporate-status">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: open ? 14 : 0 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Already a corporate member? Check my status
      </button>

      {open && (
        <div className="pay-box">
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 4 }}>
            No login needed — enter your business name, ABN, and contact email as registered in
            your application. All three must match.
          </p>

          <form onSubmit={submit}>
            <label className="f" htmlFor="corp-name">
              Business name
            </label>
            <input id="corp-name" name="business_name" type="text" required placeholder="As registered in your application" />

            <label className="f" htmlFor="corp-abn">
              ABN
            </label>
            <input id="corp-abn" name="abn" type="text" required maxLength={11} placeholder="11 digits, no spaces" />

            <label className="f" htmlFor="corp-email">
              Contact email
            </label>
            <input id="corp-email" name="email" type="email" required placeholder="As registered in your application" />

            <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} disabled={pending}>
              {pending ? "Checking…" : "Check status"}
            </button>
          </form>

          {result && !result.found && (
            <div className="notice warn" style={{ marginTop: 16 }}>
              {result.error || "No sponsorship found with those details."}
            </div>
          )}

          {result?.found && result.status && (
            <div className="status-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 17 }}>
                  {result.tier ? TIER_LABELS[result.tier] : "Corporate"}
                </strong>
                <span className={`badge ${result.status === "active" ? "active" : "due"}`}>
                  {STATUS_LABEL[result.status]}
                </span>
              </div>
              <table>
                <tbody>
                  <tr>
                    <td>Status</td>
                    <td>{STATUS_LABEL[result.status]}</td>
                  </tr>
                  {result.tier && (
                    <tr>
                      <td>Tier</td>
                      <td>{TIER_LABELS[result.tier]}</td>
                    </tr>
                  )}
                  {result.joined_at && (
                    <tr>
                      <td>Sponsorship started</td>
                      <td>{formatDate(result.joined_at)}</td>
                    </tr>
                  )}
                  {result.expires_at && result.status === "active" && (
                    <tr>
                      <td>Valid until</td>
                      <td>{formatDate(result.expires_at)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p style={{ margin: "12px 0 0", paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                {STATUS_MESSAGE[result.status]}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
