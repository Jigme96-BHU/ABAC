import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Welfare assistance, embassy liaison and travel-document help for active members of the Australia–Bhutan Association of Canberra.",
};

export default function ServicesPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card">
            <span className="dz-eyebrow">ཞབས་ཏོག་གི་དོན་ལུ་ཞུ་བ།</span>
            <h2>Service request</h2>
            <p className="form-sub">
              Support services — welfare assistance, embassy liaison, travel-document help —
              are available to active members.
            </p>

            {/* The prototype's "signed in" state collected a passport number behind
                a sign-in button that performed no authentication. That form stays
                out until real auth exists — see HANDOVER.md. */}
            <div className="notice warn">
              <strong>Online service requests aren&apos;t available yet.</strong> This form
              needs member sign-in before it can collect anything, since requests include
              sensitive personal details.
            </div>

            <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "18px 0" }}>
              In the meantime, contact the committee directly and they will help you with:
            </p>

            <ul style={{ fontSize: 14, color: "var(--ink-soft)", paddingLeft: 20, lineHeight: 2 }}>
              <li>Welfare and hardship support</li>
              <li>Embassy liaison assistance</li>
              <li>Travel document help</li>
              <li>Bereavement support</li>
            </ul>

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <Link className="btn btn-primary" href="/contact">
                Email the committee
              </Link>
              <Link className="btn btn-ghost" href="/join">
                Become a member
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
