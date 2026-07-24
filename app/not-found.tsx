import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <section className="block">
        <div className="wrap" style={{ maxWidth: 620, textAlign: "center" }}>
          <div className="orn">
            <span />
            <i>◆</i>
            <span />
          </div>
          <h2 style={{ fontSize: 32, marginBottom: 12 }}>Page not found</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
            That page doesn&apos;t exist — it may have moved since the old site.
          </p>
          <Link className="btn btn-primary" href="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
