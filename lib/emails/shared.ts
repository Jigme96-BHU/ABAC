/** Shared by every email template — table-based layout and inline styles
 *  throughout, since email clients (Outlook especially) don't reliably
 *  support flexbox/grid/external stylesheets. Colors are the same brand
 *  tokens as app/globals.css, just hard-coded since email can't read CSS
 *  variables. */
export const COLOR = {
  navyDeep: "#0E2338",
  navy: "#16324F",
  gold: "#C9A227",
  goldBright: "#E8C34A",
  paper: "#FBF9F2",
  ink: "#20242E",
  inkSoft: "#6B6455",
  line: "#E4DECB",
};

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Navy header + cream body + navy footer, matching the site's brand. Body
 *  is raw HTML already built by the caller (rows of <p>/<table>, etc). */
export function emailShell(bodyHtml: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede3;padding:24px 12px">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${COLOR.paper};border:1px solid ${COLOR.gold};border-radius:10px;overflow:hidden;font-family:Georgia,serif">
        <tr>
          <td style="background:${COLOR.navyDeep};padding:28px 24px;text-align:center">
            <span style="color:${COLOR.goldBright};font-size:20px;font-weight:700;letter-spacing:2px;text-transform:uppercase">
              Australia&ndash;Bhutan Association of Canberra
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 8px">${bodyHtml}</td>
        </tr>
        <tr>
          <td style="background:${COLOR.navyDeep};padding:16px 24px;text-align:center">
            <span style="color:#C7BC9C;font-size:12px">Australia&ndash;Bhutan Association of Canberra Inc.</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
