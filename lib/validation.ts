/** Whole calendar years as of today — shared by Join (adult/child fee split)
 *  and Volunteer registration (minor/guardian requirement). */
export function ageFrom(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Bhutanese Citizenship ID — exactly 11 digits, same rule enforced by the
 *  Join form's client-side pattern and now Volunteer registration. */
export function isValidCid(cid: string): boolean {
  return /^\d{11}$/.test(cid);
}
