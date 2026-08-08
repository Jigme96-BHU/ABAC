import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { welcomeEmail } from "@/lib/emails/welcome";
import { corporateApprovedEmail } from "@/lib/emails/corporate-approved";
import { serviceRequestReceivedEmail } from "@/lib/emails/service-request-received";
import { formatMemberNo, formatDate } from "@/lib/member-number";
import { corporateTierLabel } from "@/lib/corporate-tiers";
import { serviceTypeLabel } from "@/lib/service-types";

type ActivationRow = {
  did_activate: boolean;
  notification_kind: "new" | "renewal" | "switch" | null;
  membership_type: "single" | "family" | null;
  is_dependent: boolean | null;
  household_id: string | null;
  member_id: string | null;
  email: string | null;
  name: string | null;
  member_no: number | null;
  member_year: number | null;
  fee_cents: number | null;
  expires_at: string | null;
};

type CorporateActivationRow = {
  did_activate: boolean;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  tier: string | null;
  fee_cents: number | null;
  expires_at: string | null;
};

type ServiceActivationRow = {
  did_activate: boolean;
  service_type: string | null;
  requester_name: string | null;
  email: string | null;
  fee_cents: number | null;
};

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

    if (session.metadata?.kind === "corporate") {
      const { data, error } = await supabase
        .rpc("activate_corporate_membership", { p_session_id: session.id })
        .returns<CorporateActivationRow[]>();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const rows: CorporateActivationRow[] = Array.isArray(data) ? data : [];
      const activated = rows.find((r) => r.did_activate);
      if (activated) {
        await sendCorporateApprovedEmail(activated);
      }
      return NextResponse.json({ received: true });
    }

    if (session.metadata?.kind === "service") {
      const { data, error } = await supabase
        .rpc("activate_service_request", { p_session_id: session.id })
        .returns<ServiceActivationRow[]>();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const rows: ServiceActivationRow[] = Array.isArray(data) ? data : [];
      const activated = rows.find((r) => r.did_activate);
      if (activated) {
        await sendServiceRequestReceivedEmail(activated);
      }
      return NextResponse.json({ received: true });
    }

    const { data, error } = await supabase
      .rpc("activate_membership_checkout", {
        p_session_id: session.id,
      })
      .returns<ActivationRow[]>();
    if (error) {
      // Returning 500 makes Stripe retry the webhook automatically.
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Only send email the first time this session actually activates a
    // membership — retried webhook deliveries return did_activate=false.
    const rows: ActivationRow[] = Array.isArray(data) ? data : [];
    const activated = rows.filter((r) => r.did_activate);
    if (activated.length > 0) {
      await sendMembershipEmails(activated);
    }
  }

  return NextResponse.json({ received: true });
}

/** Best-effort, same reasoning as sendMembershipEmails below — a mail
 *  hiccup must never fail the webhook and cause Stripe to retry an
 *  already-successful payment/activation. */
async function sendCorporateApprovedEmail(activation: CorporateActivationRow) {
  try {
    if (!activation.email || !activation.business_name || !activation.contact_name || !activation.tier) return;

    const { subject, text, html } = corporateApprovedEmail({
      businessName: activation.business_name,
      contactName: activation.contact_name,
      tier: corporateTierLabel(activation.tier),
      fee: `$${((activation.fee_cents ?? 0) / 100).toFixed(0)} AUD Annually`,
      validUntil: activation.expires_at ? formatDate(activation.expires_at) : "—",
    });
    await mailer.sendMail({ from: MAIL_FROM, to: activation.email, subject, text, html });
  } catch (err) {
    console.error("corporate approved email failed:", err);
  }
}

/** Best-effort, same reasoning as sendCorporateApprovedEmail above. */
async function sendServiceRequestReceivedEmail(activation: ServiceActivationRow) {
  try {
    if (!activation.email || !activation.requester_name || !activation.service_type) return;

    const { subject, text, html } = serviceRequestReceivedEmail({
      requesterName: activation.requester_name,
      serviceLabel: serviceTypeLabel(activation.service_type),
    });
    await mailer.sendMail({ from: MAIL_FROM, to: activation.email, subject, text, html });
  } catch (err) {
    console.error("service request email failed:", err);
  }
}

/** Best-effort — a mail delivery hiccup should never fail the webhook and
 *  cause Stripe to retry an already-successful payment/activation.
 *
 *  A Family checkout activates every household member at once (adults and
 *  dependent children alike). Only adults get their own email — dependents
 *  never have their own inbox, and are just listed by name inside each
 *  adult's email instead. A Single checkout activates exactly one (adult)
 *  row, so this sends exactly one email, same as before this feature. */
async function sendMembershipEmails(activated: ActivationRow[]) {
  const adults = activated.filter((r) => !r.is_dependent);
  const dependents = activated.filter((r) => r.is_dependent).map((r) => r.name ?? "").filter(Boolean);

  for (const adult of adults) {
    const otherAdults = adults
      .filter((r) => r.member_id !== adult.member_id)
      .map((r) => ({
        name: r.name ?? "",
        memberNo: r.member_no != null && r.member_year != null ? formatMemberNo(r.member_no, r.member_year) : "",
      }))
      .filter((h) => h.name);

    await sendOneEmail(adult, otherAdults, dependents);
  }
}

async function sendOneEmail(
  person: ActivationRow,
  otherAdults: { name: string; memberNo: string }[],
  dependents: string[]
) {
  try {
    if (!person.email || !person.name || person.member_no == null || person.member_year == null) return;

    const isFamily = person.membership_type === "family";
    const isSwitch = person.notification_kind === "switch";
    // A switch charges a prorated top-up, not an annual fee — quoting the
    // annual rate here would contradict what they were actually charged.
    const fee = isSwitch
      ? `$${((person.fee_cents ?? 0) / 100).toFixed(2)} AUD one-off (change of category)`
      : isFamily
        ? "$30 AUD Annually (family membership)"
        : `$${((person.fee_cents ?? 0) / 100).toFixed(0)} AUD Annually`;

    const { subject, text, html } = welcomeEmail({
      name: person.name,
      memberNo: formatMemberNo(person.member_no, person.member_year),
      fee,
      validUntil: person.expires_at ? formatDate(person.expires_at) : "—",
      kind: isSwitch ? "switch" : person.notification_kind === "renewal" ? "renewal" : "welcome",
      isFamily,
      household: otherAdults.length > 0 ? otherAdults : undefined,
      dependents: dependents.length > 0 ? dependents : undefined,
    });
    await mailer.sendMail({ from: MAIL_FROM, to: person.email, subject, text, html });
  } catch (err) {
    console.error("membership email failed:", err);
  }
}
