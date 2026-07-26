# ABAC website

Website for the **Australia–Bhutan Association of Canberra Inc.**
Next.js 16 (App Router) + TypeScript. Replaces the WordPress site at
<https://bhutaneseincanberra.org.au>.

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase project URL + anon key
npm run dev                        # http://localhost:4321
```

Events need a Supabase project — see [Backend](#backend-supabase) below. Without
`.env.local` set up, every page that reads events will error, since there's no
static fallback data anymore.

| Command | Does |
|---|---|
| `npm run dev` | dev server on port 4321 |
| `npm run build` | production build (also typechecks) |
| `npm run typecheck` | types only |

## Where things live

```
app/                 one folder per route
  page.tsx           home
  events/            calendar + upcoming (Supabase) + past write-ups (static)
  events/[slug]/     one page per migrated news post
  join/ services/ team/ donate/ contact/ privacy/
  admin/             magic-link sign-in + event CRUD dashboard
  admin/actions.ts   server actions — Postgres RLS is the real access control
  auth/callback/     exchanges the magic-link code for a session
  globals.css        the whole design system
components/
  admin/             login form, sign-out, event form, dashboard
  (rest)             header, footer, chat, cards, calendar
content/             static content as typed data (see below)
lib/nav.ts           nav links, single source of truth
lib/supabase/        client.ts (browser), server.ts (cookies), middleware.ts
proxy.ts             refreshes the Supabase session on every request
                     (Next 16's renamed "middleware.ts" convention)
supabase/migrations/ SQL to run once in the Supabase Dashboard's SQL Editor
public/img/          logo, story photos, team portraits
scripts/             one-off WordPress migration scripts
abac-website-preview.html   the original design prototype, kept for reference
```

## Backend (Supabase)

Events are the first thing on this site backed by a real database — see
`supabase/migrations/0001_events_admin.sql` for the schema (an `events` table
plus an `admins` allowlist gating who can sign in at `/admin`) and the exact
steps to run it. `HANDOVER.md` has the account-ownership and admin-management
details; this section is just the local dev setup.

1. Get the project URL and anon/publishable key from Project Settings → Data
   API, put them in `.env.local` (see `.env.local.example`).
2. Run the migration once, in the Supabase Dashboard's SQL Editor.
3. Add `http://localhost:4321/**` to Authentication → URL Configuration →
   Redirect URLs, or magic-link sign-in will fail silently.
4. `/admin` sends a one-time email link — no password. Only emails in the
   `admins` table can actually manage events; anyone else who signs in sees a
   "not an approved admin" message instead.

## Content

Static content lives in `content/` as plain typed arrays — no CMS, no
database, so pages never hard-code copy inline. Phase 3 moves stories and
team the same way events already went (see below).

- `content/stories.ts` — **real**, migrated from WordPress. Regenerate with
  `node scripts/migrate-wordpress.mjs`.
- `content/team.ts` — **real**, scraped from the live `/ourteam/` page.
  Regenerate with `node scripts/migrate-team.mjs`.
- `content/events.ts` — **not data anymore** — just the `ABACEvent` type and
  pure helper functions (`byMonth`, `eventDays`, …) shared by the calendar and
  the event rows. The actual events live in Supabase; see Backend below.

Both migration scripts are re-runnable and overwrite their output file.

## Design

`app/globals.css` is the prototype's stylesheet ported almost verbatim — same
class names, same CSS variables (`--gd-deep`, `--gold`, `--paper`…). Two
deliberate changes:

1. The prototype's `.page { display:none }` page-swapping system is gone; Next
   routes replace it.
2. Font families point at `next/font` CSS variables (`--font-cinzel`,
   `--font-albert`, `--font-tibetan`) so the fonts are self-hosted rather than
   fetched from Google on every visit.

Don't introduce Tailwind or a component library here — the stylesheet is small
and coherent, and mixing systems is how it stops looking designed.

## What is deliberately not built

The prototype simulated things it couldn't do. Those simulations were **not**
ported, because a fake payment form is worse than none:

| Prototype had | Status |
|---|---|
| Card fields + mock Stripe checkout | removed — `/join`, `/donate` explain and point to email |
| Member status lookup returning a fake member | removed |
| Admin portal that signed you in with no password | replaced — real magic-link auth, see Backend below |
| Service request form collecting a passport number | still removed — needs the same real auth as membership (phase 2b) |
| EN ⇄ Dzongkha toggle | cosmetic only — it swaps the button label, nothing else |
| Chatbot | ported as-is: a keyword matcher with canned answers, not an AI |

See `HANDOVER.md` for the launch checklist and what phase 2 adds.
