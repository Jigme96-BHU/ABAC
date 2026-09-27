import { COLOR, escapeHtml, emailShell } from "./shared";

const COMMITTEE_EMAIL = "bhutancanberra@gmail.com";
const SITE = "bhutaneseincanberra.org.au";
const PHONE = "0403 825 757";

/** Sent to the donor after a successful donation. ABAC has no DGR status,
 *  so this is an acknowledgement, not a tax receipt. */
export function donationThankYouEmail({
  name,
  amount,
  date,
  paymentMethod,
  reference,
}: {
  name: string | null;
  amount: string;
  date: string;
  paymentMethod: string;
  reference: string;
}) {
  const donor = name ?? "friend";
  const subject = name
    ? `Thank you for supporting our community, ${name}`
    : "Thank you for supporting our community";

  const details: [string, string][] = [
    ["Donor name", name ?? "—"],
    ["Amount", amount],
    ["Date received", date],
    ["Payment method", paymentMethod],
    ["Reference number", reference],
  ];

  const text = `Dear ${donor},

Kuzuzangpo la, and on behalf of the Australia–Bhutan Association of Canberra (ABAC), thank you sincerely for your generous donation of ${amount} towards our Community Welfare Support.

Your kindness goes directly to helping members of our community when they need it most, whether that means supporting families facing illness or bereavement, assisting new arrivals as they settle in Canberra, or helping those going through unexpected hardship. In our community, no one should have to face difficult times alone, and contributions like yours make that possible.

For your records, here are the details of your donation:

${details.map(([k, v]) => `${k}: ${v}`).join("\n")}

We are committed to using every dollar responsibly and transparently, and we will share updates on how the Welfare Support fund is helping our community through our newsletter and annual general meeting.

Thank you once again for your compassion and for being part of the ABAC family. If you have any questions, please feel free to reach out to us at ${COMMITTEE_EMAIL} or ${PHONE}.

With deep gratitude,

Dorji Tashi
President
Australia–Bhutan Association of Canberra (ABAC)
${COMMITTEE_EMAIL} | ${PHONE}
${SITE}`;

  const p = (html: string) =>
    `<p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px;line-height:1.7">${html}</p>`;

  const rows = details
    .map(
      ([k, v], i) => `
      <tr>
        <td style="padding:12px 20px;${i < details.length - 1 ? `border-bottom:1px solid ${COLOR.line};` : ""}color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">${k}</td>
        <td style="padding:12px 20px;${i < details.length - 1 ? `border-bottom:1px solid ${COLOR.line};` : ""}color:${COLOR.navy};font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:right">${escapeHtml(v)}</td>
      </tr>`,
    )
    .join("");

  const body = `
    ${p(`Dear ${escapeHtml(donor)},`)}
    ${p(`Kuzuzangpo la, and on behalf of the Australia&ndash;Bhutan Association of Canberra (ABAC), thank you sincerely for your generous donation of <strong>${escapeHtml(amount)}</strong> towards our Community Welfare Support.`)}
    ${p("Your kindness goes directly to helping members of our community when they need it most, whether that means supporting families facing illness or bereavement, assisting new arrivals as they settle in Canberra, or helping those going through unexpected hardship. In our community, no one should have to face difficult times alone, and contributions like yours make that possible.")}
    ${p("For your records, here are the details of your donation:")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px;margin-bottom:20px">${rows}
    </table>
    ${p("We are committed to using every dollar responsibly and transparently, and we will share updates on how the Welfare Support fund is helping our community through our newsletter and annual general meeting.")}
    ${p(`Thank you once again for your compassion and for being part of the ABAC family. If you have any questions, please feel free to reach out to us at <a href="mailto:${COMMITTEE_EMAIL}" style="color:${COLOR.navy}">${COMMITTEE_EMAIL}</a> or <a href="tel:+61403825757" style="color:${COLOR.navy}">${PHONE}</a>.`)}
    ${p("With deep gratitude,")}
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      <strong>Dorji Tashi</strong><br />
      President<br />
      Australia&ndash;Bhutan Association of Canberra (ABAC)<br />
      <a href="mailto:${COMMITTEE_EMAIL}" style="color:${COLOR.navy}">${COMMITTEE_EMAIL}</a> |
      <a href="tel:+61403825757" style="color:${COLOR.navy}">${PHONE}</a><br />
      <a href="https://${SITE}" style="color:${COLOR.navy}">${SITE}</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}

/** Sent to the committee mailbox for every donation. */
export function donationNotifyEmail({
  name,
  email,
  amount,
}: {
  name: string | null;
  email: string | null;
  amount: string;
}) {
  const subject = `New donation — ${amount}${name ? ` from ${name}` : ""}`;

  const text = `A new donation was received via the website.

Amount: ${amount}
Name: ${name ?? "—"}
Email: ${email ?? "—"}

Full details are in the ABAC Welfare Stripe dashboard.`;

  const row = (label: string, value: string, last = false) => `
      <tr>
        <td style="padding:14px 24px;${last ? "" : `border-bottom:1px solid ${COLOR.line};`}color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">${label}</td>
        <td style="padding:14px 24px;${last ? "" : `border-bottom:1px solid ${COLOR.line};`}color:${COLOR.navy};font-family:Georgia,serif;font-size:15px;font-weight:700;text-align:right">${escapeHtml(value)}</td>
      </tr>`;

  const body = `
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px">
      A new donation was received via the website.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px;margin-bottom:20px">
      ${row("Amount", amount)}
      ${row("Name", name ?? "—")}
      ${row("Email", email ?? "—", true)}
    </table>
    <p style="margin:0 0 20px;color:${COLOR.inkSoft};font-size:13.5px;line-height:1.7">
      Full details are in the ABAC Welfare Stripe dashboard.
    </p>`;

  return { subject, text, html: emailShell(body) };
}
