import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent immediately after a successful RSVP insert (app/events/actions.ts).
 *  Purely a confirmation of record — the event itself is unaffected by
 *  whether this email is read or even delivered. */
export function eventRsvpConfirmationEmail({
  name,
  eventTitle,
  eventDate,
  eventLocation,
}: {
  name: string;
  eventTitle: string;
  /** already formatted, e.g. "17 Jul 2027" */
  eventDate: string;
  eventLocation: string;
}) {
  const subject = `RSVP confirmed — ${eventTitle}`;

  const text = `Dear ${name},

Thank you for your RSVP. This confirms your attendance at the following ABAC event:

Event: ${eventTitle}
Date: ${eventDate}
Location: ${eventLocation}

We look forward to seeing you there. If your plans change, please let us know at
bhutancanberra@gmail.com.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const row = (label: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:14px 24px;${isLast ? "" : `border-bottom:1px solid ${COLOR.line};`}color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">${label}</td>
      <td style="padding:14px 24px;${isLast ? "" : `border-bottom:1px solid ${COLOR.line};`}color:${COLOR.navy};font-family:Georgia,serif;font-size:16px;font-weight:700;text-align:right">${value}</td>
    </tr>`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      Thank you for your RSVP. This confirms your attendance at the following ABAC event.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px">
      ${row("Event", escapeHtml(eventTitle))}
      ${row("Date", escapeHtml(eventDate))}
      ${row("Location", escapeHtml(eventLocation), true)}
    </table>
    <p style="margin:20px 0;color:${COLOR.inkSoft};font-size:13.5px;line-height:1.7">
      We look forward to seeing you there. If your plans change, please let us know at
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
