import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Committee sign-in",
  robots: { index: false, follow: false },
};

/** The prototype's admin portal signed you in by clicking a button — no
 *  password, no check, with a member list behind it. It is NOT ported.
 *  Phase 2 builds this on Supabase magic-link auth with an admin role and
 *  row-level security. Until then this route is a stub so the footer link
 *  doesn't 404. */
export default function AdminPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card">
            <span className="dz-eyebrow">འཛིན་སྐྱོང</span>
            <h2>Committee sign-in</h2>
            <p className="form-sub">
              The committee portal — member records, payments and service requests — is not
              built yet.
            </p>
            <div className="notice warn">
              Sign-in will use a one-time email link, so there is no shared committee
              password to lose at handover.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
