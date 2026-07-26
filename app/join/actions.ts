"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { formatMemberNo, formatDate } from "@/lib/member-number";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { welcomeEmail } from "@/lib/emails/welcome";

const FEE_PER_ADULT_CENTS = 2000; // $20 AUD — confirmed by the committee 2026-07

function ageFrom(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export type SubmitResult = { error: string };

export async function submitMembership(formData: FormData): Promise<SubmitResult> {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const dob = String(formData.get("dob") ?? "");
  const cid = String(formData.get("cid") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const suburb = String(formData.get("suburb") ?? "").trim();

  if (!email || !name || !dob || !cid) {
    return { error: "Please fill in your email, name, date of birth, and CID." };
  }

  const age = ageFrom(dob);
  if (age < 0 || age > 130) {
    return { error: "That date of birth doesn't look right — please check it." };
  }

  const feeCents = age >= 18 ? FEE_PER_ADULT_CENTS : 0;
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4321";

  // The members table has no public SELECT or UPDATE policy — CID, DOB and
  // phone stay admin-only, by design (see 0003_members.sql). That means an
  // anonymous insert can never read its own row back via .select(), and can
  // never .update() it afterward either. So: generate the id ourselves, and
  // for the paid path, create the Stripe session *before* inserting, so the
  // session id is already part of the one and only INSERT — no read-back,
  // no update, ever required.
  const id = crypto.randomUUID();

  // Under 18 — no payment needed, membership is active immediately.
  if (feeCents === 0) {
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("members").insert({
      id,
      email,
      name,
      gender: gender || null,
      date_of_birth: dob,
      cid,
      phone: phone || null,
      suburb: suburb || null,
      fee_cents: 0,
      status: "active",
      joined_at: new Date().toISOString(),
      expires_at: expiresAt,
    });
    if (error) return { error: error.message };

    // Best-effort — the RPC bypasses RLS (SECURITY DEFINER) to fetch the
    // number this brand-new row was just assigned; email/name are already
    // in hand from the form itself. A mail hiccup shouldn't block joining.
    try {
      const { data } = await supabase
        .rpc("get_membership_confirmation", { p_session_id: null, p_member_id: id })
        .returns<{ status: string; member_no: number; member_year: number }[]>()
        .maybeSingle();
      if (data) {
        const { subject, text, html } = welcomeEmail({
          name,
          memberNo: formatMemberNo(data.member_no, data.member_year),
          fee: "Free — under 18",
          validUntil: formatDate(expiresAt),
        });
        await mailer.sendMail({ from: MAIL_FROM, to: email, subject, text, html });
      }
    } catch (err) {
      console.error("welcome email failed:", err);
    }

    // No Stripe session to identify this registration by — the success page
    // looks it up by the member's own row id instead.
    redirect(`${siteUrl}/join/success?member_id=${id}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: feeCents,
          product_data: { name: "ABAC annual membership (adult)" },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/join/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/join?canceled=1`,
    customer_email: email,
    metadata: { member_id: id },
  });

  if (!session.url) {
    return { error: "Couldn't start checkout — please try again." };
  }

  const { error } = await supabase.from("members").insert({
    id,
    email,
    name,
    gender: gender || null,
    date_of_birth: dob,
    cid,
    phone: phone || null,
    suburb: suburb || null,
    fee_cents: feeCents,
    status: "pending",
    stripe_checkout_session_id: session.id,
  });
  if (error) return { error: error.message };

  redirect(session.url);
}

// ---------------------------------------------------------------------------
// Check my status — no login, matching the original design. Both email and
// date of birth must match (see the SECURITY DEFINER function for why only
// low-sensitivity fields ever come back).
// ---------------------------------------------------------------------------

export type StatusResult =
  | { found: false }
  | { found: true; memberNo: string; status: "pending" | "active" | "expired"; expiresAt: string | null };

export async function checkMembershipStatus(formData: FormData): Promise<StatusResult> {
  const email = String(formData.get("email") ?? "").trim();
  const dob = String(formData.get("dob") ?? "");
  if (!email || !dob) return { found: false };

  const supabase = await createClient();
  const { data } = await supabase
    .rpc("check_membership_status", { p_email: email, p_dob: dob })
    .returns<{ member_no: number; member_year: number; effective_status: string; expires_at: string | null }[]>()
    .maybeSingle();

  if (!data) return { found: false };

  return {
    found: true,
    memberNo: formatMemberNo(data.member_no, data.member_year),
    status: data.effective_status as "pending" | "active" | "expired",
    expiresAt: data.expires_at,
  };
}
