import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy statement",
  description:
    "How the Australia–Bhutan Association of Canberra collects, uses, stores and shares members’ personal information, and how you can access or correct your own record.",
};

const LAST_UPDATED = "14 August 2026";

export default function PrivacyPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="page-head">
            <span lang="dz" className="dz-eyebrow">
              གསང་བའི་ངག་བརྗོད།
            </span>
            <h1>ABAC Privacy Statement</h1>
            <p>
              Australia–Bhutan Association of Canberra Incorporated (“ABAC,” “we,” “us”)
            </p>
            <p className="legal-updated">Last updated: {LAST_UPDATED}</p>
          </div>

          <div className="legal">
            <h2>1. Purpose of this statement, and which laws apply</h2>
            <p>
              ABAC is incorporated in the Australian Capital Territory and collects personal
              information from members, applicants, and dependants to administer membership
              under our Constitution and Membership Policy. This statement explains what we
              collect, why, who can see it, how long we keep it, and how you can access or
              correct your own record.
            </p>
            <p>
              <strong>Australian law.</strong> Associations of ABAC’s size are generally
              exempt from the <em>Privacy Act 1988</em> (Cth) as a “small business operator.”
              The Executive Committee has nonetheless chosen to handle personal information
              in line with the Australian Privacy Principles as good governance, consistent
              with clause 6.2 of the Membership Policy.
            </p>
            <p>
              <strong>Bhutanese law.</strong> Your Citizenship ID (CID) number is issued by
              the Royal Government of Bhutan, and many members hold an ongoing legal and
              personal connection to Bhutan. Bhutan’s own data protection framework — Chapter
              21 of the <em>Information, Communications and Media Act 2018</em>, and the{" "}
              <em>National Digital Identity Act 2023</em> — is administered by the Bhutan
              InfoComm and Media Authority (BICMA), but Bhutan does not currently have a
              standalone data protection statute or a dedicated data protection regulator
              equivalent to Australia’s OAIC. As the Constitution commits ABAC to a close
              working relationship with the Royal Bhutanese Embassy, we treat your CID with
              the same care Bhutanese law expects for citizen identity data, even though
              ABAC, as an Australian association storing data on Australian-hosted
              infrastructure, is not itself subject to Bhutanese jurisdiction.
            </p>

            <h2>2. What we collect</h2>
            <p>When you apply for or renew membership (single or family), we collect:</p>
            <ul>
              <li>Full name, email address, sex, date of birth</li>
              <li>Citizenship ID (CID) number</li>
              <li>Phone number and suburb (optional)</li>
              <li>
                For Family Membership: the same details for a second adult (if included) and
                for each dependent child under 18, as well as details of other family members
                including grandparents and extended family members living in the household
              </li>
            </ul>
            <p>
              We do not collect passport numbers, home addresses, or financial account
              details.
            </p>
            <p>
              <strong>Payment information.</strong> If you pay the membership fee, your card
              details are entered directly with our payment processor, Stripe, and never pass
              through or get stored on ABAC’s systems. We only receive confirmation that
              payment succeeded, and a reference we use to activate your membership.
            </p>
            <p>
              <strong>Contact form.</strong> If you use the Contact page, your name, email,
              and message are forwarded once by email to the committee’s inbox and are not
              stored in our membership database.
            </p>

            <h2>2b. Corporate Membership — business information collection</h2>
            <p>When a business or organisation applies for Corporate Membership, we collect:</p>
            <ul>
              <li>Business name and Australian Business Number (ABN)</li>
              <li>Business website and address — optional</li>
              <li>Contact person’s name, role/title, email address, and phone number</li>
              <li>General notes about the business (optional)</li>
              <li>Corporate logo — uploaded by admin after approval for public display</li>
            </ul>
            <p>
              We do not collect the business’s financial records, internal documents, or
              sensitive operational data beyond what’s needed to record the sponsorship.
            </p>
            <p>
              <strong>ABN and contact details.</strong> ABN is used only to verify the
              business entity for our records. Contact person’s details are used to send
              membership confirmations, payment information, and ABAC updates. These fields
              are not displayed publicly except for the business name, logo, and website (if
              provided) on the "Our Partners" page showing approved, active members by tier.
            </p>

            <h2>3. Why we collect it and how we use it</h2>
            <p>
              <strong>Individual and family membership.</strong> We use this information to:
            </p>
            <ul>
              <li>
                Assess and record your eligibility for membership under the Constitution and
                Membership Policy
              </li>
              <li>
                Maintain the Register of Members required by the Constitution (Model Rules,
                Part 1.2) and the <em>Associations Incorporation Act 1991</em> (ACT)
              </li>
              <li>Process your membership fee and issue a permanent membership number</li>
              <li>
                Send you registration, renewal, and expiry-reminder emails, and confirm your
                status when you ask us to
              </li>
              <li>
                Contact you about ABAC events, welfare support, and community activities
              </li>
              <li>
                Meet our legal and reporting obligations as an incorporated association
              </li>
            </ul>
            <p>
              <strong>Corporate membership.</strong> For business sponsorships, we use business
              and contact information to:
            </p>
            <ul>
              <li>
                Review and approve corporate membership applications under our tiered sponsorship
                framework
              </li>
              <li>Process the sponsorship fee via Stripe and maintain payment records</li>
              <li>
                Send the sponsoring business confirmations, renewal notices, and updates about
                ABAC activities
              </li>
              <li>
                Display the business name, logo, and website on the public "Our Partners" page,
                grouped by sponsorship tier
              </li>
              <li>Maintain the Register of Corporate Members as required by our governance</li>
            </ul>
            <p>
              We do not use your information for unrelated marketing, and we do not sell or
              trade it.
            </p>

            <h2>4. Who can see it</h2>
            <p>
              <strong>Individual members.</strong> Access to your CID, date of birth, phone
              number, and suburb is restricted to authorised Executive Committee office-bearers
              who need it to administer membership — consistent with clause 3.3 of the
              Membership Policy. This is enforced technically, not just by policy: our database
              rejects any request for this data except from a signed-in, authorised committee
              member, and no public page or API ever exposes it.
            </p>
            <p>
              Your name and membership status may be visible to the committee member(s)
              responsible for events or welfare coordination where relevant to your
              participation.
            </p>
            <p>
              <strong>Corporate members.</strong> A sponsoring business's ABN and contact
              person's email/phone are visible only to authorised committee members who
              administer corporate sponsorships. The business name, logo, website, and
              sponsorship tier are published on the public "Our Partners" page for approved,
              active members only.
            </p>

            <h2>5. Who we share it with</h2>
            <ul>
              <li>
                <strong>Stripe</strong> — processes card payments; receives only what’s needed
                to complete your transaction.
              </li>
              <li>
                <strong>Supabase</strong> — our database host, which stores your record
                securely; it does not use your data for any purpose of its own.
              </li>
              <li>
                <strong>Google (Gmail)</strong> — used only to send you the emails described
                above.
              </li>
            </ul>
            <p>
              We do not share your information with any other third party — including the
              Royal Bhutanese Embassy — unless required by Australian law (for example, a
              court order), or with your explicit consent.
            </p>

            <h2>6. Dependants (Family Membership)</h2>
            <p>
              If you register a spouse/partner or children as part of a Family Membership,
              you confirm you are authorised to provide their details on their behalf.
              Dependent children’s information is used only to record their participation in
              ABAC activities — never for marketing, and children never receive email from us
              directly.
            </p>

            <h2>7. How long we keep it</h2>
            <p>
              <strong>Individual members.</strong> We keep your membership record for as long
              as you remain a member, and for 7 years after your membership lapses or you
              resign, to meet our recordkeeping obligations under the{" "}
              <em>Associations Incorporation Act 1991</em> and to preserve continuity of your
              membership number if you rejoin.
            </p>
            <p>
              <strong>Corporate members.</strong> We keep a sponsoring business's record for as
              long as the sponsorship is active, and for 7 years after it expires or is
              terminated, to meet the same legal recordkeeping obligations and for accounting
              purposes.
            </p>

            <h2>8. Your rights</h2>
            <p>
              <strong>Individual members.</strong> You can:
            </p>
            <ul>
              <li>
                Check your status anytime at <Link href="/join">/join</Link>, using the email
                and date of birth you registered with
              </li>
              <li>Request a copy of your own record</li>
              <li>Correct inaccurate details</li>
              <li>
                Request deletion of your record, subject to what we’re legally required to
                retain (e.g., financial records)
              </li>
            </ul>
            <p>
              <strong>Corporate members.</strong> The sponsoring business contact person can:
            </p>
            <ul>
              <li>Request a copy of the business’s sponsorship record</li>
              <li>Update business contact information</li>
              <li>Request changes to the information displayed publicly (e.g., logo or website)</li>
            </ul>
            <p>
              To do any of these, email{" "}
              <a href="mailto:bhutancanberra@gmail.com">bhutancanberra@gmail.com</a> with your
              name (individual member) or business name (corporate member). We’ll respond within
              a reasonable time.
            </p>

            <h2>9. Complaints</h2>
            <p>
              If you’re unhappy with how we’ve handled your information, contact us first at
              the email above. If you remain unsatisfied, you may complain to the Office of
              the Australian Information Commissioner (
              <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">
                oaic.gov.au
              </a>
              ) — the applicable regulator, since ABAC and its data are based in Australia.
              Bhutan does not currently operate an equivalent standalone data protection
              authority.
            </p>

            <h2>10. Changes to this statement</h2>
            <p>
              We’ll update this page if what we collect or how we use it changes and update
              the date at the top.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
