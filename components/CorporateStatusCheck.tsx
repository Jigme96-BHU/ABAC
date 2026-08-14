"use client";

import { useState, useTransition } from "react";
import { checkCorporateStatus } from "@/app/join/actions";
import { formatDate } from "@/lib/member-number";

const TIER_LABELS: Record<string, string> = {
  diamond: "Diamond",
  platinum: "Platinum",
  gold: "Gold",
};

const STATUS_MESSAGES: Record<string, { label: string; message: string }> = {
  pending: {
    label: "🔄 Under review",
    message:
      "Your application is under review by the committee. You'll receive an email with next steps within 3 working days.",
  },
  approved: {
    label: "✓ Approved",
    message: "Your application has been approved! You'll receive a payment link via email to complete your sponsorship.",
  },
  active: {
    label: "✓ Active",
    message: "Your sponsorship is active. Thank you for supporting ABAC!",
  },
  inactive: {
    label: "⏱ Expired",
    message:
      "Your sponsorship has expired. Visit the Corporate Membership form below to renew your sponsorship.",
  },
  rejected: {
    label: "✗ Not approved",
    message: "Unfortunately, your application was not approved. Please contact bhutancanberra@gmail.com for details.",
  },
};

export default function CorporateStatusCheck() {
  const [showForm, setShowForm] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [abn, setAbn] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<any>(null);
  const [searching, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await checkCorporateStatus(businessName, abn, email);
      // Check if membership has expired
      if (res.found && res.status === "active" && res.expires_at) {
        const expiryDate = new Date(res.expires_at);
        if (expiryDate < new Date()) {
          res.status = "inactive";
        }
      }
      setResult(res);
    });
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          width: "100%",
          padding: "6px 12px",
          background: "transparent",
          border: "2px solid #C9A227",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 400,
          color: "var(--ink-soft)",
          marginBottom: 16,
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ flex: 1, textAlign: "center" }}>Corporate Membership Status</span>
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink-soft)", minWidth: 20 }}>{showForm ? "−" : "+"}</span>
      </button>

      {showForm && (
        <div style={{ marginBottom: 20, padding: 16, background: "#fafafa", borderRadius: 8 }}>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 16, marginTop: 0 }}>
            Enter your business details to see your sponsorship status.
          </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <label className="f" htmlFor="corp-name">
          Business name *
        </label>
        <input
          id="corp-name"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="As registered in your application"
          required
        />

        <label className="f" htmlFor="corp-abn">
          ABN *
        </label>
        <input
          id="corp-abn"
          type="text"
          value={abn}
          onChange={(e) => setAbn(e.target.value)}
          placeholder="11 digits, no spaces"
          maxLength={11}
          required
        />

        <label className="f" htmlFor="corp-email">
          Contact email *
        </label>
        <input
          id="corp-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="As registered in your application"
          required
        />

        <button type="submit" className="btn btn-primary" disabled={searching} style={{ marginTop: 8 }}>
          {searching ? "Checking…" : "Check status"}
        </button>
        </form>
        </div>
      )}

      {result && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            border: `1px solid ${result.found ? "var(--line)" : "#e88"}`,
            background: result.found ? "#f5f5f5" : "#fee",
          }}
        >
          {!result.found ? (
            <p style={{ color: "#c33", margin: 0 }}>
              {result.error || "No sponsorship found with those details."}
            </p>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ink-soft)" }}>
                  Sponsorship status
                </p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
                  {STATUS_MESSAGES[result.status]?.label || result.status}
                </p>
              </div>

              {result.tier && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ink-soft)" }}>
                    Sponsorship tier
                  </p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>
                    {TIER_LABELS[result.tier]}
                  </p>
                </div>
              )}

              {result.joined_at && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ink-soft)" }}>
                    Sponsorship started
                  </p>
                  <p style={{ margin: 0, fontSize: 16 }}>{formatDate(result.joined_at)}</p>
                </div>
              )}

              {result.expires_at && result.status === "active" && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ink-soft)" }}>
                    Sponsorship expires
                  </p>
                  <p style={{ margin: 0, fontSize: 16 }}>{formatDate(result.expires_at)}</p>
                </div>
              )}

              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  {STATUS_MESSAGES[result.status]?.message || ""}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
