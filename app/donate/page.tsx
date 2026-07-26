import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Donations to the Australia–Bhutan Association of Canberra fund welfare support and cultural programs for the Bhutanese community in the ACT.",
};

const AMOUNTS = ["$10", "$25", "$50", "$100"];

export default function DonatePage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card">
            <span className="dz-eyebrow">ཕན་བདེའི་ཞལ་འདེབས།</span>
            <h2>Donate</h2>
            <p className="form-sub">
              Donations are separate from membership and fund welfare support and cultural
              programs. You don&apos;t need an account.
            </p>

            {/* The prototype rendered a fake "donate.stripe.com" panel with a card
                line. Removed — see the note in app/join/page.tsx. Phase 2 makes
                these buttons create a real Stripe Checkout session. */}
            <div className="id-pills" aria-hidden>
              {AMOUNTS.map((a) => (
                <span className="id-pill" key={a}>
                  {a}
                </span>
              ))}
            </div>

            <div className="notice warn" style={{ marginTop: 16 }}>
              <strong>Online donations aren&apos;t live yet.</strong> To donate today, contact
              the committee at{" "}
              <a href="mailto:bhutancanberra@gmail.com">bhutancanberra@gmail.com</a> for
              bank transfer details.
            </div>

            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 14 }}>
              When online giving launches, payment will be processed on Stripe&apos;s secure
              page and card details will never touch the ABAC website. Receipts are
              acknowledgements of your gift — ABAC does not currently hold DGR status, so
              donations are not tax-deductible.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
