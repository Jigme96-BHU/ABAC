import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent to the volunteer themselves on registration — every other public
 *  form in this app confirms receipt (Contact, Corporate, Service Request,
 *  Membership), but Volunteer registration only ever emailed the guardian
 *  of a minor and left an adult volunteer with no confirmation at all.
 *  Sent alongside volunteerGuardianNoticeEmail for a minor, not instead of
 *  it — the volunteer and the guardian are different people who each need
 *  their own confirmation. */
export function volunteerConfirmationEmail({ name }: { name: string }) {
  const subject = "Thank you for registering to volunteer — ABAC";

  const text = `Dear ${name},

Thank you for registering to volunteer with the Australia–Bhutan Association of Canberra.
We truly appreciate your support and are grateful for members like you who give their time
to strengthen our community.

The committee will be in touch when a suitable opportunity comes up.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      Thank you for registering to volunteer with the Australia&ndash;Bhutan Association of
      Canberra. We truly appreciate your support and are grateful for members like you who
      give their time to strengthen our community.
    </p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      The committee will be in touch when a suitable opportunity comes up.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
