"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { formatMemberNo, formatDate } from "@/lib/member-number";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { welcomeEmail } from "@/lib/emails/welcome";
import { corporateApplicationReceivedEmail } from "@/lib/emails/corporate-application-received";
import { corporateNotifyEmail } from "@/lib/emails/corporate-notify";
import { ageFrom, isValidCid } from "@/lib/validation";

const FEE_PER_ADULT_CENTS = 2000; // $20 AUD — confirmed by the committee 2026-07
const FAMILY_FEE_CENTS = 3000; // $30 AUD flat, whole household — Membership Policy §3.4.1

const COMMITTEE_EMAIL = "bhutancanberra@gmail.com";

type RegistrationRow = {
  member_id: string;
  is_renewal: boolean;
  status: string;
  member_no: number;
  member_year: number;
  expires_at: string | null;
};

type FamilyMemberInput = {
  member_id: string;
  email: string;
  name: string;
  gender: string | null;
  dob: string;
  cid: string;
  phone: string | null;
  suburb: string | null;
};

export type SubmitResult = { error: string };

export async function submitMembership(formData: FormData): Promise<SubmitResult> {
  const category = String(formData.get("category") ?? "single");
  if (category === "family") return submitFamilyMembership(formData);

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
  if (!isValidCid(cid)) {
    return { error: "CID must be exactly 11 digits." };
  }

  const age = ageFrom(dob);
  if (age < 0 || age > 130) {
    return { error: "That date of birth doesn't look right — please check it." };
  }

  const feeCents = age >= 18 ? FEE_PER_ADULT_CENTS : 0;
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4321";

  // The members table has no public SELECT or UPDATE policy — CID, DOB and
  // phone stay admin-only, by design. The SECURITY DEFINER RPC below handles
  // the narrow server-side write path: first registration creates a permanent
  // membership number; later submissions with the same DOB + CID renew
  // that same member instead of assigning a new number.
  const id = crypto.randomUUID();

  // Under 18 — no payment needed, membership is active immediately.
  if (feeCents === 0) {
    const { data, error } = await supabase
      .rpc("submit_membership_registration", {
        p_member_id: id,
        p_email: email,
        p_name: name,
        p_gender: gender || null,
        p_dob: dob,
        p_cid: cid,
        p_phone: phone || null,
        p_suburb: suburb || null,
        p_fee_cents: 0,
        p_session_id: null,
      })
      .returns<RegistrationRow[]>()
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Registration did not complete — please try again." };

    // Best-effort — a mail hiccup shouldn't block a free membership or
    // renewal. The RPC already returned the permanent membership number.
    try {
      const { subject, text, html } = welcomeEmail({
        name,
        memberNo: formatMemberNo(data.member_no, data.member_year),
        fee: "Free — under 18",
        validUntil: data.expires_at ? formatDate(data.expires_at) : "—",
        kind: data.is_renewal ? "renewal" : "welcome",
      });
      await mailer.sendMail({ from: MAIL_FROM, to: email, subject, text, html });
    } catch (err) {
      console.error("membership email failed:", err);
    }

    // No Stripe session to identify this registration by — the success page
    // looks it up by the member's own row id instead.
    redirect(`${siteUrl}/join/success?member_id=${data.member_id}`);
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

  const { error } = await supabase.rpc("submit_membership_registration", {
    p_member_id: id,
    p_email: email,
    p_name: name,
    p_gender: gender || null,
    p_dob: dob,
    p_cid: cid,
    p_phone: phone || null,
    p_suburb: suburb || null,
    p_fee_cents: feeCents,
    p_session_id: session.id,
  });
  if (error) return { error: error.message };

  redirect(session.url);
}

// ---------------------------------------------------------------------------
// Family Membership — parent(s) + dependent children under 18, flat $30/yr
// for the whole household (Membership Policy §2.2, §3.4.1). Every adult is
// individually recorded with their own DOB/CID (own eligibility, own renewal
// matching, own email); children are recorded too but never pay, vote, or
// receive their own email. One Stripe Checkout covers the whole household —
// see submit_family_registration (0009_family_membership.sql).
// ---------------------------------------------------------------------------

function parseAdult(
  formData: FormData,
  prefix: string
): { value: FamilyMemberInput; label: string } | { error: string } | null {
  const email = String(formData.get(`${prefix}_email`) ?? "").trim();
  const name = String(formData.get(`${prefix}_name`) ?? "").trim();
  const gender = String(formData.get(`${prefix}_gender`) ?? "").trim();
  const dob = String(formData.get(`${prefix}_dob`) ?? "");
  const cid = String(formData.get(`${prefix}_cid`) ?? "").trim();

  if (!email && !name && !dob && !cid) return null; // optional second adult, not provided

  const label = prefix === "adult1" ? "the first adult" : "the second adult";
  if (!email || !name || !dob || !cid) {
    return { error: `Please fill in email, name, date of birth, and CID for ${label}.` };
  }
  if (!isValidCid(cid)) {
    return { error: `CID must be exactly 11 digits for ${label}.` };
  }

  const age = ageFrom(dob);
  if (age < 18 || age > 130) {
    return { error: `${label === "the first adult" ? "The first adult" : "The second adult"} must be 18 or older — please check the date of birth.` };
  }

  return {
    value: {
      member_id: crypto.randomUUID(),
      email,
      name,
      gender: gender || null,
      dob,
      cid,
      phone: null,
      suburb: null,
    },
    label,
  };
}

async function submitFamilyMembership(formData: FormData): Promise<SubmitResult> {
  const phone = String(formData.get("phone") ?? "").trim();
  const suburb = String(formData.get("suburb") ?? "").trim();

  const adult1Result = parseAdult(formData, "adult1");
  if (!adult1Result) {
    return { error: "Please fill in the first adult's details." };
  }
  if ("error" in adult1Result) return adult1Result;
  const adult1 = adult1Result.value;
  adult1.phone = phone || null;
  adult1.suburb = suburb || null;

  const adult2Result = parseAdult(formData, "adult2");
  if (adult2Result && "error" in adult2Result) return adult2Result;
  const adult2 = adult2Result?.value ?? null;

  const childNames = formData.getAll("child_name").map((v) => String(v).trim());
  const childDobs = formData.getAll("child_dob").map((v) => String(v));
  const childCids = formData.getAll("child_cid").map((v) => String(v).trim());

  const children: FamilyMemberInput[] = [];
  for (let i = 0; i < childNames.length; i++) {
    const cName = childNames[i] ?? "";
    const cDob = childDobs[i] ?? "";
    const cCid = childCids[i] ?? "";
    if (!cName && !cDob && !cCid) continue; // blank row left behind after removing one

    if (!cName || !cDob || !cCid) {
      return { error: "Please fill in name, date of birth, and CID for every child, or remove the empty row." };
    }
    if (!isValidCid(cCid)) {
      return { error: `CID must be exactly 11 digits for ${cName}.` };
    }
    const age = ageFrom(cDob);
    if (age < 0 || age >= 18) {
      return { error: `${cName || "A child"} on this registration is 18 or older — register them as an adult instead.` };
    }
    children.push({
      member_id: crypto.randomUUID(),
      email: adult1.email,
      name: cName,
      gender: null,
      dob: cDob,
      cid: cCid,
      phone: null,
      suburb: null,
    });
  }

  if (!adult2 && children.length === 0) {
    return {
      error:
        "Family membership must include at least one other household member — add a spouse/partner or a dependent child, or choose Single membership.",
    };
  }

  const members = [adult1, ...(adult2 ? [adult2] : []), ...children];
  const householdId = crypto.randomUUID();
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4321";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: FAMILY_FEE_CENTS,
          product_data: { name: "ABAC annual membership (family)" },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/join/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/join?canceled=1`,
    customer_email: adult1.email,
    metadata: { household_id: householdId },
  });

  if (!session.url) {
    return { error: "Couldn't start checkout — please try again." };
  }

  const { error } = await supabase.rpc("submit_family_registration", {
    p_household_id: householdId,
    p_session_id: session.id,
    p_fee_cents: FAMILY_FEE_CENTS,
    p_members: members,
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

// ---------------------------------------------------------------------------
// Corporate Membership — Diamond / Platinum / Gold. Unlike Single/Family,
// this is never self-serve: an application goes to 'pending' and waits for
// committee approval (see app/admin/actions.ts's approveCorporateMember)
// before any payment happens. See supabase/migrations/0012_corporate_membership.sql.
// ---------------------------------------------------------------------------

export type CorporateSubmitResult = { ok: boolean; error?: string };

export async function submitCorporateApplication(formData: FormData): Promise<CorporateSubmitResult> {
  const businessName = String(formData.get("business_name") ?? "").trim();
  const abn = String(formData.get("abn") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactRole = String(formData.get("contact_role") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const tier = String(formData.get("tier") ?? "");

  if (!businessName || !contactName || !email || !phone) {
    return { ok: false, error: "Please fill in your business name, contact name, email, and phone." };
  }
  if (!["diamond", "platinum", "gold"].includes(tier)) {
    return { ok: false, error: "Please choose a membership tier." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("corporate_members").insert({
    business_name: businessName,
    abn: abn || null,
    website: website || null,
    contact_name: contactName,
    contact_role: contactRole || null,
    email,
    phone,
    address: address || null,
    notes: notes || null,
    tier,
  });
  if (error) return { ok: false, error: error.message };

  // Best-effort — a mail hiccup shouldn't block a valid application.
  try {
    const received = corporateApplicationReceivedEmail({ businessName, contactName, tier });
    await mailer.sendMail({ from: MAIL_FROM, to: email, subject: received.subject, text: received.text, html: received.html });
  } catch (err) {
    console.error("corporate application-received email failed:", err);
  }
  try {
    const notify = corporateNotifyEmail({ businessName, contactName, email, phone, tier });
    await mailer.sendMail({
      from: MAIL_FROM,
      to: COMMITTEE_EMAIL,
      replyTo: email,
      subject: notify.subject,
      text: notify.text,
      html: notify.html,
    });
  } catch (err) {
    console.error("corporate notify email failed:", err);
  }

  return { ok: true };
}
