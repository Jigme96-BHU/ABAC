import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent by the Stripe webhook once a corporate application's payment
 *  actually clears — this is the only point a business is a real, active
 *  Corporate Member, so this is where membership + congratulations +
 *  gratitude all land together, same principle as lib/emails/welcome.ts. */
export function corporateApprovedEmail({
  businessName,
  contactName,
  tier,
  fee,
  validUntil,
}: {
  businessName: string;
  contactName: string;
  tier: string;
  /** e.g. "$500 AUD / year" */
  fee: string;
  /** already formatted, e.g. "17 Jul 2027" */
  validUntil: string;
}) {
  const subject = "Welcome, ABAC Corporate Partner!";

  const text = `Dear ${contactName},

Congratulations, and thank you — ${businessName} is now an ABAC Corporate Member at ${tier} tier!

On behalf of the committee and the whole Bhutanese community in Canberra, thank you for your
generous support. Partners like ${businessName} make ABAC's cultural programs, welfare support,
and community events possible.

Membership tier: ${tier}
Membership fee: ${fee}
Valid until: ${validUntil}

Our committee will be in touch shortly about your listing on ABAC's Our Partners page and any
recognition included at your tier. If you have a logo you'd like featured, just reply to this
email.

Tashi Delek, and thank you again,
ABAC Committee
bhutancanberra@gmail.com`;

  const row = (label: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:14px 24px;${isLast ? "" : `border-bottom:1px solid ${COLOR.line};`}color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">${label}</td>
      <td style="padding:14px 24px;${isLast ? "" : `border-bottom:1px solid ${COLOR.line};`}color:${COLOR.navy};font-family:Georgia,serif;font-size:16px;font-weight:700;text-align:right">${value}</td>
    </tr>`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(contactName)},</p>
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      <strong>Congratulations, and thank you</strong> — ${escapeHtml(businessName)} is now an
      ABAC Corporate Member at <strong>${escapeHtml(tier)} tier</strong>!
    </p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      On behalf of the committee and the whole Bhutanese community in Canberra, thank you for
      your generous support. Partners like ${escapeHtml(businessName)} make ABAC&rsquo;s cultural
      programs, welfare support, and community events possible.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px">
      ${row("Membership tier", escapeHtml(tier))}
      ${row("Membership fee", escapeHtml(fee))}
      ${row("Valid until", escapeHtml(validUntil), true)}
    </table>
    <p style="margin:20px 0;color:${COLOR.inkSoft};font-size:13.5px;line-height:1.7">
      Our committee will be in touch shortly about your listing on ABAC&rsquo;s
      <a href="https://bhutaneseincanberra.org.au/partners" style="color:${COLOR.navy}">Our Partners</a>
      page and any recognition included at your tier. If you have a logo you&rsquo;d like
      featured, just reply to this email.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek, and thank you again,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
