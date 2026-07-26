"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { imageSizeFromBuffer } from "@/lib/image-size";

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
