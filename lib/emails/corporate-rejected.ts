import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent when the committee declines a Corporate Membership application —
 *  previously this branch sent no email at all, leaving the applicant with
 *  no closure. Deliberately brief and formal; no reason is given by default
 *  (the committee can follow up personally if one is warranted). */
export function corporateRejectedEmail({
  businessName,
  contactName,
  tier,
}: {
  businessName: string;
  contactName: string;
  tier: string;
}) {
  const subject = "Update on your ABAC Corporate Membership application";

  const text = `Dear ${contactName},

Thank you for your interest in ABAC Corporate Membership (${tier} tier) on behalf of
${businessName}, and for the time you took to submit an application.

After review, the committee is unable to approve this application at this time.

We would welcome the opportunity to reconsider a future application, or to discuss this
further. Please contact us at bhutancanberra@gmail.com with any questions.

Thank you again for your interest in supporting ABAC.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(contactName)},</p>
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      Thank you for your interest in ABAC Corporate Membership
      (<strong>${escapeHtml(tier)} tier</strong>) on behalf of
      <strong>${escapeHtml(businessName)}</strong>, and for the time you took to submit an
      application.
    </p>
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      After review, the committee is unable to approve this application at this time.
    </p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      We would welcome the opportunity to reconsider a future application, or to discuss this
      further. Please contact us at
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
      with any questions.
    </p>
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      Thank you again for your interest in supporting ABAC.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
