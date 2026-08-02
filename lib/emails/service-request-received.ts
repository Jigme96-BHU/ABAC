import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent by the Stripe webhook once a service request's payment actually
 *  clears — this only ever confirms a real, paid request, never something
 *  still pending payment (same rule as every other confirmation email in
 *  this codebase — see lib/emails/welcome.ts). */
export function serviceRequestReceivedEmail({
  requesterName,
  serviceLabel,
}: {
  requesterName: string;
  serviceLabel: string;
}) {
  const subject = `We've received your ${serviceLabel} request — ABAC`;

  const text = `Dear ${requesterName},

Thank you — we've received your payment and your request for a ${serviceLabel}.

The committee will contact you within 3–4 working days to arrange the next steps.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(requesterName)},</p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      Thank you — we&rsquo;ve received your payment and your request for a
      <strong>${escapeHtml(serviceLabel)}</strong>.
    </p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      The committee will contact you within <strong>3&ndash;4 working days</strong> to arrange
      the next steps.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
