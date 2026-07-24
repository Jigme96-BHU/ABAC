/** Visible warning wherever the page is still rendering invented prototype
 *  content. Every instance must be gone before the site replaces the live
 *  WordPress one — grep for <PlaceholderNotice to find them. */
export default function PlaceholderNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice warn" style={{ marginBottom: 24 }} role="note">
      <strong>Placeholder content.</strong> {children}
    </div>
  );
}
