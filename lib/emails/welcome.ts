import { COLOR, escapeHtml, emailShell } from "./shared";

/** Content is adapted from the reference brochure design, not copied
 *  verbatim: this email only ever sends after paid activation/renewal or
 *  immediately for a free under-18 registration/renewal — so it always
 *  confirms a real, already-active membership.
 *  It must never say "if you haven't paid yet", since by the time it sends,
 *  that's no longer a possible state. */
export function welcomeEmail({
  name,
  memberNo,
  fee,
  validUntil,
  kind = "welcome",
  isFamily = false,
  household,
  dependents,
}: {
  name: string;
  memberNo: string;
  /** e.g. "$20 AUD Annually" or "Free — under 18" */
  fee: string;
  /** already formatted, e.g. "17 Jul 2027" */
  validUntil: string;
  kind?: "welcome" | "renewal" | "switch";
  /** Whether this is a Family Membership registration — used to say "family
   *  membership" explicitly in the intro line, not just in the fee text. */
  isFamily?: boolean;
  /** Other adults on the same Family Membership — each gets their own copy
   *  of this email, so this just lists who else is covered. */
  household?: { name: string; memberNo: string }[];
  /** Dependent children (under 18) covered by the same Family Membership —
   *  they never get their own copy of this email, but each has their own
   *  membership number (assigned the same way as any other member), so it's
   *  surfaced here rather than just their name. */
  dependents?: { name: string; memberNo: string }[];
}) {
  const isRenewal = kind === "renewal";
  const isSwitch = kind === "switch";
  const membershipNoun = isFamily ? "family membership" : "membership";
  // A switch keeps the existing renewal date, so this must not imply the
  // membership was extended — only that the category changed.
  const subject = isSwitch
    ? `ABAC membership changed to ${isFamily ? "Family" : "Single"}`
    : isRenewal
      ? `ABAC ${membershipNoun} renewed`
      : `Your ABAC ${membershipNoun} is confirmed`;
  const introText = isSwitch
    ? `Your ABAC membership has been changed to ${isFamily ? "Family" : "Single"} and is active. Your renewal date is unchanged.`
    : isRenewal
      ? `Your ABAC ${membershipNoun} has been renewed and is now active.`
      : `Kuzu-Kangpo la, and a warm welcome to the ABAC family! We are pleased to confirm that your ABAC ${membershipNoun} is now active.`;
  const introHtml = isSwitch
    ? `Your ABAC membership has been changed to <strong>${isFamily ? "Family" : "Single"}</strong> and is active. Your renewal date is unchanged.`
    : isRenewal
      ? `Your ABAC ${membershipNoun} has been renewed and is now active.`
      : `<strong>Kuzu-Kangpo la, and a warm welcome to the ABAC family!</strong> We are pleased to confirm that your ABAC ${membershipNoun} is now active.`;

  const householdLines =
    household && household.length > 0
      ? `\nAlso on this family membership: ${household.map((h) => `${h.name} (${h.memberNo})`).join(", ")}.`
      : "";
  const dependentLines =
    dependents && dependents.length > 0
      ? `\nDependents covered (under 18, no fee): ${dependents.map((d) => `${d.name} (${d.memberNo})`).join(", ")}.`
      : "";

  // Only shown on first-time registration — a renewal or category switch is
  // already a member who has read this once, so re-stating it every renewal
  // would be repetitive rather than welcoming.
  const significanceText =
    !isRenewal && !isSwitch
      ? `ABAC exists to support our fellow Bhutanese, foster meaningful relationships within our community, and sustain the activities that help our people here in Canberra. Together, our goal is to build an institution capable of meeting the real needs of Bhutanese individuals and families in this city, particularly our children, so that they may grow into individuals who are globally competent yet firmly rooted in their heritage. Achieving this is a collective responsibility, and it is on all of us to create the harmonious common space our community deserves. Your membership is a cornerstone of that effort, a real contribution toward the institution we hope to build for ourselves and for our children, and an example for the generations who will follow. We deeply appreciate your membership, and we look forward to building a stronger community together, for all Drukpas.\n\n`
      : "";
  const significanceHtml =
    !isRenewal && !isSwitch
      ? `<p style="margin:0 0 24px;color:${COLOR.ink};font-size:15px;line-height:1.6">
      ABAC exists to support our fellow Bhutanese, foster meaningful relationships within our community, and sustain the activities that help our people here in Canberra. Together, our goal is to build an institution capable of meeting the real needs of Bhutanese individuals and families in this city, particularly our children, so that they may grow into individuals who are globally competent yet firmly rooted in their heritage. Achieving this is a collective responsibility, and it is on all of us to create the harmonious common space our community deserves. Your membership is a cornerstone of that effort, a real contribution toward the institution we hope to build for ourselves and for our children, and an example for the generations who will follow. We deeply appreciate your membership, and we look forward to building a stronger community together, for all Drukpas.
    </p>`
      : "";

  const text = `Dear ${name},

${introText}

${significanceText}Here are your membership details:

Membership number: ${memberNo}
Valid until: ${validUntil}
${householdLines}${dependentLines}

Please retain this email as your membership confirmation and receipt. Your status can be
checked at any time at https://bhutaneseincanberra.org.au/join using the email address and
date of birth provided at registration. We also encourage you to explore the membership
benefits available on our website: https://bhutaneseincanberra.org.au/#benefits

Thank you and Pelden Drukpa!

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
      ${introHtml}
    </p>
    ${significanceHtml}
    <p style="margin:0 0 12px;color:${COLOR.ink};font-size:14px;font-weight:600">Here are your membership details:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};border-radius:8px">
      ${row("Membership number", escapeHtml(memberNo))}
      ${row("Valid until", escapeHtml(validUntil), true)}
    </table>
    ${
      household && household.length > 0
        ? `<p style="margin:16px 0 0;color:${COLOR.ink};font-size:13.5px;line-height:1.7">
            <strong>Also on this family membership:</strong> ${household.map((h) => `${escapeHtml(h.name)} (${escapeHtml(h.memberNo)})`).join(", ")}.
          </p>`
        : ""
    }
    ${
      dependents && dependents.length > 0
        ? `<p style="margin:8px 0 0;color:${COLOR.ink};font-size:13.5px;line-height:1.7">
            <strong>Dependents covered</strong> (under 18, no fee): ${dependents.map((d) => `${escapeHtml(d.name)} (${escapeHtml(d.memberNo)})`).join(", ")}.
          </p>`
        : ""
    }
    <p style="margin:20px 0;color:${COLOR.inkSoft};font-size:13.5px;line-height:1.7">
      Please retain this email as your membership confirmation and receipt. Your status can be
      checked at any time on the
      <a href="https://bhutaneseincanberra.org.au/join" style="color:${COLOR.navy}">Join page</a>,
      using the email address and date of birth provided at registration. We also encourage you
      to explore the
      <a href="https://bhutaneseincanberra.org.au/#benefits" style="color:${COLOR.navy}">membership benefits</a>
      available on our website.
    </p>
    <p style="margin:0 0 20px;color:${COLOR.ink};font-size:14px;font-weight:600">
      Thank you and Pelden Drukpa!
    </p>
    <p style="margin:0;color:${COLOR.ink};font-size:14px">
      Tashi Delek,<br />
      <strong>ABAC Committee</strong><br />
      <a href="mailto:bhutancanberra@gmail.com" style="color:${COLOR.navy}">bhutancanberra@gmail.com</a>
    </p>`;

  return { subject, text, html: emailShell(body) };
}
