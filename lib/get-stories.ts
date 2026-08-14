import { createClient } from "@/lib/supabase/server";
import { STORIES, type Story } from "@/content/stories";
import type { StoryRow } from "@/lib/supabase/types";

function fromStoryRow(row: StoryRow): Story {
  return {
    slug: row.slug,
    title: row.title,
    date: row.date,
    image: row.image_path,
    imageWidth: row.image_width ?? undefined,
    imageHeight: row.image_height ?? undefined,
    video: row.video_path ?? undefined,
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

  const fromDb = (data ?? []).map(fromStoryRow);
  return [...fromDb, ...STORIES].sort((a, b) => b.date.localeCompare(a.date));
}
