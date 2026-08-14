import { emailShell, COLOR } from "./shared";

export function bulkAnnouncementEmail(subject: string, message: string): string {
  return emailShell(`
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px; background: #F5F0E8; border-radius: 8px;">
          <h2 style="margin: 0 0 16px; font-size: 20px; line-height: 1.2; color: ${COLOR.ink};">
            ${escapeHtml(subject)}
          </h2>
          <div style="color: ${COLOR.ink}; line-height: 1.6; font-size: 15px;">
            ${message.split('\n').join('<br />')}
          </div>
        </td>
      </tr>
    </table>
    <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid ${COLOR.line}; color: ${COLOR.inkSoft}; font-size: 13px;">
      This message was sent to you as an active member of the Australia–Bhutan Association of Canberra. If you have questions, please contact us at bhutancanberra@gmail.com.
    </p>
  `);
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
