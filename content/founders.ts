/** HAND-CURATED — unlike content/team.ts, this is not scraped from
 *  /ourteam/ (that page has no Founders section at all yet).
 *
 *  Sourcing: the design prototype (abac-website-preview.html) added a
 *  four-person Founders section. Verified against the WordPress media
 *  library (wp-json/wp/v2/media) before publishing anything about real
 *  people:
 *
 *   - Dr Lhawang Ugyel, Ms Patt Darlington — portraits uploaded to the
 *     library on 2026-07-17 under their exact names, never yet published
 *     to the live team page. Included.
 *   - Dasho Sonam Tobgay — real, but already shown under Former Presidents
 *     in content/team.ts (founder: true, 2010–2011). Not duplicated here.
 *   - Drukdra Wangchuk — no matching media file or any other mention found
 *     on the live site. Omitted until confirmed; ask before adding.
 *
 *  No bio text exists for either person — the prototype shows none either,
 *  just name + "Founder".
 */
export type Founder = {
  slug: string;
  name: string;
  image: string;
};

export const FOUNDERS: Founder[] = [
  {
    slug: "lhawang-ugyel",
    name: "Dr Lhawang Ugyel",
    image: "/img/team/lhawang-ugyel.jpeg",
  },
  {
    slug: "patt-darlington",
    name: "Ms Patt Darlington",
    image: "/img/team/patt-darlington.jpeg",
  },
];
