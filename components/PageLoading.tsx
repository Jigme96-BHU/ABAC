/** Shown by a route's loading.tsx while its Server Component awaits data
 *  (a Supabase query) — otherwise the tab just sits blank/frozen until the
 *  request resolves. Kept intentionally light: this is a brief interstitial
 *  between navigations, not a full skeleton of the page it's replacing. */
export default function PageLoading() {
  return (
    <main>
      <section className="block">
        <div className="wrap" style={{ maxWidth: 620, textAlign: "center" }}>
          <div className="orn orn-pulse">
            <span />
            <i>◆</i>
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}
