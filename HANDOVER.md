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
- [ ] **Run the member-number migration** (`0004_member_number.sql`). Adds
      the auto-assigned `member_no` column and updates the confirmation
      lookup `/join/success` uses to display it — same SQL Editor as the
      others.
- [x] **Run the check-my-status migration** (`0005_check_status.sql`) — done,
      confirmed 2026-07-26.
- [ ] **Re-run the notification-email migration** (`0006_member_notification.sql`)
      — it now has an explicit `DROP FUNCTION` before recreating it. Without
      that drop, `CREATE OR REPLACE` can't add new return columns to an
      already-existing function, so an earlier run of this file left the
      old 4-column version in place — the real cause of the welcome email
      showing "$NaN" for the fee and "—" for the expiry. Confirmed fixed
      2026-07-26; if you already ran an older copy, you must run this one
      again, the same "run it again is safe" logic used elsewhere does not
      cover this specific kind of change.
- [ ] **Post the real upcoming events** via `/admin` once signed in. Only a
      test event exists so far ("Jigme Tharchen Made this event for test",
      2026-07-26) — delete it before launch. There is no more placeholder
      data to replace — the fake Losar picnic / Dzongkha class / Multicultural
      Festival entries from the design mockup are gone entirely, not hidden
      behind a warning.
- [x] **Membership fees confirmed** by the committee 2026-07-26: **$20 per
      adult per year, free under 18.** `app/join/actions.ts` and
      `app/join/page.tsx` both hard-code `2000` cents / `$20` — search for
      that if the fee ever changes.
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
case, and `/join/success` that checks real payment status via a narrow RPC
rather than trusting the redirect. Membership only ever activates from the
`checkout.session.completed` **webhook** (`app/api/stripe/webhook`), via
another SECURITY DEFINER function (`activate_membership`) — same pattern as
`is_admin()`, so no service-role key is needed anywhere in the app. Each
membership gets an auto-assigned number (`ABAC-<year>-<6 digits>`, never
client-chosen) shown on `/join/success`. "Check my status" on `/join` looks
membership up by email + date of birth (no login, matching the original
design) — deliberately returns only status/number/expiry, never CID, phone,
or suburb, since email+DOB isn't strong authentication. A welcome email
(name + membership number, via Gmail SMTP) sends once a membership actually
activates — from the webhook for paid members, immediately for free
under-18 ones.

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
