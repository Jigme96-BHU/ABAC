/** Shape of a row from the `events` table (supabase/migrations/0001_events_admin.sql).
 *  Kept separate from content/events.ts's ABACEvent, which is the public-site
 *  rendering shape — the two are close but not identical (nulls vs undefined). */
export type EventRow = {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  time: string | null;
  location: string;
  note: string | null;
  access: "open" | "members";
  cta: "rsvp" | "volunteer" | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

/** Shape of a row from the `event_rsvps` table (supabase/migrations/0021_event_rsvps.sql). */
export type EventRsvpRow = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
};

/** Shape of a row from the `stories` table (supabase/migrations/0002_stories.sql, extended by 0015_story_videos.sql). */
export type StoryRow = {
  id: string;
  slug: string;
  title: string;
  date: string; // yyyy-mm-dd
  excerpt: string;
  body: string; // paragraphs separated by blank lines
  image_path: string | null; // public Storage URL, not a local /public path
  image_width: number | null;
  image_height: number | null;
  video_path: string | null; // public Storage URL to MP4/WebM/MOV video
  video_size: number | null; // bytes
  video_duration: number | null; // seconds
  published: boolean;
  created_at: string;
  updated_at: string;
};

/** Shape of a row from the `story_images` table (supabase/migrations/0024_story_images.sql).
 *  Row with the lowest display_order for a story is its "cover" — mirrored
 *  onto stories.image_path/image_width/image_height for backward compatibility. */
export type StoryImageRow = {
  id: string;
  story_id: string;
  path: string; // public Storage URL, same bucket as stories.image_path
  width: number | null;
  height: number | null;
  display_order: number;
  created_at: string;
};

/** Shape of a row from the `members` table (supabase/migrations/0003_members.sql,
 *  0004_member_number.sql, 0009_family_membership.sql). */
export type MemberRow = {
  id: string;
  email: string;
  name: string;
  gender: string | null;
  date_of_birth: string; // yyyy-mm-dd
  cid: string;
  phone: string | null;
  suburb: string | null;
  fee_cents: number;
  status: "pending" | "active" | "expired";
  stripe_checkout_session_id: string | null;
  member_no: number;
  household_id: string | null;
  membership_type: "single" | "family";
  is_dependent: boolean;
  joined_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Shape of a row from the `volunteers` table (supabase/migrations/0011_volunteers.sql). */
export type VolunteerRow = {
  id: string;
  name: string;
  sex: string;
  date_of_birth: string; // yyyy-mm-dd
  cid: string;
  phone: string;
  email: string;
  is_minor: boolean;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  guardian_consent: boolean;
  created_at: string;
  updated_at: string;
};

/** Shape of a row from the `corporate_members` table (supabase/migrations/0012_corporate_membership.sql). */
export type CorporateMemberRow = {
  id: string;
  business_name: string;
  abn: string | null;
  website: string | null;
  contact_name: string;
  contact_role: string | null;
  email: string;
  phone: string;
  address: string | null;
  notes: string | null;
  tier: "diamond" | "platinum" | "gold";
  status: "pending" | "approved" | "active" | "rejected";
  stripe_checkout_session_id: string | null;
  fee_cents: number | null;
  logo_path: string | null; // admin-managed public Storage URL
  business_certificate_path: string | null; // private Storage path — view via a signed URL (0022_corporate_business_certificate.sql)
  hidden_from_partners: boolean; // display-only toggle, independent of status (0022_corporate_business_certificate.sql)
  joined_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Shape of a row from the `service_requests` table (supabase/migrations/0013_service_requests.sql).
 *  All *_path fields are private Storage paths, not public URLs — view them
 *  via a signed URL (see app/admin/actions.ts's getServiceDocumentUrl). */
export type ServiceRequestRow = {
  id: string;
  service_type: "letter_of_residency" | "character_reference";
  requester_name: string;
  email: string;
  phone: string;
  passport_path: string;
  visa_path: string | null;
  photo_id_path: string | null;
  proof_of_residency_path: string | null;
  member_no: number | null;
  is_member: boolean;
  notes: string | null;
  fee_cents: number;
  status: "pending" | "active";
  stripe_checkout_session_id: string | null;
  rendered_document_path: string | null; // private Storage path — the finished letter, admin-uploaded (0026_service_request_fulfillment.sql)
  fulfilled_at: string | null; // set when the rendered document was emailed to the requester
  created_at: string;
  updated_at: string;
};

/** Shape of a row from the `documents` table (supabase/migrations/0010_documents.sql). */
export type DocumentRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_path: string; // public Storage URL, not a local /public path
  file_name: string; // original filename, shown/used for the download
  file_size: number | null; // bytes
  published: boolean;
  created_at: string;
  updated_at: string;
};

/** Shape of a row from the `team_members` table (supabase/migrations/0016_team_members.sql). */
export type TeamMemberRow = {
  id: string;
  name: string;
  role: string;
  category: "executive" | "founders" | "advisory" | "former_presidents";
  email: string | null;
  phone: string | null;
  bio: string | null;
  photo_path: string | null; // public Storage URL
  display_order: number;
  active: boolean;
  term_start: string | null; // yyyy-mm-dd
  term_end: string | null; // yyyy-mm-dd
  is_founder: boolean; // former_presidents only — whether they also founded ABAC (0023_team_members_seed.sql)
  created_at: string;
  updated_at: string;
};
