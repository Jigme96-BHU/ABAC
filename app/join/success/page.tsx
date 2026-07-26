import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMemberNo } from "@/lib/member-number";

export const metadata: Metadata = {
  title: "Welcome to ABAC",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ session_id?: string; member_id?: string }> };

/** Never trusts the browser redirect as proof of payment — Stripe's webhook
 *  is the only thing that actually activates a paid membership (see
 *  app/api/stripe/webhook/route.ts). This page just checks the real status,
 *  which may briefly still say "pending" if the webhook hasn't landed yet.
 *  Free (under-18) memberships activate immediately on submission, so they
 *  show as active straight away — looked up by member id instead of a
 *  Stripe session, since there isn't one. */
export default async function JoinSuccessPage({ searchParams }: Props) {
  const { session_id, member_id } = await searchParams;

  if (!session_id && !member_id) {
    return (
      <Notice
        title="We couldn't find that registration"
        body="If you completed a payment, email bhutancanberra@gmail.com with your name and we'll confirm it."
        warn
      />
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .rpc("get_membership_confirmation", {
      p_session_id: session_id ?? null,
      p_member_id: member_id ?? null,
    })
    .returns<{ status: string; member_no: number; member_year: number }[]>()
    .maybeSingle();

  if (data?.status === "active") {
    const memberNo = formatMemberNo(data.member_no, data.member_year);
    return (
      <Notice
        title="Welcome to ABAC!"
        body={`Your membership is active for the next year. Your membership number is ${memberNo} — keep it for your records.`}
      />
    );
  }

  return (
    <Notice
      title="Confirming your payment…"
      body="Stripe has processed your payment, but our system hasn't confirmed it quite yet — this
      is usually seconds, occasionally a couple of minutes. Refresh this page shortly, or email
      bhutancanberra@gmail.com if it doesn't update."
      warn
    />
  );
}

function Notice({ title, body, warn = false }: { title: string; body: string; warn?: boolean }) {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card" style={{ textAlign: "center" }}>
            <h2>{title}</h2>
            <p className={warn ? "notice warn" : "notice ok"} style={{ marginTop: 16 }}>
              {body}
            </p>
            <Link className="btn btn-ghost" style={{ marginTop: 20 }} href="/">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
