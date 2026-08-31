"use client";

import { useEffect } from "react";

/** Next.js error boundary for the whole /admin route segment. Without this,
 *  any uncaught Server Component error here (auth check, a query outside
 *  the settled ones in page.tsx, a server action's own re-render) showed
 *  Next's generic unrecoverable "This page couldn't load" crash — the only
 *  way out was a full browser reload, losing whatever tab/scroll state the
 *  admin was in. This gives a retry that doesn't lose that, and surfaces
 *  the digest so it can be matched against Vercel's Runtime Logs, since the
 *  actual error message is stripped from Server Component errors before
 *  they reach the client, by Next's own design. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin page error:", error);
  }, [error]);

  return (
    <main>
      <section className="block">
        <div className="wrap" style={{ maxWidth: 620, textAlign: "center" }}>
          <div className="orn">
            <span />
            <i>◆</i>
            <span />
          </div>
          <h2 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong loading Admin</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 8 }}>
            This is usually a temporary hiccup talking to the database. Try again — if it keeps
            happening, share the reference below so it can be looked up.
          </p>
          {error.digest && (
            <p style={{ color: "var(--ink-soft)", fontSize: 12, marginBottom: 24, fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          )}
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
