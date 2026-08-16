import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent by an admin from the Services tab once the committee has actually
 *  written up the requested letter — the document itself travels as a real
 *  email attachment (see sendServiceDocument in app/admin/actions.ts), not
 *  a link, since service-documents is a private bucket and a signed link
 *  would eventually expire. */
export function serviceDocumentReadyEmail({
  requesterName,
  serviceLabel,
  customMessage,
}: {
  requesterName: string;
  serviceLabel: string;
  /** Optional free-text the admin wrote for this specific send — shown to
   *  the "Write email" toggle in the admin UI. Sits between the greeting
   *  and the standard "please find attached" line, so it reads as added
   *  context rather than replacing the template. */
  customMessage?: string;
}) {
  const subject = `Your ${serviceLabel} from ABAC is ready`;

  const customText = customMessage?.trim() ? `\n${customMessage.trim()}\n` : "";
  const text = `Dear ${requesterName},
${customText}
Please find attached your ${serviceLabel} from the Australia–Bhutan Association of Canberra.

If you have any questions, please contact us at bhutancanberra@gmail.com.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const customHtml = customMessage?.trim()
    ? `<p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px;line-height:1.6;white-space:pre-wrap">${escapeHtml(customMessage.trim())}</p>`
    : "";

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(requesterName)},</p>
    ${customHtml}
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      Please find attached your <strong>${escapeHtml(serviceLabel)}</strong> from the
      Australia&ndash;Bhutan Association of Canberra.
    </p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      If you have any questions, please contact us at
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
