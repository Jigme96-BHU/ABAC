import type { Metadata } from "next";
import Link from "next/link";
import JoinForm from "@/components/JoinForm";
import StatusCheckForm from "@/components/StatusCheckForm";

export const metadata: Metadata = {
  title: "Join",
  description:
    "Become a member of the Australia–Bhutan Association of Canberra. Membership supports welfare, culture and community programs across the ACT.",
};

const FEE_PER_ADULT = 20; // confirmed by the committee 2026-07 — keep in sync with app/join/actions.ts

export default function JoinPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card">
            <span className="dz-eyebrow">འཐུས་མི་ཐོ་བཀོད།</span>
            <h2>Member registration</h2>
            <p className="form-sub">
              Registration and payment are one step — your membership becomes active the
              moment payment succeeds, and your membership number is emailed to you straight
              away.
            </p>

            <StatusCheckForm />

            <div style={{ marginTop: 24 }}>
              <JoinForm />
            </div>

            <div className="pay-box" style={{ marginTop: 24 }}>
              <div className="pay-head">
                <strong>Annual membership</strong>
              </div>
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>Who</th>
                    <th style={{ textAlign: "right" }}>Fee</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Adults (18 and over)</td>
                    <td style={{ textAlign: "right" }}>${FEE_PER_ADULT.toFixed(0)} / year</td>
                  </tr>
                  <tr>
                    <td>Children under 18</td>
                    <td style={{ textAlign: "right" }}>Free</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 12 }}>
                Payment is processed by Stripe — card details never touch the ABAC website.
              </p>
            </div>

            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 18 }}>
              Looking for what membership includes?{" "}
              <Link href="/#about">Read about the association</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
