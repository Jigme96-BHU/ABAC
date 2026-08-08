"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { imageSizeFromBuffer } from "@/lib/image-size";
import { stripe } from "@/lib/stripe";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { corporatePaymentLinkEmail } from "@/lib/emails/corporate-payment-link";
import { CORPORATE_TIER_FEES_CENTS, corporateTierLabel, type CorporateTier } from "@/lib/corporate-tiers";

export type EventInput = {
  title: string;
  date: string;
  time: string;
  location: string;
  note: string;
  access: "open" | "members";
  cta: "" | "rsvp" | "volunteer";
  published: boolean;
};

/** These actions run with the signed-in committee member's session, so
 *  Postgres RLS (is_admin(), in the migration) is what actually enforces
 *  who can write — not this code. A non-admin hitting these directly gets
 *  rejected by the database regardless of what the UI shows them. */

function normalise(input: EventInput) {
  return {
    title: input.title.trim(),
    date: input.date,
    time: input.time.trim() || null,
    location: input.location.trim(),
    note: input.note.trim() || null,
    access: input.access,
    cta: input.cta === "" ? null : input.cta,
    published: input.published,
  };
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/events");
  revalidatePath("/");
}

export async function createEvent(input: EventInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").insert(normalise(input));
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function updateEvent(id: string, input: EventInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").update(normalise(input)).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Uploads a story photo to the public story-images bucket and returns its
 *  public URL plus real dimensions (read server-side before upload, so the
 *  public pages always get the correct aspect ratio — see StoryCard). */
async function uploadStoryImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  slug: string,
) {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return { error: "Image must be a JPEG, PNG, or WebP file." } as const;

  const buffer = Buffer.from(await file.arrayBuffer());
  const size = imageSizeFromBuffer(buffer);
  if (!size) return { error: "Couldn't read that image file — try a different one." } as const;

  const path = `${slug}-${Date.now().toString(36)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("story-images")
    .upload(path, buffer, { contentType: file.type });
  if (uploadError) return { error: uploadError.message } as const;

  const {
    data: { publicUrl },
  } = supabase.storage.from("story-images").getPublicUrl(path);

  return { error: null, url: publicUrl, ...size } as const;
}

function readStoryFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    date: String(formData.get("date") ?? ""),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    published: formData.get("published") === "on",
  };
}

export async function createStory(formData: FormData) {
  const supabase = await createClient();
  const fields = readStoryFields(formData);
  const slug = `${slugify(fields.title)}-${Date.now().toString(36).slice(-5)}`;

  const image = formData.get("image");
  let imageData: { image_path: string; image_width: number; image_height: number } | undefined;
  if (image instanceof File && image.size > 0) {
    const result = await uploadStoryImage(supabase, image, slug);
    if (result.error !== null) return { error: result.error };
    imageData = { image_path: result.url, image_width: result.width, image_height: result.height };
  }

  const { error } = await supabase.from("stories").insert({ ...fields, slug, ...imageData });
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/events/[slug]", "page");
  return { error: null };
}

export async function updateStory(id: string, slug: string, formData: FormData) {
  const supabase = await createClient();
  const fields = readStoryFields(formData);

  const image = formData.get("image");
  let imageData: { image_path: string; image_width: number; image_height: number } | undefined;
  if (image instanceof File && image.size > 0) {
    const result = await uploadStoryImage(supabase, image, slug);
    if (result.error !== null) return { error: result.error };
    imageData = { image_path: result.url, image_width: result.width, image_height: result.height };
  }

  const { error } = await supabase.from("stories").update({ ...fields, ...imageData }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/events/[slug]", "page");
  return { error: null };
}

export async function deleteStory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("stories").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const DOCUMENT_EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** Uploads a document to the public documents bucket and returns its public
 *  URL, original filename, and size — unlike story photos, a document's
 *  original filename matters (it's what a download is saved as), so it's
 *  kept alongside the storage path rather than discarded. */
async function uploadDocumentFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  slug: string,
) {
  const ext = DOCUMENT_EXT_BY_TYPE[file.type];
  if (!ext) return { error: "File must be a PDF, DOC, or DOCX." } as const;

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${slug}-${Date.now().toString(36)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, buffer, { contentType: file.type });
  if (uploadError) return { error: uploadError.message } as const;

  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(path);

  return { error: null, url: publicUrl, fileName: file.name, fileSize: file.size } as const;
}

function readDocumentFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? "other"),
    published: formData.get("published") === "on",
  };
}

export async function createDocument(formData: FormData) {
  const supabase = await createClient();
  const fields = readDocumentFields(formData);
  const slug = `${slugify(fields.title)}-${Date.now().toString(36).slice(-5)}`;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }

  const result = await uploadDocumentFile(supabase, file, slug);
  if (result.error !== null) return { error: result.error };

  const { error } = await supabase.from("documents").insert({
    ...fields,
    file_path: result.url,
    file_name: result.fileName,
    file_size: result.fileSize,
  });
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/documents");
  return { error: null };
}

export async function updateDocument(id: string, formData: FormData) {
  const supabase = await createClient();
  const fields = readDocumentFields(formData);

  const file = formData.get("file");
  let fileData: { file_path: string; file_name: string; file_size: number } | undefined;
  if (file instanceof File && file.size > 0) {
    const slug = `${slugify(fields.title)}-${Date.now().toString(36).slice(-5)}`;
    const result = await uploadDocumentFile(supabase, file, slug);
    if (result.error !== null) return { error: result.error };
    fileData = { file_path: result.url, file_name: result.fileName, file_size: result.fileSize };
  }

  const { error } = await supabase.from("documents").update({ ...fields, ...fileData }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/documents");
  return { error: null };
}

export async function deleteDocument(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/documents");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Volunteers — admin can only view/delete; the registration itself is
// public (see app/volunteers/actions.ts), so there's no create/update here.
// ---------------------------------------------------------------------------

export async function deleteVolunteer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("volunteers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Corporate Membership — applications are public (see app/join/actions.ts's
// submitCorporateApplication), but approval, payment-link generation, and
// logo management are admin-only. Approving does not activate the
// membership by itself — it only emails a Stripe payment link; the Stripe
// webhook (app/api/stripe/webhook) is what actually activates it once paid,
// same "never claim active before payment clears" rule as everywhere else.
// ---------------------------------------------------------------------------

const CORPORATE_LOGO_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function approveCorporateMember(id: string) {
  const supabase = await createClient();
  const { data: member, error: fetchError } = await supabase
    .from("corporate_members")
    .select("id, business_name, contact_name, email, tier, status")
    .eq("id", id)
    .single();
  if (fetchError) return { error: fetchError.message };
  if (member.status !== "pending") return { error: "This application has already been actioned." };

  const tier = member.tier as CorporateTier;
  const feeCents = CORPORATE_TIER_FEES_CENTS[tier];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4321";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: feeCents,
          product_data: { name: `ABAC Corporate Membership (${corporateTierLabel(tier)} tier)` },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/partners`,
    cancel_url: `${siteUrl}/`,
    customer_email: member.email,
    metadata: { kind: "corporate", corporate_member_id: id },
  });
  if (!session.url) return { error: "Couldn't create a payment link — please try again." };

  const { error: updateError } = await supabase
    .from("corporate_members")
    .update({ status: "approved", stripe_checkout_session_id: session.id, fee_cents: feeCents })
    .eq("id", id);
  if (updateError) return { error: updateError.message };

  try {
    const fee = `$${(feeCents / 100).toFixed(0)} AUD Annually`;
    const { subject, text, html } = corporatePaymentLinkEmail({
      businessName: member.business_name,
      contactName: member.contact_name,
      tier: corporateTierLabel(tier),
      fee,
      paymentUrl: session.url,
    });
    await mailer.sendMail({ from: MAIL_FROM, to: member.email, subject, text, html });
  } catch (err) {
    console.error("corporate payment-link email failed:", err);
  }

  revalidatePath("/admin");
  return { error: null };
}

export async function rejectCorporateMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("corporate_members")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function uploadCorporateLogo(id: string, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a logo file to upload." };
  }
  const ext = CORPORATE_LOGO_EXT_BY_TYPE[file.type];
  if (!ext) return { error: "Logo must be a JPEG, PNG, WebP, or SVG file." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `corporate-${id}-${Date.now().toString(36)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("corporate-logos")
    .upload(path, buffer, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("corporate-logos").getPublicUrl(path);

  const { error } = await supabase.from("corporate_members").update({ logo_path: publicUrl }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/partners");
  return { error: null };
}

export async function removeCorporateLogo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("corporate_members").update({ logo_path: null }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/partners");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Service requests — admin can only view/delete; submission itself is public
// (see app/services/actions.ts). The service-documents bucket isn't public
// (unlike every other bucket in this project), so documents are only ever
// reachable via a short-lived signed URL generated here, using the signed-in
// admin's own session — never a stored public path.
// ---------------------------------------------------------------------------

export async function getServiceDocumentUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("service-documents")
    .createSignedUrl(path, 300); // 5 minutes
  if (error) return { error: error.message, url: null };
  return { error: null, url: data.signedUrl };
}

export async function deleteServiceRequest(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("service_requests").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}
