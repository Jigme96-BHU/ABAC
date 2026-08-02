import { COLOR, escapeHtml, emailShell } from "./shared";

export type ExpiryReminderKind = "14d" | "expired";

export function expiryReminderEmail({
  name,
  memberNo,
  validUntil,
  kind,
}: {
  name: string;
  memberNo: string;
  validUntil: string;
  kind: ExpiryReminderKind;
}) {
  const isExpired = kind === "expired";
  const subject = isExpired
    ? "ABAC membership expires today"
    : "ABAC membership renewal reminder";
  const intro = isExpired
    ? "Your ABAC membership expires today. Please renew to keep your membership active for the next year."
    : "Your ABAC membership will expire in 14 days. Please renew when convenient so your membership stays active.";

  const text = `Dear ${name},

${intro}

Membership number: ${memberNo}
Valid until: ${validUntil}

Renew here: https://bhutaneseincanberra.org.au/join

Please use the same date of birth and CID when renewing so your original membership number stays with you.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(name)},</p>
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      ${escapeHtml(intro)}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px">
      <tr>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Membership number</td>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.navy};font-family:Georgia,serif;font-size:16px;font-weight:700;text-align:right">${escapeHtml(memberNo)}</td>
      </tr>
      <tr>
        <td style="padding:14px 24px;color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Valid until</td>
        <td style="padding:14px 24px;color:${COLOR.navy};font-family:Georgia,serif;font-size:16px;font-weight:700;text-align:right">${escapeHtml(validUntil)}</td>
      </tr>
    </table>
    <p style="margin:22px 0;text-align:center">
      <a href="https://bhutaneseincanberra.org.au/join" style="display:inline-block;background:${COLOR.gold};color:#3D2E05;text-decoration:none;font-weight:700;border-radius:8px;padding:12px 18px">
        Renew membership
      </a>
    </p>
    <p style="margin:0 0 20px;color:${COLOR.inkSoft};font-size:13.5px;line-height:1.7">
      Please use the same date of birth and CID when renewing so your original
      membership number stays with you.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
