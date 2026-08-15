import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent only when a volunteer registration is for a minor (app/volunteers/
 *  actions.ts's submitVolunteerRegistration, is_minor branch) — previously
 *  this form sent no email to anyone. The volunteer's own registration is
 *  never gated on payment or approval, so this can send immediately on
 *  submission, unlike the payment-gated confirmation emails elsewhere in
 *  this app. */
export function volunteerGuardianNoticeEmail({
  guardianName,
  childName,
}: {
  guardianName: string;
  childName: string;
}) {
  const subject = "ABAC Volunteer Program — registration confirmed";

  const text = `Dear ${guardianName},

We are writing to confirm that ${childName} has successfully registered for ABAC's volunteer
program.

We appreciate your support and guidance in enabling ${childName} to take part. Should you have
any questions, please contact us at bhutancanberra@gmail.com.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(guardianName)},</p>
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      We are writing to confirm that <strong>${escapeHtml(childName)}</strong> has successfully
      registered for ABAC&rsquo;s volunteer program.
    </p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      We appreciate your support and guidance in enabling ${escapeHtml(childName)} to take part.
      Should you have any questions, please contact us at
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
