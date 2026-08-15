# ABAC website — handover

ABAC's executive committee changes every year. This file exists so the website
survives that. **Update it whenever an account, password holder, or service
changes.**

---

## 1. Accounts — the single most important thing

Every account below must be owned by **bhutancanberra@gmail.com**, never by an
individual committee member's personal account. If a service is registered to a
person, the association loses the website when that person steps down.

| Service | What for | Owner | Cost |
|---|---|---|---|
| Domain `bhutaneseincanberra.org.au` | the address | _to confirm — currently with the existing WordPress host_ | ~$20/yr |
| Vercel | hosting | _not set up yet_ | free tier excludes commercial use; expect ~$20/mo once memberships are paid online |
| Supabase | events, stories, members data; committee sign-in | project `abac-website`, ref `ooywyhednfgjisdondtg`, Sydney region | free tier, then ~$25/mo |
| Stripe | membership payments | account `acct_1Tx5KBHZx7bS7bJ3` ("ABAC sandbox") — **sandbox/test mode only so far, no real payouts configured** | ~1.75% + 30¢ per domestic card |
| Gmail SMTP | welcome-membership email | `bhutancanberra@gmail.com`, an App Password (Security → App passwords) — **not the account's real password**, revoke and reissue at handover | free, ~500 emails/day limit |
| GitHub | the code | _not set up yet_ | free |

Confirm current pricing with each provider rather than trusting this table —
it was written in July 2026 and these change.

**At each handover:** transfer ownership, rotate the shared mailbox password,
and confirm the new treasurer/secretary can log in to Stripe and Supabase
*before* the outgoing committee leaves.

### Supabase secrets — not in this repo

Two values exist only in the Supabase dashboard and must never be pasted into
the codebase, chat, or committed to git:

- **Database password** — set when the project was created. Store it in the
  shared password manager.
- **`service_role` key** (Project Settings → Data API) — bypasses every
  row-level-security rule. Never needed for anything this site currently
  does; if a future feature seems to need it, that's a sign it belongs in a
  server-only environment variable on Vercel, not in the repo.

The two values *in* `.env.local` (project URL and the publishable/anon key)
are safe to share — they end up in the browser bundle regardless. Security
comes from the row-level-security policies in
`supabase/migrations/0001_events_admin.sql`, not from hiding those.

### How committee admin access works

Sign-in is a magic link, not a password — nothing to lose at handover. Who
can actually sign in and edit events is controlled by one table:

- **To add an admin:** Supabase Dashboard → Table Editor → `admins` → insert
  a row with their email. That's the whole process.
- **To remove one:** delete their row from the same table.
- The list is seeded with `bhutancanberra@gmail.com` in the migration —
  add real committee members' individual emails too, so it's traceable who
  posted what.

---

## 2. Launch blockers

The site must not replace the live WordPress one until all of these are done.

- [ ] **Privacy statement written** (`app/privacy/page.tsx` is an empty stub).
      Legally required once the join form collects names, addresses and dates of
      birth. Must state what is collected, where it is stored, who can see it,
      how long it is kept, and how a member gets their record corrected or
      deleted.
- [x] **Run the events database migration** (`0001_events_admin.sql`) —
      done, confirmed 2026-07-25.
- [x] **Add the Supabase auth redirect URL** — done, `http://localhost:4321/**`
      added. Add the production domain too once it exists, or magic-link
      sign-in will fail there.
- [x] **Run the stories database migration** (`0002_stories.sql`) — done,
      confirmed 2026-07-25. `/admin`'s Stories tab (photo upload included)
      and the public Events/home pages are live against Supabase, merged
      with the 9 migrated WordPress stories.
- [x] **Run the members database migration** (`0003_members.sql`) — done,
      confirmed 2026-07-26.
- [x] **Run the member-number migration** (`0004_member_number.sql`) — done,
      confirmed 2026-08-15. Adds
      the auto-assigned `member_no` column and updates the confirmation
      lookup `/join/success` uses to display it — same SQL Editor as the
      others.
- [x] **Run the check-my-status migration** (`0005_check_status.sql`) — done,
      confirmed 2026-07-26.
- [x] **Re-run the notification-email migration** (`0006_member_notification.sql`)
      — done, confirmed 2026-08-15. It now has an explicit `DROP FUNCTION`
      before recreating it. Without that drop, `CREATE OR REPLACE` can't add
      new return columns to an already-existing function, so an earlier run
      of this file left the old 4-column version in place — the real cause
      of the welcome email showing "$NaN" for the fee and "—" for the
      expiry.
- [x] **Run the membership-renewals migration** (`0007_membership_renewals.sql`)
      — done, confirmed 2026-08-15. This makes membership numbers permanent:
      future renewals match the existing member by date of birth + CID,
      extend `expires_at`, and send a renewal email instead of creating a
      second membership number.
- [x] **Run the expiry-reminders migration** (`0008_membership_expiry_reminders.sql`)
      — done, confirmed 2026-08-15 (fixed an `order by member_id` bug in the
      `get_members_due_for_expiry_reminders` function — the select list
      wasn't aliasing `m.id` to `member_id`, so Postgres couldn't resolve it
      in the ORDER BY; fixed in the migration file itself). This adds the
      database fields/functions for automated reminder emails: one 14 days
      before expiry and one on the expiry date.
- [x] **Run the family-membership migration** (`0009_family_membership.sql`,
      requires `0007` and `0008` above) — done, confirmed 2026-08-15. Adds
      the **Family Membership**
      category from the 2026 Membership Policy: parent(s) + dependent
      children under 18 for a flat **$30/year** (vs $20/year Single), each
      adult individually recorded with their own DOB/CID and own confirmation
      email. `/join` now offers both categories side by side.
- [x] **Run the documents migration** (`0010_documents.sql`, requires `0001`)
      — done, confirmed 2026-08-15. Adds the **Policies & Documents** library: a "Documents" tab in
      `/admin` for uploading PDF/DOC/DOCX files (Constitution, Membership
      Policy, financial reports, minutes), and a public `/documents` page
      (linked from the footer) grouping published documents by category for
      viewing/downloading.
- [x] **Run the volunteers migration** (`0011_volunteers.sql`, requires
      `0001`) — done, confirmed 2026-08-15. Adds a public `/volunteers` registration form (Name, Sex,
      CID, DOB, phone, email — plus parent/guardian name, phone, email, and
      a consent checkbox when the volunteer is under 18), linked from the
      footer above Donate. Submissions are admin-only (same private-data
      model as `members`, not publicly readable) and appear in a new
      "Volunteers" tab in `/admin`, including a CSV export.
- [x] **Run the corporate membership migration** (`0012_corporate_membership.sql`,
      requires `0001`) — done, confirmed 2026-08-15. Adds **Corporate Membership** (Diamond / Platinum /
      Gold) — `/join` now leads with a Community vs Corporate choice, the
      existing Single/Family flow sits under Community unchanged. Corporate
      applications are **not** self-serve: they land as `pending` in a new
      "Corporate" tab in `/admin` for the committee to approve/reject (the
      committee also gets an email notification at each application), an
      approval emails the applicant a Stripe payment link, and only Stripe
      confirming payment (via the webhook) activates the membership and
      sends the full congratulatory welcome email. Approved/active partners
      get a logo the admin uploads/removes in that same tab, shown on the
      new public `/partners` ("Our Partners") page, grouped by tier.
      **Tier fees are placeholders** ($200/$500/$1,000 for Gold/Platinum/
      Diamond) — search `CORPORATE_TIER_FEES_CENTS` in `lib/corporate-tiers.ts`
      once the committee confirms real amounts. Tier benefits shown on the
      public form are also drafts pending committee sign-off (see
      `components/CorporateForm.tsx`'s `TIER_BENEFITS`).
- [x] **Run the service requests migration** (`0013_service_requests.sql`,
      requires `0001`) — done, confirmed 2026-08-15. Adds paid **Letter of Residency** and **Character
      Reference** requests to `/services`, replacing the old "not available
      yet, contact us" stub. Requesters upload a passport (required) plus
      optional visa/license/proof-of-residency, pay **$10** via Stripe, and
      only get a confirmation email once payment actually clears (same
      webhook pattern as membership/corporate). This is the most sensitive
      data in the app — the `service-documents` Storage bucket is **private**
      (unlike every other bucket in this project), so admins can only view
      uploaded documents via a short-lived signed URL from the new
      "Services" tab in `/admin`, never a public link.
- [x] **Run the bulk email campaigns migration** (`0014_email_campaigns.sql`,
      requires `0001`) — done, confirmed 2026-08-15. Adds the **Email** tab in `/admin` where the committee
      can send mass announcements to filtered members. Filters include:
      membership type (Single/Family), corporate tier (Gold/Platinum/Diamond),
      date range (joined between X and Y), active/inactive status, and
      specific individual selection. The admin form shows a live preview, and
      all campaigns are logged with audit trail (who sent what, when, to how
      many people). Emails are sent immediately on submission and recorded in
      the `email_campaigns` table. Supports optional attachments (though the
      attachment upload UI is not yet wired to Storage).
- [x] **Run the story videos migration** (`0015_story_videos.sql`, requires
      `0002_stories.sql`) — done, confirmed 2026-08-15. Extends the **Stories** feature with optional
      **video uploads** (MP4, WebM, or MOV format). Each story can now have
      both a photo *and* a video (both optional). Admin form includes video
      file input and a preview player showing the current video. Videos are
      stored in a public `story-videos` Storage bucket and rendered on the
      public story detail pages with HTML5 video controls. Video duration
      detection happens in the browser; the admin sees the uploaded file size.
      Kept under **3–4MB per story** to minimize bandwidth costs.
- [x] **Run the team members migration** (`0016_team_members.sql`, requires
      `0001`) — done, confirmed 2026-08-15. Enables **admin management of the Leadership page** — adds a
      "Team" tab in `/admin` where the committee can add/edit/remove team
      members across four categories: Executive, Founders, Advisory Board, and
      Former Presidents. Each member record includes name, role/title, optional
      email/phone, bio, and photo. The public `/team` page now fetches active
      members from the database, falling back to static content if empty.
      Layouts remain the same (Executive grid, Advisory orbit, Founder cards),
      but they now scale dynamically — no fixed blank spots, responsive to
      member count changes. Photos stored in a public `team-photos` Storage
      bucket (admin-only write).
- [x] **Run the corporate expiry reminders migration** (`0017_corporate_expiry_reminders.sql`)
      — done, confirmed 2026-08-15. Adds **automated expiry reminder emails for corporate sponsors** — two
      reminders per sponsorship (14 days before expiry and on expiry day), each
      with a direct link to the renewal form. Adds `reminder_14d_sent` and
      `reminder_expiry_sent` columns to `corporate_members` to track which
      reminders have been sent. The cron job
      `/api/corporate/expiry-reminders` runs daily and sends reminders. Also adds
      a **Corporate Membership Status check** on the `/join` page where businesses
      can check their sponsorship status (Pending/Approved/Active/Expired) using
      business name + ABN + email. Status check form is collapsible by default.
      Expired (passed expiry date) memberships display as "Expired" status with
      renewal prompt.
- [x] **Run the membership category switching migration** (`0018_category_switch.sql`,
      requires `0007` and `0009`) — done, confirmed 2026-08-15. Enables members to switch between Single and
      Family categories mid-membership. The pricing model anchors on the member's
      existing renewal date and prorates the difference in annual fees for the
      remaining days — a Single member switching to Family with 275 days left at
      a $10 difference pays $7.53. Switching keeps the household on one renewal
      date and prevents fee-drift as members change categories. Live on `/join`
      behind an "Already a member? Switch category" disclosure
      (`components/SwitchCategoryForm.tsx`).
- [x] **Run the service member pricing migration** (`0019_service_member_pricing.sql`,
      requires `0013` and `0004`) — done, confirmed 2026-08-15. Adds **two-tier pricing for service requests**:
      ABAC members pay **$10**, non-members pay **$45** for Letter of Residency
      or Character Reference. The member lookup is performed server-side at
      submission (checking the membership date-of-birth + CID against the database)
      and the charge amount re-verified in the Stripe webhook before activation.
      Non-member requests are processed the same way — payment via Stripe first,
      confirmation email after the webhook confirms payment. Updates the `/services`
      form to explain the pricing difference and show the applicant's determined
      rate before they hit Stripe.
- [ ] **Run the admin search & upload limits migration**
      (`0020_admin_search_and_upload_limits.sql`, requires `0003`, `0012`, `0013`).
      Adds case-insensitive search indexes backing the new admin **Members** tab
      and the Corporate search box, and sets a real 3MB server-side cap on the
      `service-documents` Storage bucket (a backstop behind the client-side
      check in the new direct-to-storage upload flow, not just something the
      browser promises to respect).
- [ ] **Run the event RSVPs migration** (`0021_event_rsvps.sql`, requires `0001`).
      Replaces the RSVP button on `/events` — permanently disabled since before
      payments went live — with a real form (name, email, phone). One RSVP per
      email per event; a repeat attempt gets a friendly "you've already RSVPed"
      message instead of a duplicate row. Confirmation email sent immediately
      (RSVPs aren't gated on payment). Admins view RSVPs per event from a
      "View RSVPs" button in the existing Events tab — no new admin tab. The
      "Volunteer" call-to-action on events (the same dead-button bug) now links
      to `/volunteers` instead.
- [ ] **Run the corporate business certificate migration**
      (`0022_corporate_business_certificate.sql`, requires `0012`). Adds an
      optional **Business Certificate** upload to the Corporate Membership
      application form, stored in a new private `corporate-documents` bucket
      (viewed by admins via a short-lived signed URL, same pattern as service
      documents — a business certificate can carry a registration number, so
      it isn't in the public `corporate-logos` bucket). Also adds a
      `hidden_from_partners` toggle so admins can hide an active partner from
      the public `/partners` page without touching its `status` (which the
      approval/payment state machine depends on) — a "Hide from Our Partners"
      button per active row in the admin Corporate tab.
- [ ] **Run the team members seed migration** (`0023_team_members_seed.sql`,
      requires `0016`). Fixes a real bug: `/team` merged the database with
      static content by falling back to static *only when a category was
      empty*, so adding a single admin executive member silently erased the
      other eight from view. This seeds every current Executive/Advisory/
      Founder/Former President into `team_members`, making the database the
      real source of truth — admins can now add or remove members without
      affecting anyone else, and Former Presidents (previously hardcoded to
      ignore the database entirely) now reads from it too. No layout changes.
- [ ] **Run the story images migration** (`0024_story_images.sql`, requires
      `0002`). Adds a **photo gallery** to Stories — the admin Stories tab now
      accepts multiple photos per story (first photo is the cover shown on
      cards), each removable individually. Also broadens accepted image
      formats beyond JPEG/PNG/WebP to GIF, HEIC/HEIF (iPhone photos), and AVIF
      — dimensions aren't read for HEIC/HEIF/AVIF (no parser for those
      container formats), so those degrade to a placeholder tile rather than
      breaking, a known/documented gap.
- [ ] **Run the corporate logo public-upload migration**
      (`0025_corporate_logo_public_upload.sql`, requires `0012`). Lets a
      corporate applicant attach their logo directly on the public
      registration form (`components/CorporateForm.tsx`), instead of only
      after the committee approves them — it's stored immediately and shows
      up on `/partners` automatically once the sponsorship goes active
      (`get_active_corporate_partners()` already returns `logo_path`, no
      other wiring needed). Admins can still replace or remove it from the
      Corporate tab in `/admin` at any point.
- [ ] **Set up the daily expiry-reminder cron job.** Add a production
      `CRON_SECRET`. `vercel.json` already schedules a daily production call
      to `/api/members/expiry-reminders`; Vercel sends
      `Authorization: Bearer <CRON_SECRET>` automatically. If the site is
      hosted somewhere else, schedule the same daily GET request with that
      header. Once per day is enough; the database records which reminders
      were already sent.
- [ ] **Post the real upcoming events** via `/admin` once signed in. Only a
      test event exists so far ("Jigme Tharchen Made this event for test",
      2026-07-26) — delete it before launch. There is no more placeholder
      data to replace — the fake Losar picnic / Dzongkha class / Multicultural
      Festival entries from the design mockup are gone entirely, not hidden
      behind a warning.
- [x] **Membership fees confirmed** by the committee 2026-07-26 and the 2026
      Membership Policy: **$20 Single adult per year, free Single under 18,
      and $30 Family per year.** `app/join/actions.ts` and `app/join/page.tsx`
      hard-code `2000` cents / `$20` and `3000` cents / `$30` — search for
      those if the fees ever change.
- [ ] **Switch Stripe from sandbox (test mode) to Live mode** before
      accepting real payments — see the accounts table above. Test mode
      cards never move real money; this is genuinely required before
      launch, not optional cleanup. When switching: get a fresh Live-mode
      secret key, and set up a Dashboard webhook endpoint (Developers →
      Webhooks → add endpoint, pointed at
      `https://<production-domain>/api/stripe/webhook`, event
      `checkout.session.completed`) — the `stripe listen` CLI secret
      currently in `.env.local` only works for local dev.
- [ ] **Portrait of His Majesty — permission confirmed.** An image is now in
      place at `public/img/royal/hm-king.jpg`, but it appears to be a composite
      built from a professional photograph. Confirm with the Royal Bhutanese
      Embassy that ABAC may publish it, or replace it with an officially
      released portrait. To swap it, overwrite that file — the page picks up
      the new size and busts caches automatically.
- [ ] **Instagram link decided.** The prototype linked to
      `instagram.com/YOUR-HANDLE`; it has been removed from the footer rather
      than shipped broken. Add the real handle or leave it out.
- [ ] **Redirects from the old WordPress URLs** so existing links and search
      results keep working. Old story URLs are percent-encoded and ugly
      (`/%f0%9d%90%80…`); map them to the clean new slugs in `content/stories.ts`.
- [ ] **Someone can edit content without a developer** — either phase 3's admin
      screens, or an agreed process for who edits `content/*.ts`.

---

## 3. Things found on the live site worth fixing

Noticed while migrating. None are caused by this rebuild.

1. **The WordPress REST API is fully open.** `wp-json/wp/v2/media` lists every
   uploaded file to anyone. That is how the migration scripts work, but it also
   means anything ever uploaded is public, including files not linked from any
   page. Worth an audit before the old site is retired.
2. **Jigme Jamtsho's bio has a chat app's HTML pasted into it.** The live page's
   markup contains `data-message-author-role="assistant"` and Tailwind classes
   from an AI chat interface — someone pasted a generated answer straight into
   the editor. The migration strips it, but fix it at the source too.
3. **Former-president tenures contradict the news posts.** `/ourteam/` lists
   *both* Ugyen Penjor and Jigme Jamtsho as president for **2025–2026**, while
   the July 2025 handover post says Ugyen Penjor handed over *to* Jigme Jamtsho.
   The migration copies the page as-is rather than guessing. The committee
   should confirm and correct the real dates.
4. **Missing portraits:** Ugyen Penjor, Tashi Pelden, Tandin Dorji, Namgyel
   Dorji and Sonam Tobgye have no photo in the media library, so they render as
   initials.

---

## 4. Roadmap

**Phase 1 — done.** Design ported, nine routes live, real stories and team
migrated, builds clean and fully static.

**Phase 2a — events + stories admin. Events done** (migration run, confirmed
working). **Stories done in code**, pending its migration being run (see
launch blockers). Supabase (Sydney region), magic-link sign-in gated by an
`admins` allowlist table (no shared password), and a tabbed dashboard at
`/admin` to create/edit/delete both events and stories — stories support a
photo upload (goes to a public Storage bucket; dimensions are read
server-side before upload so the public pages always get the correct aspect
ratio). The public Events page, its calendar (click a date to see that day's
events), and the "Stories and highlights" sections on the home and Events
pages all read live from Supabase, merged with the original 9
WordPress-migrated stories in `content/stories.ts` — nothing left to sync
manually going forward.

**Phase 2b — membership payment. Done in sandbox**, not yet switched to
Stripe Live mode (see launch blockers). `/join` is a real form now: a
`members` table (strict RLS — no public read, PII stays admin-only),
age-computed fee ($20 adults, free under 18), Stripe Checkout for the paid
case, renewals keep the original membership number, and `/join/success`
checks real payment status via a narrow RPC rather than trusting the redirect.
Membership only ever activates from the `checkout.session.completed`
**webhook** (`app/api/stripe/webhook`), via SECURITY DEFINER functions —
same pattern as `is_admin()`, so no service-role key is needed anywhere in
the app. Each membership gets an auto-assigned permanent number
(`ABAC-<first-active-year>-<6 digits>`, never client-chosen) shown on
`/join/success`. "Check my status" on `/join` looks membership up by email +
date of birth (no login, matching the original design) — deliberately returns
only status/number/expiry, never CID, phone, or suburb, since email+DOB isn't
strong authentication. A welcome or renewal email (name + membership number,
via Gmail SMTP) sends once a membership actually activates — from the webhook
for paid members, immediately for free under-18 ones. A daily protected cron
route (`/api/members/expiry-reminders`) sends expiry reminders 14 days before
expiry and again on the expiry date.

**Found and fixed 2026-07-26, before anyone had actually completed a
registration:** the join flow's own database calls violated the RLS it
was supposed to work within. `members` deliberately has no public SELECT or
UPDATE policy (CID/DOB/phone must stay admin-only), but the original code
did `.insert(...).select().single()` to read the new row's id back, and
separately `.update()` to attach the Stripe session id — both silently
blocked by the very policies protecting the data, meaning every submission
failed with a generic error. Fixed by generating the row's id in the server
action instead of reading it back, and — for paid registrations — creating
the Stripe session *before* the single insert, so the session id is already
part of that one write. No RLS was loosened to fix this; if a future change
to this flow needs `.select()` or `.update()` to work from the public side,
that's a sign the approach needs rethinking, not the policy.

Donations aren't wired up yet; same pattern would apply.

**Phase 3 — admin CRUD for stories and team** (events are already done — see
phase 2a), so the committee edits all content in a browser. This is what
keeps the site alive after handover.

**Contact form — done 2026-07-26.** `/contact` now sends real email via the
same Gmail SMTP transporter as the welcome email (`lib/mail.ts`): one to
`bhutancanberra@gmail.com` with `replyTo` set to the sender so the committee
can reply directly, and an auto-reply confirmation to the sender, matching
the page's existing "you'll get an instant email" promise. The committee
notification send is treated as must-succeed (shows an error to the sender
if it fails); the auto-reply confirmation is best-effort, same pattern as
the membership welcome email. Verified end-to-end via the running dev
server, not just typecheck/build.

**Phase 4 — services, donations, chatbot.** Replace the keyword matcher in
`components/ChatWidget.tsx` with a real endpoint, rate-limited, with the FAQ and
current events as context.

**Phase 5 — cutover.** DNS, redirects, then retire WordPress. Keep the old site
running until this point.
