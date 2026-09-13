import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeStorageObjects, storageKeyFromPublicUrl } from "@/lib/storage-cleanup";

export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || cronSecret === secret;
}

type ExpiredStory = { id: string; image_path: string | null; video_path: string | null; gallery_paths: string[] };
type ExpiredDocument = { id: string; file_path: string | null };
type ExpiredTeamMember = { id: string; photo_path: string | null };
type ExpiredCorporateMember = { id: string; logo_path: string | null; business_certificate_path: string | null };
type ExpiredServiceRequest = {
  id: string;
  passport_path: string | null;
  visa_path: string | null;
  photo_id_path: string | null;
  proof_of_residency_path: string | null;
};

/** Runs once a day (see vercel.json). Anything soft-deleted in /admin more
 *  than 30 days ago and never restored is permanently removed here — the
 *  database row via a single SECURITY DEFINER RPC (FK cascades handle each
 *  row's dependents: story_images, member_checkouts), and its Storage
 *  files (fetched first, since the delete would otherwise take the only
 *  record of their paths with it) via the same best-effort cleanup used
 *  everywhere else in this project. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [storiesRes, documentsRes, teamMembersRes, corporateMembersRes, serviceRequestsRes] = await Promise.all([
    supabase.rpc("get_expired_stories", { p_cutoff: cutoff }),
    supabase.rpc("get_expired_documents", { p_cutoff: cutoff }),
    supabase.rpc("get_expired_team_members", { p_cutoff: cutoff }),
    supabase.rpc("get_expired_corporate_members", { p_cutoff: cutoff }),
    supabase.rpc("get_expired_service_requests", { p_cutoff: cutoff }),
  ]);

  // Cast rather than chaining .returns<T[]>() — mixing several differently
  // typed .returns() calls inside one Promise.all confuses supabase-js's
  // (untyped-Database) inference into flagging them as invalid array casts.
  const stories = (storiesRes.data ?? []) as ExpiredStory[];
  const documents = (documentsRes.data ?? []) as ExpiredDocument[];
  const teamMembers = (teamMembersRes.data ?? []) as ExpiredTeamMember[];
  const corporateMembers = (corporateMembersRes.data ?? []) as ExpiredCorporateMember[];
  const serviceRequests = (serviceRequestsRes.data ?? []) as ExpiredServiceRequest[];

  const counts = {
    stories: stories.length,
    documents: documents.length,
    teamMembers: teamMembers.length,
    corporateMembers: corporateMembers.length,
    serviceRequests: serviceRequests.length,
  };

  // Storage cleanup before the row delete — best-effort, never blocks the
  // purge itself, same reasoning as every other Storage cleanup in this
  // project (a Storage hiccup must never leave orphaned rows behind).
  await Promise.all([
    ...stories.flatMap((s) => [
      removeStorageObjects(supabase, "story-images", [
        storageKeyFromPublicUrl("story-images", s.image_path),
        ...s.gallery_paths.map((p) => storageKeyFromPublicUrl("story-images", p)),
      ]),
      removeStorageObjects(supabase, "story-videos", [storageKeyFromPublicUrl("story-videos", s.video_path)]),
    ]),
    ...documents.map((d) =>
      removeStorageObjects(supabase, "documents", [storageKeyFromPublicUrl("documents", d.file_path)])
    ),
    ...teamMembers.map((t) =>
      removeStorageObjects(supabase, "team-photos", [storageKeyFromPublicUrl("team-photos", t.photo_path)])
    ),
    ...corporateMembers.flatMap((c) => [
      removeStorageObjects(supabase, "corporate-logos", [storageKeyFromPublicUrl("corporate-logos", c.logo_path)]),
      // business_certificate_path is already a bare Storage path — that bucket is private.
      removeStorageObjects(supabase, "corporate-documents", [c.business_certificate_path]),
    ]),
    ...serviceRequests.map((r) =>
      // All four are already bare Storage paths — service-documents is private.
      removeStorageObjects(supabase, "service-documents", [
        r.passport_path,
        r.visa_path,
        r.photo_id_path,
        r.proof_of_residency_path,
      ])
    ),
  ]);

  const { error: purgeError } = await supabase.rpc("purge_expired_soft_deletes", { p_cutoff: cutoff });
  if (purgeError) {
    return NextResponse.json({ error: purgeError.message, counts }, { status: 500 });
  }

  return NextResponse.json({ cutoff, purged: counts });
}
