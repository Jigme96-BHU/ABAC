import { COLOR, escapeHtml, emailShell } from "./shared";

/** Sent when an admin approves a corporate application — the applicant
 *  isn't a member yet at this point, only approved to pay. The webhook's
 *  corporate-approved email (sent after payment actually clears) is what
 *  confirms real membership — this one must never say "you're a member". */
export function corporatePaymentLinkEmail({
  businessName,
  contactName,
  tier,
  fee,
  paymentUrl,
}: {
  businessName: string;
  contactName: string;
  tier: string;
  /** e.g. "$500 AUD Annually" */
  fee: string;
  paymentUrl: string;
}) {
  const subject = "Your ABAC Corporate Membership application has been approved";

  const text = `Dear ${contactName},

Good news — ${businessName}'s application for ABAC Corporate Membership (${tier} tier) has been approved by the committee.

To activate your membership, please complete payment:
${paymentUrl}

Membership fee: ${fee}

Your Corporate Membership becomes active as soon as payment is confirmed.

Tashi Delek,
ABAC Committee
bhutancanberra@gmail.com`;

  const body = `
    <p style="margin:0 0 16px;color:${COLOR.ink};font-size:15px">Dear ${escapeHtml(contactName)},</p>
    <p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      Good news — <strong>${escapeHtml(businessName)}</strong>&rsquo;s application for ABAC
      Corporate Membership (<strong>${escapeHtml(tier)} tier</strong>) has been approved by the
      committee.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="padding:14px 24px;color:${COLOR.inkSoft};font-family:Georgia,serif;font-size:14px">Membership fee</td>
        <td style="padding:14px 24px;color:${COLOR.navy};font-family:Georgia,serif;font-size:16px;font-weight:700;text-align:right">${escapeHtml(fee)}</td>
      </tr>
    </table>
    <p style="margin:0 0 24px;text-align:center">
      <a href="${paymentUrl}" style="display:inline-block;background:${COLOR.navyDeep};color:${COLOR.goldBright};font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px">
        Complete payment
      </a>
    </p>
    <p style="margin:0 0 24px;color:${COLOR.inkSoft};font-size:13.5px;line-height:1.7">
      Your Corporate Membership becomes active as soon as payment is confirmed.
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
