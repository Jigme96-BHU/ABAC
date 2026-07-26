import { COLOR, escapeHtml, emailShell } from "./shared";

/** Auto-reply sent to whoever submitted the Contact form, matching the
 *  page's existing promise of an instant confirmation email. */
export function contactConfirmationEmail({ name }: { name: string }) {
  const subject = "We've received your message — ABAC";

  const text = `Dear ${name},

Thank you for getting in touch with the Australia–Bhutan Association of Canberra.
We've received your message and will respond within 2–3 working days.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      Thank you for getting in touch with the Australia&ndash;Bhutan Association of
      Canberra. We&rsquo;ve received your message and will respond within
      <strong>2&ndash;3 working days</strong>.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
