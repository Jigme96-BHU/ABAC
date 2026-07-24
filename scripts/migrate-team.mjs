/**
 * Scrapes the live /ourteam/ page for the executive committee and the former
 * presidents list, downloads portraits, and writes content/team.ts.
 *
 *   node scripts/migrate-team.mjs
 *
 * The exec list is parsed from "Name - Role" headings plus the bio paragraph
 * that follows. Former presidents are parsed as <h2>name</h2><p>tenure</p>,
 * which is how the Elementor page is actually structured.
 *
 * NOTE: portraits for former presidents are matched by FILENAME (the uploads
 * are named e.g. "2021-2022-Tshering-Penjor.jpg"), because the live page puts
 * them in image-accordion widgets that don't associate an image with its
 * caption in the markup. Anything unmatched is left with image: null and
 * renders as initials.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

const SITE = "https://bhutaneseincanberra.org.au";
const IMG_DIR = "public/img/team";

const unescape = (s) =>
  s
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const html = await fetch(`${SITE}/ourteam/`).then((r) => r.text());
await mkdir(IMG_DIR, { recursive: true });

/** The exec committee is rendered by an Essential Addons "filterable gallery"
 *  whose markup is embedded as a JSON-escaped string (" for quotes), so
 *  it has to be decoded before any of it is parseable as HTML. */
const decoded = html
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
  .replace(/\\\//g, "/") // JSON-escaped slashes: <\/h5>, https:\/\/…
  .replace(/\\[nt]/g, " "); // literal "\n"/"\t" two-char sequences from the blob
const body = decoded.slice(decoded.indexOf("<body"));

// ---- executive committee -------------------------------------------------
// Each gallery item pairs an <img> with "Name - Role" and a bio paragraph.
const execs = [];
// NB: one bio on the live site has a whole chat-app UI pasted into it, so the
// content block can't be assumed to start with <p> — take it all and de-tag.
const itemRe =
  /<img src="([^"]+)"[^>]*class="gallery-item-thumbnail"[\s\S]*?<h5 class="fg-item-title">([^<]*?)\s+[-–]\s+([^<]*?)<\/h5>\s*<div class="fg-item-content">([\s\S]*?)<\/div><div class="gallery-item-buttons"/g;
const seen = new Set();
for (const m of body.matchAll(itemRe)) {
  const name = unescape(m[2]);
  if (!name || seen.has(name)) continue;
  seen.add(name);
  execs.push({
    slug: slugify(name),
    name,
    role: unescape(m[3]),
    bio: unescape(m[4].replace(/<[^>]+>/g, " ")),
    source: m[1],
  });
}

// ---- former presidents ---------------------------------------------------
const presidents = [];
const start = body.search(/FORMER PRESIDENTS/i);
if (start > -1) {
  const seg = body.slice(start).replace(/>\s+</g, "><");
  // Elementor injects <style> blocks between entries, so the gap between a
  // name and its tenure is unbounded — match up to the next <h2>, not a
  // fixed window.
  const rows = [...seg.matchAll(/<h2[^>]*>([^<]+)<\/h2>((?:(?!<h2)[\s\S])*)/g)];
  for (const [, rawName, tail] of rows) {
    const name = unescape(rawName);
    if (/FORMER PRESIDENTS/i.test(name)) continue;
    const tenures = [...tail.matchAll(/<p[^>]*>([^<]*\d{4}[^<]*)<\/p>/g)].map((t) =>
      unescape(t[1]),
    );
    if (!tenures.length) continue;
    presidents.push({
      name,
      tenure: tenures.join(", "),
      founder: /Founder/i.test(tail),
      slug: slugify(name),
    });
  }
}

// ---- portraits -----------------------------------------------------------
const media = await fetch(
  `${SITE}/wp-json/wp/v2/media?per_page=100&_fields=source_url`,
).then((r) => r.json());
const urls = media.map((m) => m.source_url).filter((u) => /\.(jpe?g|png)$/i.test(u));

async function grab(url, slug) {
  const dest = `${IMG_DIR}/${slug}${path.extname(new URL(url).pathname).toLowerCase()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log("  ", dest);
  return "/" + dest.replace(/^public\//, "");
}

/** match on the filename containing every word of the person's name */
function findPortrait(name) {
  const words = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return (
    urls.find((u) => {
      const f = decodeURIComponent(u.split("/").pop()).toLowerCase();
      return words.every((w) => f.includes(w));
    }) ?? null
  );
}

console.log("executive portraits:");
for (const p of execs) {
  // the gallery gives us the exact image for each person — no guessing needed
  const url = p.source ?? findPortrait(p.name);
  delete p.source;
  p.image = url ? await grab(url, p.slug) : null;
}
console.log("former president portraits:");
for (const p of presidents) {
  const url = findPortrait(p.name);
  p.image = url ? await grab(url, `prez-${p.slug}-${slugify(p.tenure)}`) : null;
}

const file = `// GENERATED by scripts/migrate-team.mjs — do not edit by hand.
// Source: ${SITE}/ourteam/ (migrated ${new Date().toISOString().slice(0, 10)})

export type Exec = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  image: string | null;
};

export type FormerPresident = {
  slug: string;
  name: string;
  tenure: string;
  founder: boolean;
  image: string | null;
};

export const EXECUTIVE: Exec[] = ${JSON.stringify(execs, null, 2)};

export const FORMER_PRESIDENTS: FormerPresident[] = ${JSON.stringify(presidents, null, 2)};
`;

await writeFile("content/team.ts", file);
console.log(
  `\nwrote content/team.ts — ${execs.length} executives, ${presidents.length} former presidents`,
);
console.log(
  `portraits missing: ${[...execs, ...presidents].filter((p) => !p.image).map((p) => p.name).join(", ") || "none"}`,
);
