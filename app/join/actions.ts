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

/** Every adult in the household posts under the same repeated field names
 *  (adult_email, adult_name, …) in DOM order, so the number of adults is
 *  unbounded — same shape as the child rows. Index 0 is the adult who filled
 *  in the top of the form; their phone/suburb are applied by the caller.
 *
 *  Only the first adult's email is required (they're the primary contact
 *  for the household — Stripe checkout, receipts, and the "check my
 *  status" lookup all key off it). Every adult after that has an optional
 *  email: a grandparent or other guardian on the membership often doesn't
 *  have — or doesn't want to give — their own address. `members.email` is
 *  `not null` in the database (same as every other member), so a blank
 *  email defaults to the first adult's — same fallback already used for
 *  dependent children below. That means a 2nd+ adult without their own
 *  email shares the household's inbox rather than getting silently
 *  dropped from the Register of Members. */
function parseAdults(formData: FormData): { value: FamilyMemberInput[] } | { error: string } {
  const emails = formData.getAll("adult_email").map((v) => String(v).trim());
  const names = formData.getAll("adult_name").map((v) => String(v).trim());
  const genders = formData.getAll("adult_gender").map((v) => String(v).trim());
  const dobs = formData.getAll("adult_dob").map((v) => String(v));
  const cids = formData.getAll("adult_cid").map((v) => String(v).trim());

  const rows = Math.max(emails.length, names.length, dobs.length, cids.length);
  const adults: FamilyMemberInput[] = [];
  let primaryEmail = "";

  for (let i = 0; i < rows; i++) {
    const email = emails[i] ?? "";
    const name = names[i] ?? "";
    const dob = dobs[i] ?? "";
    const cid = cids[i] ?? "";
    const isBlankRow = i === 0 ? !email && !name && !dob && !cid : !name && !dob && !cid;
    if (isBlankRow) continue; // blank row left behind after removing one

    const label = i === 0 ? "the first adult" : `adult ${i + 1}`;
    if (i === 0 && !email) {
      return { error: "Please fill in email, name, date of birth, and CID for the first adult." };
    }
    if (!name || !dob || !cid) {
      return { error: `Please fill in name, date of birth, and CID for ${label}.` };
    }
    if (!isValidCid(cid)) {
      return { error: `CID must be exactly 11 digits for ${label}.` };
    }

    const age = ageFrom(dob);
    if (age < 18 || age > 130) {
      return {
        error: `${i === 0 ? "The first adult" : `Adult ${i + 1}`} must be 18 or older — please check the date of birth.`,
      };
    }

    if (i === 0) primaryEmail = email;

    adults.push({
      member_id: crypto.randomUUID(),
      email: email || primaryEmail,
      name,
      gender: genders[i] || null,
      dob,
      cid,
      phone: null,
      suburb: null,
    });
  }

  if (adults.length === 0) {
    return { error: "Please fill in the first adult's details." };
  }
  return { value: adults };
}

/** Dependent children — recorded in the Register of Members with their own
 *  name/DOB/CID, but they never pay and never get their own email, so they
 *  inherit the registering adult's address. */
function parseChildren(
  formData: FormData,
  contactEmail: string
): { value: FamilyMemberInput[] } | { error: string } {
  const names = formData.getAll("child_name").map((v) => String(v).trim());
  const dobs = formData.getAll("child_dob").map((v) => String(v));
  const cids = formData.getAll("child_cid").map((v) => String(v).trim());

  const children: FamilyMemberInput[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i] ?? "";
    const dob = dobs[i] ?? "";
    const cid = cids[i] ?? "";
    if (!name && !dob && !cid) continue; // blank row left behind after removing one

    if (!name || !dob || !cid) {
      return { error: "Please fill in name, date of birth, and CID for every child, or remove the empty row." };
    }
    if (!isValidCid(cid)) {
      return { error: `CID must be exactly 11 digits for ${name}.` };
    }
    const age = ageFrom(dob);
    if (age < 0 || age >= 18) {
      return { error: `${name || "A child"} on this registration is 18 or older — register them as an adult instead.` };
    }
    children.push({
      member_id: crypto.randomUUID(),
      email: contactEmail,
      name,
      gender: null,
      dob,
      cid,
      phone: null,
      suburb: null,
    });
  }
  return { value: children };
}

/** Two people in one household sharing a CID would both match the same
 *  existing member row and quietly collapse into one — reject it up front
 *  rather than let the RPC do something surprising. */
function duplicateCid(members: FamilyMemberInput[]): string | null {
  const seen = new Set<string>();
  for (const m of members) {
    if (seen.has(m.cid)) return m.name;
    seen.add(m.cid);
  }
  return null;
}

async function submitFamilyMembership(formData: FormData): Promise<SubmitResult> {
  const phone = String(formData.get("phone") ?? "").trim();
  const suburb = String(formData.get("suburb") ?? "").trim();

  const adultsResult = parseAdults(formData);
  if ("error" in adultsResult) return adultsResult;
  const adults = adultsResult.value;
  adults[0].phone = phone || null;
  adults[0].suburb = suburb || null;

  const childrenResult = parseChildren(formData, adults[0].email);
  if ("error" in childrenResult) return childrenResult;
  const children = childrenResult.value;

  if (adults.length === 1 && children.length === 0) {
    return {
      error:
        "Family membership must include at least one other household member — add another adult or a dependent child, or choose Single membership.",
    };
  }

  const members = [...adults, ...children];
  const duplicate = duplicateCid(members);
  if (duplicate) {
    return { error: `${duplicate} has the same CID as someone else on this registration — each person needs their own CID.` };
  }

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
    customer_email: adults[0].email,
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
// Change of category — Single <-> Family part-way through a membership year.
//
// Pricing is "model A" (see 0014_category_switch.sql): the member keeps their
// existing renewal date and pays only the difference in annual rate for the
// days they have left. Family -> Single therefore clamps to $0 with the expiry
// untouched. The amount is always quoted by the database, never accepted from
// the browser, and the same quote is recomputed server-side at submit time so
// a stale or tampered price can't reach Stripe.
// ---------------------------------------------------------------------------

/** Stripe rejects charges under $0.50 AUD, so a switch worth less than that
 *  (a handful of days left) is applied for free rather than blocking it. */
const STRIPE_MIN_CHARGE_CENTS = 50;

type QuoteRow = {
  member_found: boolean;
  eligible: boolean;
  reason: string | null;
  member_id: string | null;
  name: string | null;
  member_no: number | null;
  member_year: number | null;
  current_type: "single" | "family" | null;
  expires_at: string | null;
  days_left: number;
  amount_due_cents: number;
};

export type SwitchQuote =
  | { ok: false; message: string }
  | {
      ok: true;
      name: string;
      memberNo: string;
      currentType: "single" | "family";
      targetType: "single" | "family";
      daysLeft: number;
      amountDueCents: number;
      expiresAt: string | null;
    };

function quoteMessage(row: QuoteRow, target: string): string {
  switch (row.reason) {
    case "not_found":
      return "We couldn't find a membership with that date of birth and CID. Check both, or register instead.";
    case "same_type":
      return `That membership is already ${target === "family" ? "a Family" : "a Single"} membership.`;
    case "not_active":
      return "That membership isn't active yet — if a payment is still pending, please wait for it to complete.";
    case "expired":
      return "That membership has expired, so there are no unused days to carry over. Please renew in the form above instead.";
    case "dependent":
      return "That record is a dependent child on a family membership. The adult who registered the household needs to make this change.";
    default:
      return "That membership can't be changed online — please contact the committee.";
  }
}

async function fetchQuote(dob: string, cid: string, target: string) {
  const supabase = await createClient();
  return supabase
    .rpc("quote_category_switch", {
      p_dob: dob,
      p_cid: cid,
      p_target_type: target,
      p_single_fee_cents: FEE_PER_ADULT_CENTS,
      p_family_fee_cents: FAMILY_FEE_CENTS,
    })
    .returns<QuoteRow[]>()
    .maybeSingle();
}

export async function quoteCategorySwitch(formData: FormData): Promise<SwitchQuote> {
  const dob = String(formData.get("dob") ?? "");
  const cid = String(formData.get("cid") ?? "").trim();
  const target = String(formData.get("target_type") ?? "");

  if (!dob || !cid) {
    return { ok: false, message: "Please enter your date of birth and CID." };
  }
  if (!isValidCid(cid)) {
    return { ok: false, message: "CID must be exactly 11 digits." };
  }
  if (target !== "single" && target !== "family") {
    return { ok: false, message: "Please choose which category you want to move to." };
  }

  const { data, error } = await fetchQuote(dob, cid, target);
  if (error) return { ok: false, message: error.message };
  if (!data || !data.member_found || !data.eligible) {
    return {
      ok: false,
      message: data ? quoteMessage(data, target) : "We couldn't find that membership.",
    };
  }

  return {
    ok: true,
    name: data.name ?? "",
    memberNo:
      data.member_no != null && data.member_year != null
        ? formatMemberNo(data.member_no, data.member_year)
        : "",
    currentType: data.current_type ?? "single",
    targetType: target,
    daysLeft: data.days_left,
    amountDueCents: data.amount_due_cents,
    expiresAt: data.expires_at,
  };
}

export async function submitCategorySwitch(formData: FormData): Promise<SubmitResult> {
  const target = String(formData.get("target_type") ?? "");
  if (target !== "single" && target !== "family") {
    return { error: "Please choose which category you want to move to." };
  }

  const phone = String(formData.get("phone") ?? "").trim();
  const suburb = String(formData.get("suburb") ?? "").trim();

  // The person switching is always adult 1 — the RPC anchors the household's
  // renewal date on whoever is listed first.
  const adultsResult = parseAdults(formData);
  if ("error" in adultsResult) return adultsResult;
  const adults = adultsResult.value;
  adults[0].phone = phone || null;
  adults[0].suburb = suburb || null;

  const childrenResult = parseChildren(formData, adults[0].email);
  if ("error" in childrenResult) return childrenResult;
  const children = childrenResult.value;

  if (target === "single" && (adults.length > 1 || children.length > 0)) {
    return {
      error:
        "A Single membership covers one person only — remove the other household members before switching.",
    };
  }
  if (target === "family" && adults.length === 1 && children.length === 0) {
    return {
      error:
        "Family membership must include at least one other household member — add another adult or a dependent child.",
    };
  }

  const members = [...adults, ...children];
  const duplicate = duplicateCid(members);
  if (duplicate) {
    return { error: `${duplicate} has the same CID as someone else on this form — each person needs their own CID.` };
  }

  // Re-quoted here rather than trusting anything the browser posted back.
  const { data: quote, error: quoteError } = await fetchQuote(
    adults[0].dob,
    adults[0].cid,
    target
  );
  if (quoteError) return { error: quoteError.message };
  if (!quote || !quote.member_found || !quote.eligible) {
    return { error: quote ? quoteMessage(quote, target) : "We couldn't find that membership." };
  }

  const dueCents = quote.amount_due_cents < STRIPE_MIN_CHARGE_CENTS ? 0 : quote.amount_due_cents;
  const householdId = crypto.randomUUID();
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4321";

  // Nothing to pay (Family -> Single, or only a few days left) — apply it now.
  if (dueCents === 0) {
    const { data, error } = await supabase
      .rpc("submit_category_switch", {
        p_household_id: householdId,
        p_session_id: null,
        p_fee_cents: 0,
        p_target_type: target,
        p_members: members,
      })
      .returns<{ member_id: string }[]>();
    if (error) return { error: error.message };

    const first = Array.isArray(data) ? data[0] : null;
    if (!first) return { error: "The change didn't complete — please try again." };
    redirect(`${siteUrl}/join/success?member_id=${first.member_id}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: dueCents,
          product_data: {
            name: `ABAC membership change to ${target === "family" ? "Family" : "Single"} (${quote.days_left} days remaining)`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/join/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/join?canceled=1`,
    customer_email: adults[0].email,
    metadata: { household_id: householdId, switch_to: target },
  });

  if (!session.url) {
    return { error: "Couldn't start checkout — please try again." };
  }

  const { error } = await supabase.rpc("submit_category_switch", {
    p_household_id: householdId,
    p_session_id: session.id,
    p_fee_cents: dueCents,
    p_target_type: target,
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

const CERTIFICATE_EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

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

  // Business Certificate is optional — not every applicant has one on hand
  // when they apply, and the committee can always follow up.
  let certificatePath: string | null = null;
  const certificate = formData.get("business_certificate");
  if (certificate instanceof File && certificate.size > 0) {
    const ext = CERTIFICATE_EXT_BY_TYPE[certificate.type];
    if (!ext) return { ok: false, error: "Business Certificate must be a PDF, JPG, or PNG file." };

    const id = crypto.randomUUID();
    const buffer = Buffer.from(await certificate.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("corporate-documents")
      .upload(`${id}-certificate.${ext}`, buffer, { contentType: certificate.type });
    if (uploadError) return { ok: false, error: uploadError.message };
    certificatePath = `${id}-certificate.${ext}`;
  }

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
    business_certificate_path: certificatePath,
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

// ---------------------------------------------------------------------------
// Corporate Membership Status Check
// ---------------------------------------------------------------------------

export type CorporateStatusResult = {
  found: boolean;
  status?: "pending" | "approved" | "active" | "inactive" | "rejected";
  tier?: "diamond" | "platinum" | "gold";
  joined_at?: string;
  expires_at?: string | null;
  error?: string;
};

export async function checkCorporateStatus(
  businessName: string,
  abn: string,
  email: string
): Promise<CorporateStatusResult> {
  if (!businessName.trim() || !abn.trim() || !email.trim()) {
    return { found: false, error: "Please enter business name, ABN, and email." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("corporate_members")
    .select("status, tier, joined_at, expires_at")
    .eq("business_name", businessName.trim())
    .eq("abn", abn.trim())
    .eq("email", email.trim())
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found
      return { found: false, error: "No corporate membership found with those details." };
    }
    return { found: false, error: error.message };
  }

  return {
    found: true,
    status: data.status,
    tier: data.tier,
    joined_at: data.joined_at,
    expires_at: data.expires_at,
  };
}
