# ABAC website

Website for the **Australia–Bhutan Association of Canberra Inc.**
Next.js 16 (App Router) + TypeScript. Replaces the WordPress site at
<https://bhutaneseincanberra.org.au>.

```bash
npm install
npm run dev        # http://localhost:4321
```

| Command | Does |
|---|---|
| `npm run dev` | dev server on port 4321 |
| `npm run build` | production build (also typechecks) |
| `npm run typecheck` | types only |

## Where things live

```
app/                 one folder per route
  page.tsx           home
  events/ stories/ join/ services/ team/ donate/ contact/ admin/ privacy/
  stories/[slug]/    one page per migrated news post
  globals.css        the whole design system
components/          header, footer, chat, cards, calendar
content/             site content as typed data (see below)
lib/nav.ts           nav links, single source of truth
public/img/          logo, story photos, team portraits
scripts/             one-off WordPress migration scripts
abac-website-preview.html   the original design prototype, kept for reference
```

## Content

Content lives in `content/` as plain typed arrays, so pages never hard-code
copy. Phase 3 swaps these files for Supabase queries without touching any
markup.

- `content/stories.ts` — **real**, migrated from WordPress. Regenerate with
  `node scripts/migrate-wordpress.mjs`.
- `content/team.ts` — **real**, scraped from the live `/ourteam/` page.
  Regenerate with `node scripts/migrate-team.mjs`.
- `content/events.ts` — ⚠️ **invented placeholder data.** See the warning at the
  top of that file.

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
| Admin portal that signed you in with no password | stub page only |
| Service request form collecting a passport number | removed until real auth exists |
| EN ⇄ Dzongkha toggle | cosmetic only — it swaps the button label, nothing else |
| Chatbot | ported as-is: a keyword matcher with canned answers, not an AI |

See `HANDOVER.md` for the launch checklist and what phase 2 adds.
