import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent to the committee mailbox when a business submits a Corporate
 *  Membership application — replyTo is set to the applicant's contact
 *  email so replying goes straight to them. */
export function corporateNotifyEmail({
  businessName,
  contactName,
  email,
  phone,
  tier,
}: {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  tier: string;
}) {
  const subject = `New Corporate Membership application — ${businessName} (${tier})`;

  const text = `New Corporate Membership application via the website.

Business: ${businessName}
Tier: ${tier}
Contact: ${contactName}
Email: ${email}
Phone: ${phone}

Review and approve or reject it in the admin dashboard: /admin`;

  const body = `
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px">
      New Corporate Membership application via the website.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px;margin-bottom:20px">
      <tr>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Business</td>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.navy};font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:right">${escapeHtml(businessName)}</td>
      </tr>
      <tr>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Tier</td>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.navy};font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:right">${escapeHtml(tier)}</td>
      </tr>
      <tr>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Contact</td>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.navy};font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:right">${escapeHtml(contactName)}</td>
      </tr>
      <tr>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Email</td>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.navy};font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:right">${escapeHtml(email)}</td>
      </tr>
      <tr>
        <td style="padding:14px 24px;color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Phone</td>
        <td style="padding:14px 24px;color:${COLOR.navy};font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:right">${escapeHtml(phone)}</td>
      </tr>
    </table>
    <p style="margin:0;color:${COLOR.inkSoft};font-size:13.5px;line-height:1.7">
      Review and approve or reject it in the
      <a href="https://bhutaneseincanberra.org.au/admin" style="color:${COLOR.navy}">admin dashboard</a>.
    </p>`;

  return { subject, text, html: emailShell(body) };
}
