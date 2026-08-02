import type { Metadata } from "next";
import type { ReactNode } from "react";
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
    .returns<{ status: string; member_no: number; member_year: number; name: string }[]>();

  const rows: { status: string; member_no: number; member_year: number; name: string }[] = Array.isArray(data)
    ? data
    : [];

  if (rows.length > 0 && rows.every((r) => r.status === "active")) {
    if (rows.length === 1) {
      const memberNo = formatMemberNo(rows[0].member_no, rows[0].member_year);
      return (
        <Notice
          title="Welcome to ABAC!"
          body={`Welcome! Your annual membership is now active. Your membership number is ${memberNo}. We’ve sent a confirmation to your email and please save it for your records.`}
        />
      );
    }

    return (
      <Notice
        title="Welcome to ABAC!"
        body="Welcome! Your family membership is now active. We've sent each adult a confirmation email — please save it for your records."
      >
        <table className="hist-table" style={{ marginTop: 16, textAlign: "left" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ textAlign: "right" }}>Membership number</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.member_no}>
                <td>{r.name}</td>
                <td style={{ textAlign: "right" }}>{formatMemberNo(r.member_no, r.member_year)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Notice>
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

function Notice({
  title,
  body,
  warn = false,
  children,
}: {
  title: string;
  body: string;
  warn?: boolean;
  children?: ReactNode;
}) {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card" style={{ textAlign: "center" }}>
            <h2>{title}</h2>
            <p className={warn ? "notice warn" : "notice ok"} style={{ marginTop: 16 }}>
              {body}
            </p>
            {children}
            <Link className="btn btn-ghost" style={{ marginTop: 20 }} href="/">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
