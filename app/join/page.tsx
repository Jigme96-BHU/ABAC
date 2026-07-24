import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Join",
  description:
    "Become a member of the Australia–Bhutan Association of Canberra. Membership supports welfare, culture and community programs across the ACT.",
};

/** Fee table from the prototype. NOT CONFIRMED by the committee — these
 *  amounts came from the mockup, not from ABAC. Verify before launch. */
const FEES = [
  { type: "Single", amount: "$20" },
  { type: "Couple", amount: "$25" },
  { type: "Family", amount: "$35" },
];

export default function JoinPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card">
            <span className="dz-eyebrow">འཐུས་མི་ཐོ་བཀོད</span>
            <h2>Member registration</h2>
            <p className="form-sub">
              Registration and payment will be one step — your membership becomes active the
              moment payment succeeds, and your membership number is emailed to you straight
              away.
            </p>

            {/* The prototype mocked a card form and a Stripe panel here. Both are
                deliberately absent: a form that looks like it takes card details
                but goes nowhere is worse than no form at all. Phase 2 replaces
                this block with a real Stripe Checkout redirect. */}
            <div className="notice warn">
              <strong>Membership sign-up isn&apos;t live yet.</strong> Online registration and
              payment are still being built. To join today, email{" "}
              <a href="mailto:bhutancanberra@gmail.com">bhutancanberra@gmail.com</a> and the
              committee will help you.
            </div>

            <div className="pay-box" style={{ marginTop: 24 }}>
              <div className="pay-head">
                <strong>Annual membership</strong>
              </div>
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th style={{ textAlign: "right" }}>Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {FEES.map((f) => (
                    <tr key={f.type}>
                      <td>{f.type}</td>
                      <td style={{ textAlign: "right" }}>{f.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 12 }}>
                Indicative only — fees are yet to be confirmed by the committee. When
                payments go live they will be processed by Stripe, and card details will
                never touch the ABAC website.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="block alt" id="status">
        <div className="wrap">
          <div className="form-card">
            <h2 style={{ fontSize: 22 }}>Check my status</h2>
            <p className="form-sub">
              Once the member database is live you&apos;ll be able to look up your membership
              number, type and expiry date here — no login needed.
            </p>
            <div className="notice warn">
              Not available yet. Email{" "}
              <a href="mailto:bhutancanberra@gmail.com">bhutancanberra@gmail.com</a> to
              confirm your membership status.
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
