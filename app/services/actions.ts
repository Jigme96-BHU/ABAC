"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { SERVICE_FEE_CENTS, serviceTypeLabel } from "@/lib/service-types";

export type ServiceSubmitResult = { error: string };

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

  const passport = formData.get("passport");
  if (!(passport instanceof File) || passport.size === 0) {
    return { error: "A passport scan is required for this request." };
  }

  const supabase = await createClient();
  const requestId = crypto.randomUUID();

  const passportResult = await uploadServiceDocument(supabase, passport, requestId, "passport");
  if (passportResult.error) return { error: passportResult.error };

  const optionalFields: { key: string; formKey: string }[] = [
    { key: "visa", formKey: "visa" },
    { key: "license", formKey: "license" },
    { key: "proof_of_residency", formKey: "proof_of_residency" },
  ];
  const optionalPaths: Record<string, string | null> = {};
  for (const { key, formKey } of optionalFields) {
    const file = formData.get(formKey);
    if (file instanceof File && file.size > 0) {
      const result = await uploadServiceDocument(supabase, file, requestId, key);
      if (result.error) return { error: result.error };
      optionalPaths[key] = result.path ?? null;
    } else {
      optionalPaths[key] = null;
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4321";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: SERVICE_FEE_CENTS,
          product_data: { name: `ABAC service — ${serviceTypeLabel(serviceType)}` },
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
    passport_path: passportResult.path,
    visa_path: optionalPaths.visa,
    license_path: optionalPaths.license,
    proof_of_residency_path: optionalPaths.proof_of_residency,
    notes: notes || null,
    fee_cents: SERVICE_FEE_CENTS,
    stripe_checkout_session_id: session.id,
  });
  if (error) return { error: error.message };

  redirect(session.url);
}
