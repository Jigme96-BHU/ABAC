import { emailShell, COLOR } from "./shared";

export type CorporateExpiryEmailType = "before" | "on";

export function corporateExpiryReminderEmail(
  businessName: string,
  tier: "gold" | "platinum" | "diamond",
  daysUntilExpiry: number,
  renewalLink: string
): { subject: string; text: string; html: string } {
  const tierLabel = { gold: "Gold", platinum: "Platinum", diamond: "Diamond" }[tier];

  const isBefore = daysUntilExpiry > 0;
  const daysText = daysUntilExpiry === 1 ? "1 day" : `${daysUntilExpiry} days`;

  const subject = isBefore
    ? `Your ${tierLabel} sponsorship expires in ${daysText}`
    : "Your ABAC sponsorship has expired";

  const body = isBefore
    ? `
    <p>Dear ${businessName},</p>
    <p>
      We are writing to advise that your ${tierLabel}-tier corporate sponsorship with the
      Australia–Bhutan Association of Canberra (ABAC) will reach its expiration date in <strong>${daysText}</strong>.
    </p>
    <p>
      Your sponsorship has been instrumental in supporting ABAC's mission to foster cultural understanding
      and community engagement within the Canberra region. As a valued partner, your organisation is prominently
      featured on our "Our Partners" page, reflecting your commitment to our community.
    </p>
    <p>
      To ensure continuity of your sponsorship and maintain your visibility on our platform, we encourage you
      to renew at your earliest convenience. Renewal is quick and straightforward:
    </p>
    <p style="text-align: center; margin: 20px 0;">
      <a href="${renewalLink}" style="display: inline-block; padding: 12px 24px; background: ${COLOR.navy}; color: #fff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px;">
        Renew Sponsorship
      </a>
    </p>
    <p>
      If you have any questions regarding your sponsorship or the renewal process,
      please do not hesitate to contact us at <a href="mailto:bhutancanberra@gmail.com">bhutancanberra@gmail.com</a>.
    </p>
    <p>
      We deeply appreciate your ongoing support and look forward to your continued partnership with ABAC.
    </p>
    <p>Warm regards,<br/>The ABAC Executive Committee</p>
    `
    : `
    <p>Dear ${businessName},</p>
    <p>
      We are writing to inform you that your ${tierLabel}-tier corporate sponsorship with the
      Australia–Bhutan Association of Canberra (ABAC) has reached its expiration date today.
    </p>
    <p>
      Your organisation's partnership has been invaluable to ABAC, and we have greatly appreciated the
      opportunity to feature your business on our "Our Partners" page. Your support has strengthened our
      ability to serve the community and advance our cultural and social initiatives.
    </p>
    <p>
      If you wish to continue your sponsorship and maintain your presence among our valued partners,
      we welcome you to renew immediately. The renewal process is simple and can be completed online:
    </p>
    <p style="text-align: center; margin: 20px 0;">
      <a href="${renewalLink}" style="display: inline-block; padding: 12px 24px; background: ${COLOR.navy}; color: #fff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px;">
        Renew Sponsorship
      </a>
    </p>
    <p>
      Should you have any questions about the renewal process or would like to discuss alternative
      sponsorship arrangements, please contact us at <a href="mailto:bhutancanberra@gmail.com">bhutancanberra@gmail.com</a>.
      We remain committed to working with you.
    </p>
    <p>
      We hope to continue our valued partnership and welcome your renewal.
    </p>
    <p>Warm regards,<br/>The ABAC Executive Committee</p>
    `;

  const html = emailShell(body);

  return {
    subject,
    text: `${subject}\n\nRenew at: ${renewalLink}`,
    html,
  };
}
