import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { welcomeEmail } from "@/lib/emails/welcome";
import { formatMemberNo, formatDate } from "@/lib/member-number";

/** Stripe calls this after a payment — never the browser redirect back to
 *  /join/success, which can be forged or simply lost if someone closes the
 *  tab mid-payment. The signature check below is what proves a request
 *  genuinely came from Stripe. */
export async function POST(request: Request) {
  const body = await request.text(); // raw bytes — signature verification fails on parsed JSON
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const supabase = await createClient();
    const { data: activated, error } = await supabase.rpc("activate_membership", {
      p_session_id: session.id,
    });
    if (error) {
      // Returning 500 makes Stripe retry the webhook automatically.
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Only send the welcome email the first time this session actually
    // activates a membership — activate_membership() is a no-op on a retry
    // delivery (Stripe does retry), so this naturally sends exactly once.
    if (activated) {
      await sendWelcomeEmail(session.id);
    }
  }

  return NextResponse.json({ received: true });
}

/** Best-effort — a mail delivery hiccup should never fail the webhook and
 *  cause Stripe to retry an already-successful payment/activation. */
async function sendWelcomeEmail(sessionId: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .rpc("get_member_for_notification", { p_session_id: sessionId })
      .returns<
        {
          email: string;
          name: string;
          member_no: number;
          member_year: number;
          fee_cents: number;
          expires_at: string | null;
        }[]
      >()
      .maybeSingle();
    if (!data) return;

    const { subject, text, html } = welcomeEmail({
      name: data.name,
      memberNo: formatMemberNo(data.member_no, data.member_year),
      fee: `$${(data.fee_cents / 100).toFixed(0)} AUD / year`,
      validUntil: data.expires_at ? formatDate(data.expires_at) : "—",
    });
    await mailer.sendMail({ from: MAIL_FROM, to: data.email, subject, text, html });
  } catch (err) {
    console.error("welcome email failed:", err);
  }
}
