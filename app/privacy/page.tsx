import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy statement",
};

/** STUB. A real privacy statement is a launch blocker once the join form
 *  starts collecting names, addresses and dates of birth — see the Australian
 *  Privacy Act notes in HANDOVER.md. This page exists so the footer link
 *  resolves; the committee needs to supply the actual text. */
export default function PrivacyPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <h2 style={{ fontSize: 32, marginBottom: 16 }}>Privacy statement</h2>
          <div className="notice warn">
            <strong>Not written yet.</strong> This page must be completed before the site
            collects any personal information.
          </div>
          <p style={{ marginTop: 20, color: "var(--ink-soft)" }}>
            It will need to cover what member data ABAC collects, where it is stored, who on
            the committee can see it, how long it is kept, and how a member can ask for
            their record to be corrected or deleted.
          </p>
        </div>
      </section>
    </main>
  );
}
