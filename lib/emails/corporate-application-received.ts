import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent immediately on submission — before any committee review has
 *  happened, so this only ever acknowledges receipt, never confirms
 *  anything about the outcome. */
export function corporateApplicationReceivedEmail({
  businessName,
  contactName,
  tier,
}: {
  businessName: string;
  contactName: string;
  tier: string;
}) {
  const subject = "We've received your Corporate Membership application — ABAC";

  const text = `Dear ${contactName},

Thank you for applying for ABAC Corporate Membership (${tier} tier) on behalf of ${businessName}.

We've received your application and the committee will review it within 3 working days.
We'll be in touch as soon as a decision is made.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(contactName)},</p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      Thank you for applying for ABAC Corporate Membership (<strong>${escapeHtml(tier)} tier</strong>)
      on behalf of <strong>${escapeHtml(businessName)}</strong>.
    </p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      We&rsquo;ve received your application and the committee will review it within
      <strong>3 working days</strong>. We&rsquo;ll be in touch as soon as a decision is made.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
