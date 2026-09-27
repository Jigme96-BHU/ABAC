import { NextResponse } from "next/server";
import { stripeDonations } from "@/lib/stripe";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { donationThankYouEmail, donationNotifyEmail } from "@/lib/emails/donation";

const COMMITTEE_EMAIL = "bhutancanberra@gmail.com";

const METHOD_LABELS: Record<string, string> = {
  card: "Card (online)",
  klarna: "Klarna (online)",
  zip: "Zip (online)",
  link: "Link (online)",
  au_becs_debit: "Bank debit (online)",
};

/** Webhook for the separate donations Stripe account — it has its own
 *  signing secret, so it can't share /api/stripe/webhook with memberships. */
export async function POST(request: Request) {
  const body = await request.text(); // raw bytes — signature verification fails on parsed JSON
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_DONATIONS_WEBHOOK_SECRET;

  if (!stripeDonations || !signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    event = stripeDonations.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid" && session.amount_total !== null) {
      const amount = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
        session.amount_total / 100,
      );
      const name = session.customer_details?.name ?? null;
      const email = session.customer_details?.email ?? null;

      try {
        const notify = donationNotifyEmail({ name, email, amount });
        await mailer.sendMail({
          from: MAIL_FROM,
          to: COMMITTEE_EMAIL,
          replyTo: email ?? undefined,
          ...notify,
        });
      } catch (err) {
        console.error("donation notify email failed:", err);
      }

      if (email) {
        const date = new Intl.DateTimeFormat("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Australia/Sydney",
        }).format(new Date(session.created * 1000));

        // The PaymentIntent id is what the committee can search for in the
        // Stripe dashboard; the charge tells us how the donor actually paid.
        const reference =
          typeof session.payment_intent === "string" ? session.payment_intent : session.id;
        let paymentMethod = "Online (Stripe)";
        try {
          if (typeof session.payment_intent === "string") {
            const pi = await stripeDonations.paymentIntents.retrieve(session.payment_intent, {
              expand: ["latest_charge"],
            });
            const charge = typeof pi.latest_charge === "object" ? pi.latest_charge : null;
            const type = charge?.payment_method_details?.type;
            if (type) paymentMethod = METHOD_LABELS[type] ?? "Online (Stripe)";
          }
        } catch (err) {
          console.error("donation payment method lookup failed:", err);
        }

        try {
          await mailer.sendMail({
            from: MAIL_FROM,
            to: email,
            replyTo: COMMITTEE_EMAIL,
            ...donationThankYouEmail({ name, amount, date, paymentMethod, reference }),
          });
        } catch (err) {
          console.error("donation thank-you email failed:", err);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
