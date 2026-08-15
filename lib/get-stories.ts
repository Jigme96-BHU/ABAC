import { createClient } from "@/lib/supabase/server";
import { STORIES, type Story } from "@/content/stories";
import type { StoryRow, StoryImageRow } from "@/lib/supabase/types";

function fromStoryRow(row: StoryRow, galleryImages: StoryImageRow[]): Story {
  // The gallery already includes the cover (display_order 0), so `images`
  // only needs the rest — the detail page renders `image` first, then
  // `images`, and a single-photo story never populates this at all.
  const extra = galleryImages.filter((img) => img.path !== row.image_path);
  return {
    slug: row.slug,
    title: row.title,
    date: row.date,
    image: row.image_path,
    imageWidth: row.image_width ?? undefined,
    imageHeight: row.image_height ?? undefined,
    video: row.video_path ?? undefined,
    images: extra.length > 0 ? extra.map((img) => ({ path: img.path, width: img.width ?? undefined, height: img.height ?? undefined })) : undefined,
    excerpt: row.excerpt,
    // admin's textarea uses blank lines between paragraphs, same convention
    // as the WordPress-migrated stories in content/stories.ts
    body: row.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
  };
}

/** The full public story feed: the historical WordPress-migrated posts
 *  (content/stories.ts, static) plus whatever the committee has added since
 *  through /admin (Supabase), newest first. */
export async function getAllStories(): Promise<Story[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("published", true)
    .order("date", { ascending: false })
    .returns<StoryRow[]>();

  const rows = data ?? [];
  const imagesByStory = new Map<string, StoryImageRow[]>();
  if (rows.length > 0) {
    const { data: imageRows } = await supabase
      .from("story_images")
      .select("*")
      .in("story_id", rows.map((r) => r.id))
      .order("display_order", { ascending: true })
      .returns<StoryImageRow[]>();

    for (const img of imageRows ?? []) {
      imagesByStory.set(img.story_id, [...(imagesByStory.get(img.story_id) ?? []), img]);
    }
  }

  const fromDb = rows.map((row) => fromStoryRow(row, imagesByStory.get(row.id) ?? []));
  return [...fromDb, ...STORIES].sort((a, b) => b.date.localeCompare(a.date));
}
