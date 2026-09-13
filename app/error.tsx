"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Next.js error boundary for the public site. Without this, any uncaught
 *  Server Component error (a Supabase query failing, etc.) showed Next's
 *  generic unrecoverable "This page couldn't load" crash instead of
 *  something a visitor could actually act on. Mirrors admin/error.tsx. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
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
          <h2 style={{ fontSize: 32, marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 8 }}>
            This is usually a temporary hiccup — try again, or head back to the home page.
          </p>
          {error.digest && (
            <p style={{ color: "var(--ink-soft)", fontSize: 12, marginBottom: 24, fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={reset}>
              Try again
            </button>
            <Link className="btn btn-ghost" href="/">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
