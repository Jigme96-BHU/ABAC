/** 5MB per file — a bulk email attachment goes out to every filtered
 *  recipient, potentially hundreds of people, so this stays tighter than the
 *  single-recipient upload caps used elsewhere in this project.
 *
 *  Lives outside app/admin/actions.ts (a "use server" file) because that file
 *  can only export async functions — any other export type throws
 *  "A 'use server' file can only export async functions" at build time, and
 *  since that's a whole-module failure, it took every action in the file
 *  down with it, not just this one. Enforced client-side (BulkEmailForm.tsx)
 *  before upload starts. */
export const EMAIL_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
