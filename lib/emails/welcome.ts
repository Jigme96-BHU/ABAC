import { COLOR, escapeHtml, emailShell } from "./shared";

/** Content is adapted from the reference brochure design, not copied
 *  verbatim: this email only ever sends *after* activate_membership() has
 *  run (paid, via the Stripe webhook) or immediately for a free under-18
 *  registration — so it always confirms a real, already-active membership.
 *  It must never say "if you haven't paid yet", since by the time it sends,
 *  that's no longer a possible state. */
export function welcomeEmail({
  name,
  memberNo,
  fee,
  validUntil,
}: {
  name: string;
  memberNo: string;
  /** e.g. "$20 AUD / year" or "Free — under 18" */
  fee: string;
  /** already formatted, e.g. "17 Jul 2027" */
  validUntil: string;
}) {
  const subject = "Welcome to ABAC — your membership is active";

  const text = `Dear ${name},

Kuzu zangpo la, and welcome to the ABAC family! Your membership is confirmed and active.

Membership number: ${memberNo}
Membership fee: ${fee}
Valid until: ${validUntil}

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
      <strong>Kuzu zangpo la, and welcome to the ABAC family!</strong>
      Your membership is confirmed and active.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px">
      ${row("Membership number", escapeHtml(memberNo))}
      ${row("Membership fee", escapeHtml(fee))}
      ${row("Valid until", escapeHtml(validUntil), true)}
    </table>
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
