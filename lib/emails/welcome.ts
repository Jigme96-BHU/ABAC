import { COLOR, escapeHtml, emailShell } from "./shared";

/** Content is adapted from the reference brochure design, not copied
 *  verbatim: this email only ever sends after paid activation/renewal or
 *  immediately for a free under-18 registration/renewal — so it always
 *  confirms a real, already-active membership.
 *  It must never say "if you haven't paid yet", since by the time it sends,
 *  that's no longer a possible state. */
export function welcomeEmail({
  name,
  memberNo,
  fee,
  validUntil,
  kind = "welcome",
  isFamily = false,
  household,
  dependents,
}: {
  name: string;
  memberNo: string;
  /** e.g. "$20 AUD / year" or "Free — under 18" */
  fee: string;
  /** already formatted, e.g. "17 Jul 2027" */
  validUntil: string;
  kind?: "welcome" | "renewal";
  /** Whether this is a Family Membership registration — used to say "family
   *  membership" explicitly in the intro line, not just in the fee text. */
  isFamily?: boolean;
  /** Other adults on the same Family Membership — each gets their own copy
   *  of this email, so this just lists who else is covered. */
  household?: { name: string; memberNo: string }[];
  /** Dependent children (under 18) covered by the same Family Membership —
   *  they never get their own copy of this email. */
  dependents?: string[];
}) {
  const isRenewal = kind === "renewal";
  const membershipNoun = isFamily ? "family membership" : "membership";
  const subject = isRenewal
    ? `ABAC ${membershipNoun} renewed`
    : `Welcome to ABAC — your ${membershipNoun} is active`;
  const introText = isRenewal
    ? `Your ABAC ${membershipNoun} has been renewed and is active.`
    : `Kuzu zangpo la, and welcome to the ABAC family! Your ${membershipNoun} is confirmed and active.`;
  const introHtml = isRenewal
    ? `Your ABAC ${membershipNoun} has been renewed and is active.`
    : `<strong>Kuzu zangpo la, and welcome to the ABAC family!</strong> Your ${membershipNoun} is confirmed and active.`;

  const householdLines =
    household && household.length > 0
      ? `\nAlso on this family membership: ${household.map((h) => `${h.name} (${h.memberNo})`).join(", ")}.`
      : "";
  const dependentLines =
    dependents && dependents.length > 0
      ? `\nDependents covered (under 18, no fee): ${dependents.join(", ")}.`
      : "";

  const text = `Dear ${name},

${introText}

Membership number: ${memberNo}
Membership fee: ${fee}
Valid until: ${validUntil}
${householdLines}${dependentLines}

Please keep this email as your membership confirmation and receipt. You can look up your
status anytime at https://bhutaneseincanberra.org.au/join using the email and date of birth
you registered with.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const row = (label: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:14px 24px;${isLast ? "" : `border-bottom:1px solid ${COLOR.line};`}color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">${label}</td>
      <td style="padding:14px 24px;${isLast ? "" : `border-bottom:1px solid ${COLOR.line};`}color:${COLOR.navy};font-family:Georgia,serif;font-size:16px;font-weight:700;text-align:right">${value}</td>
    </tr>`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      ${introHtml}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px">
      ${row("Membership number", escapeHtml(memberNo))}
      ${row("Membership fee", escapeHtml(fee))}
      ${row("Valid until", escapeHtml(validUntil), true)}
    </table>
    ${
      household && household.length > 0
        ? `<p style="margin:16px 0 0;color:${COLOR.ink};font-size:13.5px;line-height:1.7">
            <strong>Also on this family membership:</strong> ${household.map((h) => `${escapeHtml(h.name)} (${escapeHtml(h.memberNo)})`).join(", ")}.
          </p>`
        : ""
    }
    ${
      dependents && dependents.length > 0
        ? `<p style="margin:8px 0 0;color:${COLOR.ink};font-size:13.5px;line-height:1.7">
            <strong>Dependents covered</strong> (under 18, no fee): ${dependents.map(escapeHtml).join(", ")}.
          </p>`
        : ""
    }
    <p style="margin:20px 0;color:${COLOR.inkSoft};font-size:13.5px;line-height:1.7">
      Please keep this email as your membership confirmation and receipt. You can
      look up your status anytime on the
      <a href="https://bhutaneseincanberra.org.au/join" style="color:${COLOR.navy}">Join page</a>,
      using the email and date of birth you registered with.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
