import type { SupabaseClient } from "@supabase/supabase-js";

/** Best-effort Storage cleanup — a Storage hiccup must never make a caller's
 *  primary action (a purge, historically a delete) appear to fail when the
 *  database side of it already succeeded, so this only ever logs, never
 *  throws or returns an error.
 *
 *  Used only by the purge cron (app/api/admin/purge-deleted/route.ts) —
 *  /admin's delete actions soft-delete (set deleted_at) rather than removing
 *  a row outright, so a file must stay in Storage until the row is actually
 *  purged 30 days later; deleting it any earlier would break a restore. */
export async function removeStorageObjects(
  supabase: SupabaseClient,
  bucket: string,
  paths: (string | null | undefined)[]
) {
  const keys = paths.filter((p): p is string => !!p);
  if (keys.length === 0) return;
  try {
    await supabase.storage.from(bucket).remove(keys);
  } catch (err) {
    console.error(`storage cleanup failed (${bucket}):`, err);
  }
}

/** Public-bucket *_path fields store the full getPublicUrl() result, not a
 *  bare object key — this recovers the key so it can be passed to
 *  storage.remove(). Returns null for anything that isn't actually a
 *  Storage URL in this bucket, e.g. team_members' seeded local /img/...
 *  paths (0023_team_members_seed.sql), which were never uploaded to
 *  Storage and must never be "removed" from it. */
export function storageKeyFromPublicUrl(bucket: string, url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(url.slice(idx + marker.length));
  } catch {
    return null;
  }
}
