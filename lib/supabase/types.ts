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

/** Shape of a row from the `stories` table (supabase/migrations/0002_stories.sql). */
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
  published: boolean;
  created_at: string;
  updated_at: string;
};

/** Shape of a row from the `members` table (supabase/migrations/0003_members.sql,
 *  0004_member_number.sql). */
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
  joined_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};
