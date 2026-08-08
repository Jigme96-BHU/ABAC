import type { Metadata } from "next";
import Link from "next/link";
import JoinForm from "@/components/JoinForm";
import StatusCheckForm from "@/components/StatusCheckForm";
import MembershipRegistration from "@/components/MembershipRegistration";
import CorporateForm from "@/components/CorporateForm";
import SwitchCategoryForm from "@/components/SwitchCategoryForm";

export const metadata: Metadata = {
  title: "Join",
  description:
    "Become a member of the Australia–Bhutan Association of Canberra. Membership supports welfare, culture and community programs across the ACT.",
};

const FEE_PER_ADULT = 20; // confirmed by the committee 2026-07 — keep in sync with app/join/actions.ts
const FAMILY_FEE = 30; // Membership Policy §3.4.1 — keep in sync with app/join/actions.ts

export default function JoinPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card">
            <span className="dz-eyebrow">འཐུས་མི་ཐོ་བཀོད།</span>
            <h2>Membership registration</h2>
            <p className="form-sub">
              Register or renew in one step — your membership becomes active the moment
              payment succeeds, and your membership number stays with you for future renewals.
            </p>

            <MembershipRegistration
              community={
                <div>
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
                          <td>Single — one adult (18 and over)</td>
                          <td style={{ textAlign: "right" }}>${FEE_PER_ADULT.toFixed(0)} Annually</td>
                        </tr>
                        <tr>
                          <td>Single — child under 18</td>
                          <td style={{ textAlign: "right" }}>Free</td>
                        </tr>
                        <tr>
                          <td>Family — parent(s) + children under 18</td>
                          <td style={{ textAlign: "right" }}>${FAMILY_FEE.toFixed(0)} Annually</td>
                        </tr>
                      </tbody>
                    </table>
                    <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 12 }}>
                      Payment is processed by Stripe — card details never touch the ABAC website.
                    </p>
                  </div>

                  <details className="switch-box" style={{ marginTop: 24 }}>
                    <summary>
                      Already a member and want to change between Single and Family?
                    </summary>
                    <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "12px 0 4px" }}>
                      You keep your membership number and your existing renewal date. Moving up to
                      Family costs only the difference in rate for the days you have left; moving
                      down to Single costs nothing.
                    </p>
                    <SwitchCategoryForm />
                  </details>

                  <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 18 }}>
                    Looking for what membership includes?{" "}
                    <Link href="/#about">Read about the association</Link>.
                  </p>
                </div>
              }
              corporate={<CorporateForm />}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
