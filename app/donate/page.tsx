import type { Metadata } from "next";
import DonateForm from "@/components/DonateForm";
import { stripeDonations } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Donations to the Australia–Bhutan Association of Canberra fund welfare support and cultural programs for the Bhutanese community in the ACT.",
};

type Props = { searchParams: Promise<{ canceled?: string }> };

export default async function DonatePage({ searchParams }: Props) {
  const { canceled } = await searchParams;

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

            {canceled && (
              <div className="notice warn" style={{ marginBottom: 16 }}>
                Your donation was cancelled — nothing was charged.
              </div>
            )}

            {stripeDonations ? (
              <DonateForm />
            ) : (
              <div className="notice warn" style={{ marginTop: 16 }}>
                <strong>Online donations aren&apos;t live yet.</strong> To donate today, contact
                the committee at{" "}
                <a href="mailto:bhutancanberra@gmail.com">bhutancanberra@gmail.com</a> for
                bank transfer details.
              </div>
            )}

            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 14 }}>
              Payment is processed on Stripe&apos;s secure page and card details never touch the
              ABAC website. Receipts are acknowledgements of your gift — ABAC does not currently
              hold DGR status, so donations are not tax-deductible.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
