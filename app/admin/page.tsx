import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/admin/LoginForm";
import SignOutButton from "@/components/admin/SignOutButton";
import AdminTabs from "@/components/admin/AdminTabs";
import type {
  EventRow,
  StoryRow,
  DocumentRow,
  VolunteerRow,
  CorporateMemberRow,
  ServiceRequestRow,
  TeamMemberRow,
  MemberRow,
} from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Committee sign-in",
  robots: { index: false, follow: false },
};

/** Magic-link sign-in gated by the `admins` allowlist table — see
 *  supabase/migrations/0001_events_admin.sql. There is no shared password:
 *  each committee member signs in with their own email, and adding/removing
 *  an admin at handover is one row in that table. */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <section className="block">
          <div className="wrap">
            <div className="form-card">
              <span className="dz-eyebrow">འཛིན་སྐྱོང་།</span>
              <h2>Committee sign-in</h2>
              <p className="form-sub">
                Enter your committee email and we&apos;ll send you a one-time sign-in link — no
                password to remember or lose at handover.
              </p>
              <LoginForm />
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    return (
      <main>
        <section className="block">
          <div className="wrap">
            <div className="form-card">
              <h2>Not an approved admin</h2>
              <p className="form-sub">
                You&apos;re signed in as <strong>{user.email}</strong>, but this address isn&apos;t
                on the committee admin list. Ask an existing admin to add you, or contact{" "}
                <a href="mailto:bhutancanberra@gmail.com">bhutancanberra@gmail.com</a>.
              </p>
              <SignOutButton />
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Promise.allSettled, not .all — these 8 tabs' data is otherwise
  // independent, so one query having a bad moment (a transient Supabase
  // hiccup, a rate limit) must not take down every other tab too. A plain
  // Promise.all rejects the instant any one of them rejects, which crashed
  // this entire page — for every tab, not just the affected one — any time
  // that happened to be the one that failed. See settle() below: a
  // rejection degrades to an empty/zero result and a server-side log line,
  // never a thrown error that reaches the render.
  function settle<T>(result: PromiseSettledResult<{ data: T | null; error: unknown }>, label: string): T | null {
    if (result.status === "rejected") {
      console.error(`/admin: ${label} query failed:`, result.reason);
      return null;
    }
    if (result.value.error) {
      console.error(`/admin: ${label} query returned an error:`, result.value.error);
    }
    return result.value.data;
  }

  const [
    eventsResult,
    storiesResult,
    documentsResult,
    volunteersResult,
    corporateMembersResult,
    serviceRequestsResult,
    teamMembersResult,
    membersResult,
  ] = await Promise.allSettled([
    // Every query below excludes soft-deleted rows (0031_soft_delete_and_trash.sql)
    // — a deleted row moves to that tab's "Recently deleted" panel instead
    // (fetched on demand via getDeletedX(), not preloaded here), so it must
    // never show up in the main list.
    supabase.from("events").select("*").is("deleted_at", null).order("date", { ascending: true }).returns<EventRow[]>(),
    supabase.from("stories").select("*").is("deleted_at", null).order("date", { ascending: false }).returns<StoryRow[]>(),
    supabase
      .from("documents")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .returns<DocumentRow[]>(),
    supabase
      .from("volunteers")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .returns<VolunteerRow[]>(),
    supabase
      .from("corporate_members")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .returns<CorporateMemberRow[]>(),
    supabase
      .from("service_requests")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .returns<ServiceRequestRow[]>(),
    supabase
      .from("team_members")
      .select("*")
      .is("deleted_at", null)
      .order("category", { ascending: true })
      .order("display_order", { ascending: true })
      .returns<TeamMemberRow[]>(),
    // Bounded to the most recent 50 — the Members tab is search-first (CID,
    // DOB, and phone are sensitive, so unlike every other tab here it isn't
    // meant to dump the whole PII-heavy register on load) but it still needs
    // *some* default view, otherwise a brand-new registration looks "missing"
    // until an admin thinks to search for it by name/email/CID/member no.
    supabase
      .from("members")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<MemberRow[]>(),
  ]);

  const events = settle(eventsResult, "events");
  const stories = settle(storiesResult, "stories");
  const documents = settle(documentsResult, "documents");
  const volunteers = settle(volunteersResult, "volunteers");
  const corporateMembers = settle(corporateMembersResult, "corporate_members");
  const serviceRequests = settle(serviceRequestsResult, "service_requests");
  const teamMembers = settle(teamMembersResult, "team_members");
  const members = settle(membersResult, "members");
  const memberCount = membersResult.status === "fulfilled" ? membersResult.value.count : null;

  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div>
              <span className="dz-eyebrow">འཛིན་སྐྱོང་།</span>
              <h2 style={{ marginBottom: 4 }}>Admin</h2>
              <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Signed in as {user.email}</p>
            </div>
            <SignOutButton />
          </div>
          <AdminTabs
            events={events ?? []}
            stories={stories ?? []}
            documents={documents ?? []}
            volunteers={volunteers ?? []}
            corporateMembers={corporateMembers ?? []}
            serviceRequests={serviceRequests ?? []}
            teamMembers={teamMembers ?? []}
            recentMembers={members ?? []}
            memberCount={memberCount ?? members?.length ?? 0}
          />
        </div>
      </section>
    </main>
  );
}
