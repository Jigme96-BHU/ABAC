/** Shared between the admin upload form's category <select> and the public
 *  /documents page's grouping headings, so the two never drift apart.
 *  Order here is the display order on the public page. */
export const DOCUMENT_CATEGORIES = [
  { value: "constitution", label: "Constitution" },
  { value: "policy", label: "Policies" },
  { value: "tor", label: "TOR for leadership roles" },
  { value: "financial", label: "Financial reports" },
  { value: "minutes", label: "Minutes" },
  { value: "other", label: "Other" },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["value"];

export function documentCategoryLabel(category: string): string {
  return DOCUMENT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}
