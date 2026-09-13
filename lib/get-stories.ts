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
 *  through /admin (Supabase), newest first.
 *
 *  Pass `limit` for a "just the top N" caller (the homepage's latest-4):
 *  the DB query is capped at `limit` rows too, not just the returned array
 *  — safe because rows come back date-descending, so the DB's own top
 *  `limit` can never exclude a row that belongs in the combined top
 *  `limit` (anything past row `limit` is older than all of them). Without
 *  this, a caller that only wants 4 stories would still make the query and
 *  the page keep fetching every story (and every gallery image) ever
 *  published, forever, as the committee's archive grows. */
export async function getAllStories(limit?: number): Promise<Story[]> {
  const supabase = await createClient();
  let query = supabase
    .from("stories")
    .select("*")
    .eq("published", true)
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query.returns<StoryRow[]>();

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
  const all = [...fromDb, ...STORIES].sort((a, b) => b.date.localeCompare(a.date));
  return limit ? all.slice(0, limit) : all;
}

/** A single story by slug, for the detail page — queries just that one row
 *  (and its own gallery images) instead of fetching the entire story feed
 *  to `.find()` one out of it. */
export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const fromStatic = STORIES.find((s) => s.slug === slug);
  if (fromStatic) return fromStatic;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("stories")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle<StoryRow>();
  if (!row) return null;

  const { data: imageRows } = await supabase
    .from("story_images")
    .select("*")
    .eq("story_id", row.id)
    .order("display_order", { ascending: true })
    .returns<StoryImageRow[]>();

  return fromStoryRow(row, imageRows ?? []);
}
