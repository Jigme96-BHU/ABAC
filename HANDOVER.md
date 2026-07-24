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
| Supabase | member database (phase 2) | _not set up yet_ | free tier, then ~$25/mo |
| Stripe | payments (phase 2) | _not set up yet_ | ~1.75% + 30¢ per domestic card |
| GitHub | the code | _not set up yet_ | free |

Confirm current pricing with each provider rather than trusting this table —
it was written in July 2026 and these change.

**At each handover:** transfer ownership, rotate the shared mailbox password,
and confirm the new treasurer/secretary can log in to Stripe and Supabase
*before* the outgoing committee leaves.

---

## 2. Launch blockers

The site must not replace the live WordPress one until all of these are done.

- [ ] **Privacy statement written** (`app/privacy/page.tsx` is an empty stub).
      Legally required once the join form collects names, addresses and dates of
      birth. Must state what is collected, where it is stored, who can see it,
      how long it is kept, and how a member gets their record corrected or
      deleted.
- [ ] **Real events replace the placeholders** in `content/events.ts`. Every
      event currently shown — the Losar picnic, the Dzongkha class dates, the
      Multicultural Festival stall — was invented for the design mockup.
- [ ] **Membership fees confirmed.** `$20 / $25 / $35` came from the prototype,
      not from ABAC. They appear on `/join` and in the chatbot's canned answers
      (`components/ChatWidget.tsx`).
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

**Phase 2 — member system.** Supabase (Sydney region `ap-southeast-2`) for
members/payments/events tables with row-level security from the first migration.
Magic-link auth, so there is no shared committee password to lose at handover.
Stripe Checkout for membership and donations — activate membership from the
`checkout.session.completed` **webhook**, never from the browser redirect, which
can be forged or simply lost when someone closes the tab.

**Phase 3 — admin CRUD** for events, stories and team, so the committee edits
content in a browser. This is what keeps the site alive after handover.

**Phase 4 — services, donations, chatbot.** Replace the keyword matcher in
`components/ChatWidget.tsx` with a real endpoint, rate-limited, with the FAQ and
current events as context.

**Phase 5 — cutover.** DNS, redirects, then retire WordPress. Keep the old site
running until this point.
