import type { Metadata } from "next";
import Link from "next/link";
import { stripeDonations } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ session_id?: string }> };

/** Checks the session with Stripe rather than trusting the redirect, so a
 *  hand-typed URL can't show a "thank you" for a payment that never happened. */
export default async function DonateSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  let paidCents: number | null = null;
  if (session_id && stripeDonations) {
    try {
      const session = await stripeDonations.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") paidCents = session.amount_total;
    } catch {
      paidCents = null;
    }
  }

  const paid = paidCents !== null;
  const amount = paidCents !== null
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(paidCents / 100)
    : null;

  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card" style={{ textAlign: "center" }}>
            <h2>{paid ? "Thank you!" : "We couldn't confirm that donation"}</h2>
            <p className={paid ? "notice ok" : "notice warn"} style={{ marginTop: 16 }}>
              {paid
                ? `Your donation of ${amount} has been received. Thank you for supporting the Bhutanese community in Canberra.`
                : "If you completed a payment, email bhutancanberra@gmail.com and we'll confirm it."}
            </p>
            <Link className="btn btn-ghost" style={{ marginTop: 20 }} href="/">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
