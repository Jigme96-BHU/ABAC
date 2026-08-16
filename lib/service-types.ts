export type ServiceType = "letter_of_residency" | "character_reference";

export const SERVICE_TYPES: { value: ServiceType; label: string; description: string }[] = [
  {
    value: "letter_of_residency",
    label: "Letter of Residency",
    description:
      "A formal letter confirming your residency and standing within the Bhutanese community in Canberra, for visa, migration, or official purposes.",
  },
  {
    value: "character_reference",
    label: "Character Reference",
    description:
      "A character reference letter from ABAC, supporting visa, citizenship, employment, or other applications requiring community endorsement.",
  },
];

/** Per service. Which one applies is decided server-side from the membership
 *  number — never from what the browser posted. */
export const SERVICE_FEE_MEMBER_CENTS = 1000; // $10 AUD
export const SERVICE_FEE_NON_MEMBER_CENTS = 4500; // $45 AUD

export function serviceFeeCents(isMember: boolean): number {
  return isMember ? SERVICE_FEE_MEMBER_CENTS : SERVICE_FEE_NON_MEMBER_CENTS;
}

/** "$10" / "$45" — whole dollars, both fees are round numbers. */
export function formatServiceFee(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

/** Members type "ABAC-2026-000123" or just "123"; both mean member_no 123.
 *  Returns null when there's no usable number in the input. */
export function parseMemberNo(input: string): number | null {
  const groups = input.match(/\d+/g);
  if (!groups || groups.length === 0) return null;
  const n = Number(groups[groups.length - 1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function serviceTypeLabel(serviceType: string): string {
  return SERVICE_TYPES.find((s) => s.value === serviceType)?.label ?? serviceType;
}

/** Shared between the client form and the server action, so this has to
 *  live in a plain module rather than app/services/actions.ts — a
 *  "use server" file can only export async functions; every other export
 *  (a plain array, a number, a type) silently breaks when a client
 *  component imports it, since Next.js strips non-function exports from a
 *  server-actions module at the client boundary. That's exactly what
 *  broke ServiceRequestForm.tsx's submit handler: SERVICE_DOCUMENT_FIELDS
 *  came back undefined on the client, and `for (const field of
 *  SERVICE_DOCUMENT_FIELDS)` threw "is not iterable" on every submit
 *  attempt, silently, since there was no try/catch around it. */
export const SERVICE_DOCUMENT_FIELDS = ["passport", "visa", "photo_id", "proof_of_residency"] as const;
export type ServiceDocumentField = (typeof SERVICE_DOCUMENT_FIELDS)[number];

/** 3MB per file — enforced client-side before any upload starts (see
 *  ServiceRequestForm.tsx), and again by Storage itself via the bucket's
 *  file_size_limit (0020_admin_search_and_upload_limits.sql), so a
 *  tampered client can't smuggle a larger file past the visible check. */
export const SERVICE_DOCUMENT_MAX_BYTES = 3 * 1024 * 1024;
