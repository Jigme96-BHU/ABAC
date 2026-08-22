import { emailShell, COLOR, escapeHtml } from "./shared";

/** Same `{ text, html }` shape as every other template in lib/emails/ —
 *  this one previously returned HTML only, so a recipient on a plain-text
 *  mail client (or a spam filter scoring the absence of a text part) got
 *  nothing at all. */
export function bulkAnnouncementEmail(subject: string, message: string): { text: string; html: string } {
  const text = `${subject}

${message}

---
This message was sent to you as an active member of the Australia–Bhutan Association of
Canberra. If you have questions, please contact us at bhutancanberra@gmail.com.`;

  const html = emailShell(`
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px; background: #F5F0E8; border-radius: 8px;">
          <h2 style="margin: 0 0 16px; font-size: 20px; line-height: 1.2; color: ${COLOR.ink};">
            ${escapeHtml(subject)}
          </h2>
          <div style="color: ${COLOR.ink}; line-height: 1.6; font-size: 15px;">
            ${escapeHtml(message).split('\n').join('<br />')}
          </div>
        </td>
      </tr>
    </table>
    <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid ${COLOR.line}; color: ${COLOR.inkSoft}; font-size: 13px;">
      This message was sent to you as an active member of the Australia–Bhutan Association of Canberra. If you have questions, please contact us at bhutancanberra@gmail.com.
    </p>
  `);

  return { text, html };
}
