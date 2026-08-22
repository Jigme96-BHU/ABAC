"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { imageSizeFromBuffer } from "@/lib/image-size";
import { stripe } from "@/lib/stripe";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { corporatePaymentLinkEmail } from "@/lib/emails/corporate-payment-link";
import { corporateRejectedEmail } from "@/lib/emails/corporate-rejected";
import { welcomeEmail } from "@/lib/emails/welcome";
import { formatMemberNo, formatDate } from "@/lib/member-number";
import { CORPORATE_TIER_FEES_CENTS, corporateTierLabel, type CorporateTier } from "@/lib/corporate-tiers";
import { serviceTypeLabel } from "@/lib/service-types";
import type { MemberRow, ServiceRequestRow, CorporateMemberRow, VolunteerRow } from "@/lib/supabase/types";

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

export async function getEventRsvps(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message, rsvps: [] as { id: string; name: string; email: string; phone: string; created_at: string }[] };
  return { error: null, rsvps: data ?? [] };
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
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
};

const VIDEO_EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** Direct-to-storage upload, step 1, for story photos — same reasoning as
 *  createStoryVideoUploadUrl just above: a real phone-camera photo is
 *  routinely 2–8MB, comfortably over Next.js's 1MB default server-action
 *  request-body limit, so routing it through this action's own body failed
 *  silently. A signed upload URL lets the browser PUT it straight to
 *  Storage instead — the same fix already applied to story video, now
 *  applied to photos too. Dimensions are read in the browser (see
 *  StoryForm.tsx) rather than from a server-side buffer, since the server
 *  never sees the file's bytes with this approach. */
async function createStoryImageUploadUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentType: string
): Promise<{ error: string | null; path?: string; token?: string }> {
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) return { error: "Image must be a JPEG, PNG, WebP, GIF, HEIC/HEIF, or AVIF file." };

  const path = `story-image-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from("story-images").createSignedUploadUrl(path);
  if (error) return { error: error.message };

  return { error: null, path, token: data.token };
}

export async function createStoryImageUploadUrls(
  contentTypes: string[]
): Promise<{ error: string | null; results: { error: string | null; path?: string; token?: string }[] }> {
  const supabase = await createClient();
  const results = await Promise.all(contentTypes.map((type) => createStoryImageUploadUrl(supabase, type)));
  const failed = results.find((r) => r.error);
  return { error: failed?.error ?? null, results };
}

type UploadedImage = { path: string; width: number | null; height: number | null };

/** Every photo is already in Storage by the time this runs (see
 *  createStoryImageUploadUrls above) — this just resolves each path's
 *  public URL and inserts the story_images rows, same "already uploaded,
 *  only resolve + record" shape as readVideoData. The first photo across
 *  the whole story becomes the "cover" mirrored onto
 *  stories.image_path/image_width/image_height — existing rows (when
 *  editing) always sort before newly added ones, so a story's cover never
 *  silently changes just because more photos were added afterward. */
async function recordStoryImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  images: UploadedImage[],
  storyId: string,
  startOrder: number
): Promise<{ error: string | null; cover?: { image_path: string; image_width: number | null; image_height: number | null } }> {
  let cover: { image_path: string; image_width: number | null; image_height: number | null } | undefined;
  for (let i = 0; i < images.length; i++) {
    const {
      data: { publicUrl },
    } = supabase.storage.from("story-images").getPublicUrl(images[i].path);

    const { error: insertError } = await supabase.from("story_images").insert({
      story_id: storyId,
      path: publicUrl,
      width: images[i].width,
      height: images[i].height,
      display_order: startOrder + i,
    });
    if (insertError) return { error: insertError.message };

    if (startOrder === 0 && i === 0) {
      cover = { image_path: publicUrl, image_width: images[i].width, image_height: images[i].height };
    }
  }
  return { error: null, cover };
}

/** Reads the JSON array StoryForm.tsx builds after uploading each photo
 *  directly to Storage: `[{path, width, height}, …]`. Malformed/missing
 *  input is treated as "no photos" rather than thrown, since this comes
 *  from the browser and a stray gap here shouldn't crash the whole save. */
function readUploadedImages(formData: FormData): UploadedImage[] {
  const raw = String(formData.get("uploaded_images") ?? "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is { path: unknown; width: unknown; height: unknown } => v && typeof v.path === "string")
      .map((v) => ({
        path: v.path as string,
        width: typeof v.width === "number" ? v.width : null,
        height: typeof v.height === "number" ? v.height : null,
      }));
  } catch {
    return [];
  }
}

export async function deleteStoryImage(imageId: string, storyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("story_images").delete().eq("id", imageId);
  if (error) return { error: error.message };

  // If the deleted image was the cover, promote whichever photo is now
  // first — stories.image_path must never point at a row that no longer
  // exists in story_images.
  const { data: remaining } = await supabase
    .from("story_images")
    .select("*")
    .eq("story_id", storyId)
    .order("display_order", { ascending: true })
    .limit(1)
    .returns<{ path: string; width: number | null; height: number | null }[]>();

  const next = remaining?.[0];
  await supabase
    .from("stories")
    .update({
      image_path: next?.path ?? null,
      image_width: next?.width ?? null,
      image_height: next?.height ?? null,
    })
    .eq("id", storyId);

  refresh();
  revalidatePath("/events/[slug]", "page");
  return { error: null };
}

/** Direct-to-storage upload, step 1, for story videos — the same reasoning
 *  as createServiceDocumentUploadUrl (app/services/actions.ts): a video can
 *  be well over Vercel's serverless request-body ceiling, so it has to
 *  bypass this server action's own request entirely and go straight to
 *  Storage from the browser. Admin-gated the same way the old synchronous
 *  upload was — `story-videos`' insert policy already requires
 *  `public.is_admin()`, evaluated against the signed-in session when the
 *  signed upload URL is minted here. */
export async function createStoryVideoUploadUrl(
  contentType: string
): Promise<{ error: string | null; path?: string; token?: string }> {
  const ext = VIDEO_EXT_BY_TYPE[contentType];
  if (!ext) return { error: "Video must be MP4, WebM, or MOV format." };

  const supabase = await createClient();
  const path = `story-video-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from("story-videos").createSignedUploadUrl(path);
  if (error) return { error: error.message };

  return { error: null, path, token: data.token };
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

/** The video itself was already uploaded directly to Storage from the
 *  browser (see createStoryVideoUploadUrl) before this runs — this only
 *  resolves the already-uploaded path's public URL, no file bytes pass
 *  through this server action at all. */
function readVideoData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): { video_path: string; video_size: number } | undefined {
  const path = String(formData.get("video_path") ?? "").trim();
  if (!path) return undefined;
  const size = Number(formData.get("video_size") ?? 0);
  const {
    data: { publicUrl },
  } = supabase.storage.from("story-videos").getPublicUrl(path);
  return { video_path: publicUrl, video_size: Number.isFinite(size) ? size : 0 };
}

export async function createStory(formData: FormData) {
  const supabase = await createClient();
  const fields = readStoryFields(formData);
  const slug = `${slugify(fields.title)}-${Date.now().toString(36).slice(-5)}`;

  const videoData = readVideoData(supabase, formData);

  const { data: inserted, error } = await supabase
    .from("stories")
    .insert({ ...fields, slug, ...videoData })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const images = readUploadedImages(formData);
  if (images.length > 0) {
    const result = await recordStoryImages(supabase, images, inserted.id, 0);
    if (result.error !== null) return { error: result.error };
    if (result.cover) {
      await supabase.from("stories").update(result.cover).eq("id", inserted.id);
    }
  }

  refresh();
  revalidatePath("/events/[slug]", "page");
  return { error: null };
}

export async function updateStory(id: string, formData: FormData) {
  const supabase = await createClient();
  const fields = readStoryFields(formData);
  const videoData = readVideoData(supabase, formData);

  const { error } = await supabase.from("stories").update({ ...fields, ...videoData }).eq("id", id);
  if (error) return { error: error.message };

  const images = readUploadedImages(formData);
  if (images.length > 0) {
    const { data: existing } = await supabase
      .from("story_images")
      .select("display_order")
      .eq("story_id", id)
      .order("display_order", { ascending: false })
      .limit(1)
      .returns<{ display_order: number }[]>();
    const startOrder = (existing?.[0]?.display_order ?? -1) + 1;

    const result = await recordStoryImages(supabase, images, id, startOrder);
    if (result.error !== null) return { error: result.error };
    // A story with no cover yet (its first-ever photos) gets one now — a
    // story that already had a cover keeps it, since these are additions,
    // not a replacement.
    if (startOrder === 0 && result.cover) {
      await supabase.from("stories").update(result.cover).eq("id", id);
    }
  }

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

export async function getStoryImages(storyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_images")
    .select("*")
    .eq("story_id", storyId)
    .order("display_order", { ascending: true })
    .returns<{ id: string; path: string; width: number | null; height: number | null }[]>();
  if (error) return { error: error.message, images: [] };
  return { error: null, images: data ?? [] };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const DOCUMENT_EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** Direct-to-storage upload, step 1 — a real scanned/multi-page PDF (an
 *  Annual Report with photos, a signed Constitution scan) routinely exceeds
 *  Next.js's 1MB default server-action request-body limit, so routing it
 *  through this action's own body failed silently, same as every other
 *  upload fixed this way in this project. The `documents` bucket's insert
 *  policy is admin-gated (`bucket_id = 'documents' and public.is_admin()`),
 *  same shape as story-videos' — that's evaluated against the signed-in
 *  admin's session right here, when the URL is minted, not against
 *  whatever session does the actual PUT. */
export async function createDocumentUploadUrl(
  contentType: string
): Promise<{ error: string | null; path?: string; token?: string }> {
  const ext = DOCUMENT_EXT_BY_TYPE[contentType];
  if (!ext) return { error: "File must be a PDF, DOC, or DOCX." };

  const supabase = await createClient();
  const path = `document-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from("documents").createSignedUploadUrl(path);
  if (error) return { error: error.message };

  return { error: null, path, token: data.token };
}

function readDocumentFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? "other"),
    published: formData.get("published") === "on",
  };
}

/** The file itself is already in Storage by the time this runs (see
 *  createDocumentUploadUrl above) — this only resolves the path's public
 *  URL. Original filename/size come from the client, same trust level as
 *  video_size elsewhere: cosmetic metadata (what a download is saved as,
 *  what size is displayed), not something a wrong value could compromise. */
function readUploadedDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): { file_path: string; file_name: string; file_size: number } | undefined {
  const path = String(formData.get("file_path") ?? "").trim();
  if (!path) return undefined;
  const fileName = String(formData.get("file_name") ?? "").trim() || "document";
  const size = Number(formData.get("file_size") ?? 0);
  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(path);
  return { file_path: publicUrl, file_name: fileName, file_size: Number.isFinite(size) ? size : 0 };
}

export async function createDocument(formData: FormData) {
  const supabase = await createClient();
  const fields = readDocumentFields(formData);

  const fileData = readUploadedDocument(supabase, formData);
  if (!fileData) {
    return { error: "Please choose a file to upload." };
  }

  const { error } = await supabase.from("documents").insert({ ...fields, ...fileData });
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/documents");
  return { error: null };
}

export async function updateDocument(id: string, formData: FormData) {
  const supabase = await createClient();
  const fields = readDocumentFields(formData);
  const fileData = readUploadedDocument(supabase, formData);

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

/** Same parallel-lookups-merged-by-id shape used for Members/Corporate
 *  search — see searchMembers's doc comment for why a single `.or()`
 *  filter string is worth avoiding here too. */
export async function searchVolunteers(query: string): Promise<{ error: string | null; results: VolunteerRow[] }> {
  const q = query.trim();
  if (!q) return { error: null, results: [] };

  const supabase = await createClient();
  const escaped = q.replace(/[%_]/g, "\\$&");
  const digitsOnly = q.replace(/\D/g, "");

  const lookups = [
    supabase.from("volunteers").select("*").ilike("name", `%${escaped}%`).limit(50).returns<VolunteerRow[]>(),
    supabase.from("volunteers").select("*").ilike("email", `%${escaped}%`).limit(50).returns<VolunteerRow[]>(),
  ];
  if (digitsOnly) {
    lookups.push(
      supabase.from("volunteers").select("*").ilike("cid", `%${digitsOnly}%`).limit(50).returns<VolunteerRow[]>(),
      supabase.from("volunteers").select("*").ilike("phone", `%${digitsOnly}%`).limit(50).returns<VolunteerRow[]>()
    );
  }

  const responses = await Promise.all(lookups);
  const failed = responses.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message, results: [] };

  const merged = new Map<string, VolunteerRow>();
  for (const r of responses) {
    for (const row of r.data ?? []) merged.set(row.id, row);
  }

  const results = [...merged.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);

  return { error: null, results };
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
  const { data: member, error: fetchError } = await supabase
    .from("corporate_members")
    .select("business_name, contact_name, email, tier, status")
    .eq("id", id)
    .single();
  if (fetchError) return { error: fetchError.message };
  if (member.status !== "pending") return { error: "This application has already been actioned." };

  const { error } = await supabase
    .from("corporate_members")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: error.message };

  try {
    const { subject, text, html } = corporateRejectedEmail({
      businessName: member.business_name,
      contactName: member.contact_name,
      tier: corporateTierLabel(member.tier),
    });
    await mailer.sendMail({ from: MAIL_FROM, to: member.email, subject, text, html });
  } catch (err) {
    console.error("corporate rejected email failed:", err);
  }

  revalidatePath("/admin");
  return { error: null };
}

/** Direct-to-storage upload, step 1 — a real logo file (a high-res PNG
 *  export) can exceed Next.js's 1MB default server-action request-body
 *  limit, same failure mode already fixed for story photos, documents, and
 *  the public corporate application's own logo/certificate uploads. */
export async function createAdminCorporateLogoUploadUrl(
  contentType: string
): Promise<{ error: string | null; path?: string; token?: string }> {
  const ext = CORPORATE_LOGO_EXT_BY_TYPE[contentType];
  if (!ext) return { error: "Logo must be a JPEG, PNG, WebP, or SVG file." };

  const supabase = await createClient();
  const path = `corporate-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from("corporate-logos").createSignedUploadUrl(path);
  if (error) return { error: error.message };

  return { error: null, path, token: data.token };
}

/** The file is already in Storage by the time this runs (see
 *  createAdminCorporateLogoUploadUrl above) — this only resolves the
 *  public URL and records it. */
export async function recordCorporateLogo(id: string, path: string) {
  const supabase = await createClient();
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
  return getSignedDocumentUrl("service-documents", path, 300); // 5 minutes
}

export async function deleteServiceRequest(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("service_requests").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

/** Same parallel-lookups-merged-by-id shape as searchMembers (app/admin/
 *  actions.ts) — a single `.or()` filter string branching on whether the
 *  query looks numeric is exactly what silently broke email search there
 *  (see the commit that fixed it), so this never does that in the first
 *  place. */
export async function searchServiceRequests(
  query: string
): Promise<{ error: string | null; results: ServiceRequestRow[] }> {
  const q = query.trim();
  if (!q) return { error: null, results: [] };

  const supabase = await createClient();
  const escaped = q.replace(/[%_]/g, "\\$&");
  const digitsOnly = q.replace(/\D/g, "");

  const lookups = [
    supabase.from("service_requests").select("*").ilike("requester_name", `%${escaped}%`).limit(50).returns<ServiceRequestRow[]>(),
    supabase.from("service_requests").select("*").ilike("email", `%${escaped}%`).limit(50).returns<ServiceRequestRow[]>(),
  ];
  if (digitsOnly) {
    lookups.push(
      supabase.from("service_requests").select("*").ilike("phone", `%${digitsOnly}%`).limit(50).returns<ServiceRequestRow[]>()
    );
  }

  const responses = await Promise.all(lookups);
  const failed = responses.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message, results: [] };

  const merged = new Map<string, ServiceRequestRow>();
  for (const r of responses) {
    for (const row of r.data ?? []) merged.set(row.id, row);
  }

  const results = [...merged.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);

  return { error: null, results };
}

/** "Action Taken" — the committee's workflow state on a request (have they
 *  actually written the letter / declined it / still working on it),
 *  tracked separately from `status` (whether payment cleared). A request
 *  can be paid and still `pending` here, or (rarely) declined after
 *  payment — that's a real state the committee needs to record, not
 *  something this function judges. The comment is saved alongside the
 *  status change in one call so noting a reason and setting the status is
 *  a single action, not two. */
export async function updateServiceAction(
  id: string,
  actionStatus: "pending" | "done" | "declined",
  comment: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_requests")
    .update({ action_status: actionStatus, admin_comment: comment?.trim() || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export type ServiceRequestExportFilter = {
  actionStatuses?: ("pending" | "done" | "declined")[];
  serviceTypes?: ("letter_of_residency" | "character_reference")[];
  dateRange?: { start: string; end: string };
};

export async function getServiceRequestsForExport(
  filter: ServiceRequestExportFilter
): Promise<{ error: string | null; rows: ServiceRequestRow[] }> {
  const supabase = await createClient();
  let query = supabase.from("service_requests").select("*").order("created_at", { ascending: false });

  if (filter.actionStatuses?.length) query = query.in("action_status", filter.actionStatuses);
  if (filter.serviceTypes?.length) query = query.in("service_type", filter.serviceTypes);
  if (filter.dateRange?.start) query = query.gte("created_at", filter.dateRange.start);
  if (filter.dateRange?.end) query = query.lte("created_at", filter.dateRange.end);

  const { data, error } = await query.returns<ServiceRequestRow[]>();
  if (error) return { error: error.message, rows: [] };
  return { error: null, rows: data ?? [] };
}

// ---------------------------------------------------------------------------
// Bulk email campaigns — admin can send mass announcements to filtered members
// ---------------------------------------------------------------------------

export type BulkEmailFilter = {
  /** Which table this campaign draws recipients from — community members and
   *  corporate members are different tables with different fields, so a
   *  campaign always targets exactly one, never a blend of both. */
  audience: "community" | "corporate";
  membershipTypes?: ("single" | "family")[];
  corporateTiers?: ("gold" | "platinum" | "diamond")[];
  dateRange?: { start: string; end: string };
  includeInactive?: boolean;
  individualMemberIds?: string[];
};

/** Recipients for the "community" audience — real `members` schema columns
 *  only (the previous version queried `first_name`/`active`, neither of
 *  which exist on this table; it silently errored or returned nothing).
 *
 *  individualMemberIds is intentionally NOT applied here — those are
 *  specific people the admin picked by name/email search regardless of
 *  status/type/date, so they're fetched separately (see
 *  individualCommunityRecipients below) and unioned in by sendBulkEmail,
 *  rather than narrowing this filtered query down to just them. */
async function communityRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: BulkEmailFilter
): Promise<{ error: string | null; recipients: { email: string; name: string }[] }> {
  let query = supabase.from("members").select("id, email, name, status, membership_type, created_at");
  if (!filter.includeInactive) query = query.eq("status", "active");
  if (filter.dateRange?.start) query = query.gte("created_at", filter.dateRange.start);
  if (filter.dateRange?.end) query = query.lte("created_at", filter.dateRange.end);

  const { data, error } = await query;
  if (error) return { error: error.message, recipients: [] };

  let rows = data ?? [];
  if (filter.membershipTypes?.length) {
    rows = rows.filter((m) => filter.membershipTypes!.includes(m.membership_type as "single" | "family"));
  }

  // A 2nd+ adult on a Family membership can now have no email at all (see
  // app/join/actions.ts's parseAdults) — nothing to send them.
  const seen = new Set<string>();
  const recipients: { email: string; name: string }[] = [];
  for (const m of rows) {
    if (!m.email) continue;
    const key = m.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push({ email: m.email, name: m.name });
  }
  return { error: null, recipients };
}

/** Recipients for the "corporate" audience — same idea, `corporate_members`.
 *  Same note as communityRecipients above re: individualMemberIds. */
async function corporateRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: BulkEmailFilter
): Promise<{ error: string | null; recipients: { email: string; name: string }[] }> {
  let query = supabase.from("corporate_members").select("id, email, business_name, tier, status, created_at");
  if (!filter.includeInactive) query = query.eq("status", "active");
  if (filter.corporateTiers?.length) query = query.in("tier", filter.corporateTiers);
  if (filter.dateRange?.start) query = query.gte("created_at", filter.dateRange.start);
  if (filter.dateRange?.end) query = query.lte("created_at", filter.dateRange.end);

  const { data, error } = await query;
  if (error) return { error: error.message, recipients: [] };

  const seen = new Set<string>();
  const recipients: { email: string; name: string }[] = [];
  for (const m of data ?? []) {
    if (!m.email) continue;
    const key = m.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push({ email: m.email, name: m.business_name });
  }
  return { error: null, recipients };
}

/** Specific people the admin found via search and added by hand — sent to
 *  regardless of status, membership type, tier, or date range, since
 *  picking someone by name is the admin overriding those filters on
 *  purpose for this one campaign. */
async function individualCommunityRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<{ error: string | null; recipients: { email: string; name: string }[] }> {
  if (ids.length === 0) return { error: null, recipients: [] };
  const { data, error } = await supabase.from("members").select("email, name").in("id", ids);
  if (error) return { error: error.message, recipients: [] };
  return { error: null, recipients: (data ?? []).filter((m) => m.email) };
}

async function individualCorporateRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<{ error: string | null; recipients: { email: string; name: string }[] }> {
  if (ids.length === 0) return { error: null, recipients: [] };
  const { data, error } = await supabase.from("corporate_members").select("email, business_name").in("id", ids);
  if (error) return { error: error.message, recipients: [] };
  return {
    error: null,
    recipients: (data ?? []).filter((m) => m.email).map((m) => ({ email: m.email, name: m.business_name })),
  };
}

export async function sendBulkEmail(
  subject: string,
  message: string,
  filter: BulkEmailFilter,
  attachmentPaths: string[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    const { error: fetchError, recipients: filteredRecipients } =
      filter.audience === "corporate"
        ? await corporateRecipients(supabase, filter)
        : await communityRecipients(supabase, filter);
    if (fetchError) return { error: fetchError };

    const { error: individualError, recipients: individualRecipients } = filter.individualMemberIds?.length
      ? filter.audience === "corporate"
        ? await individualCorporateRecipients(supabase, filter.individualMemberIds)
        : await individualCommunityRecipients(supabase, filter.individualMemberIds)
      : { error: null, recipients: [] };
    if (individualError) return { error: individualError };

    const seen = new Set<string>();
    const recipients: { email: string; name: string }[] = [];
    for (const r of [...filteredRecipients, ...individualRecipients]) {
      const key = r.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      recipients.push(r);
    }

    const { bulkAnnouncementEmail } = await import("@/lib/emails/bulk-announcement");
    const emailHtml = bulkAnnouncementEmail(subject, message);

    for (const recipient of recipients) {
      await mailer.sendMail({
        from: MAIL_FROM,
        to: recipient.email,
        subject,
        html: emailHtml,
      });
    }

    // Log the campaign
    const { error: logError } = await supabase.from("email_campaigns").insert({
      admin_id: user.id,
      subject,
      message,
      recipient_filter: filter,
      attachment_paths: attachmentPaths,
      recipient_count: recipients.length,
    });

    if (logError) return { error: `Emails sent but logging failed: ${logError.message}` };

    revalidatePath("/admin");
    return { error: null, recipientCount: recipients.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getBulkEmailCampaigns() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*")
    .order("sent_at", { ascending: false });
  if (error) return { error: error.message, campaigns: [] };
  return { error: null, campaigns: data || [] };
}

// ---------------------------------------------------------------------------
// Team Members — admin can manage leadership across categories
// ---------------------------------------------------------------------------

async function uploadTeamPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  memberId: string,
) {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return { error: "Photo must be a JPEG, PNG, or WebP file." } as const;

  const buffer = Buffer.from(await file.arrayBuffer());
  const size = imageSizeFromBuffer(buffer);
  if (!size) return { error: "Couldn't read that image file — try a different one." } as const;

  const path = `${memberId}-${Date.now().toString(36)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("team-photos")
    .upload(path, buffer, { contentType: file.type });
  if (uploadError) return { error: uploadError.message } as const;

  const {
    data: { publicUrl },
  } = supabase.storage.from("team-photos").getPublicUrl(path);

  return { error: null, url: publicUrl } as const;
}

function readTeamMemberFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    category: String(formData.get("category") ?? "executive") as "executive" | "founders" | "advisory" | "former_presidents",
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    active: formData.get("active") === "on",
    display_order: parseInt(String(formData.get("display_order") ?? "0"), 10),
    term_start: String(formData.get("term_start") ?? "") || null,
    term_end: String(formData.get("term_end") ?? "") || null,
    is_founder: formData.get("is_founder") === "on",
  };
}

export async function createTeamMember(formData: FormData) {
  const supabase = await createClient();
  const fields = readTeamMemberFields(formData);

  // Generate temporary ID for photo naming
  const tempId = crypto.randomUUID();

  const photo = formData.get("photo");
  let photoData: { photo_path: string } | undefined;
  if (photo instanceof File && photo.size > 0) {
    const result = await uploadTeamPhoto(supabase, photo, tempId);
    if (result.error !== null) return { error: result.error };
    photoData = { photo_path: result.url };
  }

  const { error } = await supabase.from("team_members").insert({ ...fields, ...photoData });
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/team");
  return { error: null };
}

export async function updateTeamMember(id: string, formData: FormData) {
  const supabase = await createClient();
  const fields = readTeamMemberFields(formData);

  const photo = formData.get("photo");
  let photoData: { photo_path: string } | undefined;
  if (photo instanceof File && photo.size > 0) {
    const result = await uploadTeamPhoto(supabase, photo, id);
    if (result.error !== null) return { error: result.error };
    photoData = { photo_path: result.url };
  }

  const { error } = await supabase.from("team_members").update({ ...fields, ...photoData }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/team");
  return { error: null };
}

export async function deleteTeamMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/team");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Community Members — the admin dashboard has never had a Members tab.
// Registration/renewal itself is public (see app/join/actions.ts); this is
// read-only admin lookup plus a resend-confirmation mitigation, backed by
// the case-insensitive indexes added in 0020_admin_search_and_upload_limits.sql.
// ---------------------------------------------------------------------------

/** Escapes ILIKE wildcards so a literal "%" or "_" typed by the admin (rare,
 *  but possible in a business/suburb name) doesn't act as a pattern. */
function escapeIlike(s: string): string {
  return s.replace(/[%_]/g, "\\$&");
}

/** Runs name/email/CID/member-number lookups in parallel and merges by id,
 *  rather than one query with a comma-joined `.or()` filter string.
 *
 *  The previous version branched on "does the query contain any digit" to
 *  decide between a member-number search and a name/email search — but
 *  most real email addresses contain a digit somewhere (gmail addresses
 *  routinely do), so searching by email silently took the member-number
 *  branch and matched nothing. Running every applicable lookup at once
 *  removes that branching entirely: a query is checked against name,
 *  email, and CID regardless of whether it happens to contain digits, and
 *  additionally against member_no when it parses as one. */
export async function searchMembers(query: string): Promise<{ error: string | null; results: MemberRow[] }> {
  const q = query.trim();
  if (!q) return { error: null, results: [] };

  const supabase = await createClient();
  const escaped = escapeIlike(q);
  const digitsOnly = q.replace(/\D/g, "");
  const digitGroups = q.match(/\d+/g);
  // "ABAC-2026-000123" or a bare number both mean member_no 123 — the last
  // digit run in the query, since the year (if present) comes first.
  const memberNo = digitGroups ? Number(digitGroups[digitGroups.length - 1]) : null;

  const lookups = [
    supabase.from("members").select("*").ilike("name", `%${escaped}%`).limit(50).returns<MemberRow[]>(),
    supabase.from("members").select("*").ilike("email", `%${escaped}%`).limit(50).returns<MemberRow[]>(),
  ];
  if (digitsOnly) {
    lookups.push(
      supabase.from("members").select("*").ilike("cid", `%${digitsOnly}%`).limit(50).returns<MemberRow[]>()
    );
  }
  if (memberNo !== null && Number.isSafeInteger(memberNo) && memberNo > 0) {
    lookups.push(
      supabase.from("members").select("*").eq("member_no", memberNo).limit(1).returns<MemberRow[]>()
    );
  }

  const responses = await Promise.all(lookups);
  const failed = responses.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message, results: [] };

  const merged = new Map<string, MemberRow>();
  for (const r of responses) {
    for (const row of r.data ?? []) merged.set(row.id, row);
  }

  const results = [...merged.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);

  return { error: null, results };
}

export async function deleteMember(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export type MemberDetail = {
  member: MemberRow;
  household: MemberRow[];
  servicesAvailed: ServiceRequestRow[];
};

/** service_requests has no member_id FK — only a free-text email, since it
 *  predates any notion of "is this requester a member" (that came later, in
 *  0019_service_member_pricing.sql, as a point-in-time claim, not a link).
 *  Joining by email here is a deliberate, read-only admin convenience: it
 *  surfaces every service request this person ever made, whether or not
 *  they claimed the member rate that specific time. Two members who happen
 *  to share one email (rare, not blocked by any constraint) would each see
 *  the other's requests in this view — acceptable for an admin-only lookup,
 *  not something exposed publicly. */
export async function getMemberDetail(id: string): Promise<{ error: string | null; detail: MemberDetail | null }> {
  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single<MemberRow>();
  if (memberError) return { error: memberError.message, detail: null };

  const household = member.household_id
    ? await supabase
        .from("members")
        .select("*")
        .eq("household_id", member.household_id)
        .order("is_dependent", { ascending: true })
        .returns<MemberRow[]>()
    : { data: [member] as MemberRow[], error: null };
  if (household.error) return { error: household.error.message, detail: null };

  const services = await supabase
    .from("service_requests")
    .select("*")
    .ilike("email", member.email)
    .order("created_at", { ascending: false })
    .returns<ServiceRequestRow[]>();
  if (services.error) return { error: services.error.message, detail: null };

  return {
    error: null,
    detail: { member, household: household.data ?? [member], servicesAvailed: services.data ?? [] },
  };
}

/** Mitigation for "the welcome email didn't arrive" — re-sends the exact
 *  same template from the member's current stored row. Doesn't diagnose
 *  *why* the original send failed (most likely a Gmail SMTP credential
 *  issue in the deployed environment, not a code bug — see the note on
 *  lib/mail.ts), just gives the admin a way to try again without asking
 *  the member to re-register. */
export async function resendMembershipConfirmation(memberId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: member, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .single<MemberRow>();
  if (error) return { error: error.message };
  if (member.status !== "active") return { error: "This member isn't active yet — nothing to confirm." };

  let household: { name: string; memberNo: string }[] = [];
  let dependents: { name: string; memberNo: string }[] = [];
  if (member.household_id) {
    const { data: rows } = await supabase
      .from("members")
      .select("*")
      .eq("household_id", member.household_id)
      .returns<MemberRow[]>();
    const others = (rows ?? []).filter((r) => r.id !== member.id);
    household = others
      .filter((r) => !r.is_dependent)
      .map((r) => ({ name: r.name, memberNo: formatMemberNo(r.member_no, new Date(r.joined_at ?? r.created_at).getFullYear()) }));
    dependents = others
      .filter((r) => r.is_dependent)
      .map((r) => ({ name: r.name, memberNo: formatMemberNo(r.member_no, new Date(r.joined_at ?? r.created_at).getFullYear()) }));
  }

  try {
    const isFamily = member.membership_type === "family";
    const fee = isFamily ? "$30 AUD Annually (family membership)" : `$${(member.fee_cents / 100).toFixed(0)} AUD Annually`;
    const { subject, text, html } = welcomeEmail({
      name: member.name,
      memberNo: formatMemberNo(member.member_no, new Date(member.joined_at ?? member.created_at).getFullYear()),
      fee,
      validUntil: member.expires_at ? formatDate(member.expires_at) : "—",
      kind: "renewal",
      isFamily,
      household: household.length > 0 ? household : undefined,
      dependents: dependents.length > 0 ? dependents : undefined,
    });
    await mailer.sendMail({ from: MAIL_FROM, to: member.email, subject, text, html });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't send the email — please try again." };
  }
  return { error: null };
}

export type MembersExportFilter = {
  dateRange?: { start: string; end: string };
  status?: "active" | "inactive"; // "inactive" = expired or pending
  membershipType?: "single" | "family";
};

/** A member's DB `status` only flips from 'active' to 'expired' once a day,
 *  when the expiry-reminder cron calls mark_member_expiry_reminder_sent
 *  (0008_membership_expiry_reminders.sql) — so a membership that expired
 *  earlier today can still read `status = 'active'` for up to 24 hours.
 *  MembersDashboard.tsx's statusLabel() already cross-checks expires_at
 *  for on-screen display; this applies the same rule to "Active only" /
 *  "Inactive only" so the export can't disagree with what the admin just
 *  saw in the search results for the same member. */
function isEffectivelyActive(m: MemberRow): boolean {
  if (m.status !== "active") return false;
  if (m.expires_at && new Date(m.expires_at) < new Date()) return false;
  return true;
}

export async function getMembersForExport(filter: MembersExportFilter): Promise<{ error: string | null; rows: MemberRow[] }> {
  const supabase = await createClient();
  let query = supabase.from("members").select("*").order("created_at", { ascending: false });

  if (filter.dateRange?.start) query = query.gte("created_at", filter.dateRange.start);
  if (filter.dateRange?.end) query = query.lte("created_at", filter.dateRange.end);
  if (filter.membershipType) query = query.eq("membership_type", filter.membershipType);

  const { data, error } = await query.returns<MemberRow[]>();
  if (error) return { error: error.message, rows: [] };

  let rows = data ?? [];
  if (filter.status === "active") rows = rows.filter(isEffectivelyActive);
  if (filter.status === "inactive") rows = rows.filter((m) => !isEffectivelyActive(m));

  return { error: null, rows };
}

// ---------------------------------------------------------------------------
// Corporate Members — search, manual add, delete, CSV export, and business
// certificate viewing. Approve/reject/logo already existed above; these
// extend the same tab with the same admin-only access model.
// ---------------------------------------------------------------------------

/** Parallel per-field lookups merged by id, same shape as searchMembers —
 *  a single `.or()` filter string is what silently broke email search
 *  there (a query containing a digit skipped the name/email branch
 *  entirely) and is separately fragile here too: a business name or ABN
 *  containing a comma would prematurely split the `.or()` DSL into extra,
 *  malformed clauses. Four independent ilike queries have no such failure
 *  mode regardless of what characters the query contains. */
export async function searchCorporateMembers(query: string): Promise<{ error: string | null; results: CorporateMemberRow[] }> {
  const q = query.trim();
  if (!q) return { error: null, results: [] };
  const escaped = q.replace(/[%_]/g, "\\$&");

  const supabase = await createClient();
  const lookups = (["business_name", "contact_name", "email", "abn"] as const).map((column) =>
    supabase.from("corporate_members").select("*").ilike(column, `%${escaped}%`).limit(50).returns<CorporateMemberRow[]>()
  );

  const responses = await Promise.all(lookups);
  const failed = responses.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message, results: [] };

  const merged = new Map<string, CorporateMemberRow>();
  for (const r of responses) {
    for (const row of r.data ?? []) merged.set(row.id, row);
  }

  const results = [...merged.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);

  return { error: null, results };
}

/** Backfills a sponsor who's already agreed to support ABAC offline (e.g.
 *  paid in person, or the application came in by phone/email rather than
 *  the public form). Inserted as 'pending' through the exact same
 *  public-insert RLS policy the form itself uses — admin has no special
 *  insert privilege here, only the same shape every application takes.
 *  Still needs the normal Approve step (Stripe payment link) before it's
 *  active — this does not skip payment. */
export async function createCorporateMemberManually(formData: FormData): Promise<{ error: string | null }> {
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
    return { error: "Please fill in business name, contact name, email, and phone." };
  }
  if (!["diamond", "platinum", "gold"].includes(tier)) {
    return { error: "Please choose a membership tier." };
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
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function deleteCorporateMember(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("corporate_members").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/partners");
  return { error: null };
}

export type CorporateExportFilter = {
  tiers?: ("gold" | "platinum" | "diamond")[];
  statuses?: ("pending" | "approved" | "active" | "rejected")[];
  dateRange?: { start: string; end: string };
};

export async function getCorporateMembersForExport(
  filter: CorporateExportFilter
): Promise<{ error: string | null; rows: CorporateMemberRow[] }> {
  const supabase = await createClient();
  let query = supabase.from("corporate_members").select("*").order("created_at", { ascending: false });

  if (filter.tiers?.length) query = query.in("tier", filter.tiers);
  if (filter.statuses?.length) query = query.in("status", filter.statuses);
  if (filter.dateRange?.start) query = query.gte("created_at", filter.dateRange.start);
  if (filter.dateRange?.end) query = query.lte("created_at", filter.dateRange.end);

  const { data, error } = await query.returns<CorporateMemberRow[]>();
  if (error) return { error: error.message, rows: [] };
  return { error: null, rows: data ?? [] };
}

/** Generalizes getServiceDocumentUrl (below stays as a thin wrapper so
 *  ServiceRequestsDashboard.tsx doesn't need to change) — any private
 *  document bucket, viewed via a short-lived signed URL from the signed-in
 *  admin's own session, never a stored public path. */
export async function getSignedDocumentUrl(
  bucket: string,
  path: string,
  expirySeconds = 300
): Promise<{ error: string | null; url: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expirySeconds);
  if (error) return { error: error.message, url: null };
  return { error: null, url: data.signedUrl };
}

export async function hideCorporatePartner(id: string, hidden: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("corporate_members").update({ hidden_from_partners: hidden }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/partners");
  return { error: null };
}
