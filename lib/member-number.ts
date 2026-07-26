/** "ABAC-2026-000001" — member_no is an auto-incrementing DB identity
 *  column (supabase/migrations/0004_member_number.sql), never chosen by the
 *  client. The year is when the membership actually became active, not
 *  necessarily when the row was first inserted. */
export function formatMemberNo(memberNo: number, year: number): string {
  return `ABAC-${year}-${String(memberNo).padStart(6, "0")}`;
}

/** "17 Jul 2027" — shared so the success page, status check, and welcome
 *  email all render dates the same way. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
