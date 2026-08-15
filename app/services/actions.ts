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

export const SERVICE_DOCUMENT_FIELDS = ["passport", "visa", "photo_id", "proof_of_residency"] as const;
export type ServiceDocumentField = (typeof SERVICE_DOCUMENT_FIELDS)[number];

/** 3MB per file — enforced client-side before any upload starts (see
 *  ServiceRequestForm.tsx), and again by Storage itself via the bucket's
 *  file_size_limit (0020_admin_search_and_upload_limits.sql), so a tampered
 *  client can't smuggle a larger file past the visible check. */
export const SERVICE_DOCUMENT_MAX_BYTES = 3 * 1024 * 1024;

/** Mints a request id up front so every document a requester uploads —
 *  before the request row itself exists — can share one stable prefix in
 *  Storage. Nothing is written to the database yet; that only happens once
 *  submitServiceRequest actually inserts the row. */
export async function beginServiceRequest(): Promise<{ requestId: string }> {
  return { requestId: crypto.randomUUID() };
}

/** Direct-to-storage upload, step 1: a signed upload URL the browser can PUT
 *  straight to Supabase Storage, bypassing this server action's own request
 *  body entirely. Necessary because up to 4 documents in one submission can
 *  exceed Vercel's serverless request-body ceiling even when each file is
 *  well under the 3MB-per-file rule — the old synchronous upload used to
 *  route every byte through this function's own request, which is exactly
 *  what hit that ceiling. The `service-documents` bucket's insert policy has
 *  no admin gate (`with check (bucket_id = 'service-documents')`), so this
 *  works for anonymous public submitters same as the old upload did. */
export async function createServiceDocumentUploadUrl(
  requestId: string,
  field: ServiceDocumentField,
  contentType: string
): Promise<{ error: string | null; path?: string; token?: string }> {
  const ext = DOCUMENT_EXT_BY_TYPE[contentType];
  if (!ext) return { error: "Documents must be a PDF, JPG, or PNG file." };

  const supabase = await createClient();
  const path = `${requestId}-${field}.${ext}`;
  const { data, error } = await supabase.storage.from("service-documents").createSignedUploadUrl(path);
  if (error) return { error: error.message };

  return { error: null, path, token: data.token };
}

export async function submitServiceRequest(formData: FormData): Promise<ServiceSubmitResult> {
  const serviceType = String(formData.get("service_type") ?? "");
  const requesterName = String(formData.get("requester_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const requestId = String(formData.get("request_id") ?? "").trim();

  if (!["letter_of_residency", "character_reference"].includes(serviceType)) {
    return { error: "Please choose which service you need." };
  }
  if (!requesterName || !email || !phone) {
    return { error: "Please fill in your name, email, and phone." };
  }
  if (!requestId) {
    return { error: "Something went wrong preparing your request — please reload and try again." };
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

  const requiredFiles: { field: ServiceDocumentField; label: string }[] = [
    { field: "passport", label: "A passport scan" },
    { field: "visa", label: "A visa scan" },
    { field: "photo_id", label: "Proof of ID (driving licence or photo ID)" },
    { field: "proof_of_residency", label: "Proof of residency" },
  ];
  const paths: Record<string, string> = {};
  for (const { field, label } of requiredFiles) {
    const path = String(formData.get(`${field}_path`) ?? "").trim();
    if (!path) return { error: `${label} is required for this request.` };
    paths[field] = path;
  }

  const supabase = await createClient();

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
