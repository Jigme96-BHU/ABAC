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

  const [
    { data: events },
    { data: stories },
    { data: documents },
    { data: volunteers },
    { data: corporateMembers },
    { data: serviceRequests },
    { data: teamMembers },
  ] = await Promise.all([
    supabase.from("events").select("*").order("date", { ascending: true }).returns<EventRow[]>(),
    supabase.from("stories").select("*").order("date", { ascending: false }).returns<StoryRow[]>(),
    supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<DocumentRow[]>(),
    supabase
      .from("volunteers")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<VolunteerRow[]>(),
    supabase
      .from("corporate_members")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<CorporateMemberRow[]>(),
    supabase
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<ServiceRequestRow[]>(),
    supabase
      .from("team_members")
      .select("*")
      .order("category", { ascending: true })
      .order("display_order", { ascending: true })
      .returns<TeamMemberRow[]>(),
  ]);

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
          />
        </div>
      </section>
    </main>
  );
}
