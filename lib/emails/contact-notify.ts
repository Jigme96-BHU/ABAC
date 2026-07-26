import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent to the committee mailbox when someone submits the Contact form.
 *  replyTo is set to the sender's address so replying goes straight to them. */
export function contactNotifyEmail({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) {
  const subject = `New contact form message from ${name}`;

  const text = `New message from the website contact form.

Name: ${name}
Email: ${email}

${message}`;

  const body = `
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px">
      New message from the website contact form.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px;margin-bottom:20px">
      <tr>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Name</td>
        <td style="padding:14px 24px;border-bottom:1px solid ${COLOR.line};color:${COLOR.navy};font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:right">${escapeHtml(name)}</td>
      </tr>
      <tr>
        <td style="padding:14px 24px;color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Email</td>
        <td style="padding:14px 24px;color:${COLOR.navy};font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:right">${escapeHtml(email)}</td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:${COLOR.inkSoft};font-size:13px;text-transform:uppercase;letter-spacing:1px">Message</p>
    <p style="margin:0;color:${COLOR.ink};font-size:15px;line-height:1.7;white-space:pre-wrap">${escapeHtml(message)}</p>`;

  return { subject, text, html: emailShell(body) };
}
