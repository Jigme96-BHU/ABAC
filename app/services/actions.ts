"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import {
  formatServiceFee,
  parseMemberNo,
  serviceFeeCents,
  serviceTypeLabel,
} from "@/lib/service-types";

export type ServiceSubmitResult = { error: string };

type MemberLookupRow = {
  member_found: boolean;
  eligible: boolean;
  reason: string | null;
  name: string | null;
  email_masked: string | null;
  member_no: number | null;
  member_year: number | null;
};

export type MemberLookup =
  | { ok: false; message: string }
  | { ok: true; name: string; emailMasked: string; memberNo: number; memberYear: number };

function lookupMessage(reason: string | null): string {
  switch (reason) {
    case "not_active":
      return "That membership isn't active yet — if a payment is still pending, please wait for it to complete.";
    case "expired":
      return "That membership has expired. Renew it to use the member rate, or tick “I'm not an ABAC member”.";
    default:
      return "We couldn't find that membership number. Check it, or tick “I'm not an ABAC member”.";
  }
}

/** Looks a membership number up so the form can confirm the requester has the
 *  right record before they pay. Returns a masked email by design — see the
 *  privacy note on lookup_member_for_service in
 *  supabase/migrations/0015_service_member_pricing.sql. */
export async function lookupMemberForService(memberNoInput: string): Promise<MemberLookup> {
  const memberNo = parseMemberNo(memberNoInput);
  if (memberNo === null) {
    return { ok: false, message: "Enter your membership number, e.g. ABAC-2026-000123." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("lookup_member_for_service", { p_member_no: memberNo })
    .returns<MemberLookupRow[]>()
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data || !data.member_found || !data.eligible) {
    return { ok: false, message: lookupMessage(data?.reason ?? null) };
  }

  return {
    ok: true,
    name: data.name ?? "",
    emailMasked: data.email_masked ?? "",
    memberNo: data.member_no ?? memberNo,
    memberYear: data.member_year ?? new Date().getFullYear(),
  };
}

const DOCUMENT_EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Uploads one ID document to the private service-documents bucket and
 *  returns its storage path — never a public URL, since this bucket isn't
 *  public. Admins read it back later via a short-lived signed URL. */
async function uploadServiceDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  requestId: string,
  field: string
): Promise<{ error: string | null; path?: string }> {
  const ext = DOCUMENT_EXT_BY_TYPE[file.type];
  if (!ext) return { error: `${field} must be a PDF, JPG, or PNG file.` };

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${requestId}-${field}.${ext}`;
  const { error } = await supabase.storage
    .from("service-documents")
    .upload(path, buffer, { contentType: file.type });
  if (error) return { error: error.message };

  return { error: null, path };
}

export async function submitServiceRequest(formData: FormData): Promise<ServiceSubmitResult> {
  const serviceType = String(formData.get("service_type") ?? "");
  const requesterName = String(formData.get("requester_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!["letter_of_residency", "character_reference"].includes(serviceType)) {
    return { error: "Please choose which service you need." };
  }
  if (!requesterName || !email || !phone) {
    return { error: "Please fill in your name, email, and phone." };
  }

  // The fee is decided here, from the database — the browser posts a
  // membership number and a checkbox, never a price.
  const notAMember = formData.get("not_a_member") === "on";
  let memberNo: number | null = null;
  if (!notAMember) {
    const lookup = await lookupMemberForService(String(formData.get("member_no") ?? ""));
    if (!lookup.ok) return { error: lookup.message };
    memberNo = lookup.memberNo;
  }
  const isMember = memberNo !== null;
  const feeCents = serviceFeeCents(isMember);

  const requiredFiles: { formKey: string; key: string; label: string }[] = [
    { formKey: "passport", key: "passport", label: "A passport scan" },
    { formKey: "visa", key: "visa", label: "A visa scan" },
    { formKey: "photo_id", key: "photo_id", label: "Proof of ID (driving licence or photo ID)" },
    { formKey: "proof_of_residency", key: "proof_of_residency", label: "Proof of residency" },
  ];
  for (const { formKey, label } of requiredFiles) {
    const file = formData.get(formKey);
    if (!(file instanceof File) || file.size === 0) {
      return { error: `${label} is required for this request.` };
    }
  }

  const supabase = await createClient();
  const requestId = crypto.randomUUID();

  const paths: Record<string, string> = {};
  for (const { formKey, key } of requiredFiles) {
    const file = formData.get(formKey) as File;
    const result = await uploadServiceDocument(supabase, file, requestId, key);
    if (result.error) return { error: result.error };
    paths[key] = result.path ?? "";
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4321";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: feeCents,
          product_data: {
            name: `ABAC service — ${serviceTypeLabel(serviceType)} (${isMember ? "member" : "non-member"} rate)`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/services?submitted=1`,
    cancel_url: `${siteUrl}/services?canceled=1`,
    customer_email: email,
    metadata: { kind: "service", request_id: requestId },
  });
  if (!session.url) {
    return { error: "Couldn't start checkout — please try again." };
  }

  const { error } = await supabase.from("service_requests").insert({
    id: requestId,
    service_type: serviceType,
    requester_name: requesterName,
    email,
    phone,
    passport_path: paths.passport,
    visa_path: paths.visa,
    photo_id_path: paths.photo_id,
    proof_of_residency_path: paths.proof_of_residency,
    notes: notes || null,
    member_no: memberNo,
    is_member: isMember,
    fee_cents: feeCents,
    stripe_checkout_session_id: session.id,
  });
  if (error) return { error: error.message };

  redirect(session.url);
}
