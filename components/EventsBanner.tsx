import Image from "next/image";

/** Tiled photo collage behind the page title — same idea as the home page's
 *  single-photo hero, but several real event photos side by side instead of
 *  one, matching the reference layout. Purely decorative, so every tile has
 *  alt="" and the text sits in a real heading on top, not baked into pixels. */
const PHOTOS = [
  "/img/stories/executive-handover-2026.jpeg",
  "/img/stories/national-day-celebration.jpg",
  "/img/stories/abac-website-launch.jpg",
  "/img/stories/royal-visit-to-australia.jpg",
  "/img/stories/volleyball-tournament-2024.jpg",
  "/img/stories/fundraising-party-2024.png",
  "/img/stories/royal-visit.jpg",
  "/img/stories/executive-handover-2025.jpg",
];

export default function EventsBanner() {
  return (
    <div className="events-banner">
      <div className="events-banner-grid">
        {PHOTOS.map((src) => (
          <div className="events-banner-tile" key={src}>
            <Image src={src} alt="" fill sizes="25vw" style={{ objectFit: "cover" }} />
          </div>
        ))}
      </div>
      <div className="events-banner-scrim" />
      <div className="events-banner-content">
        <span className="dz-eyebrow" style={{ color: "var(--gold-bright)", fontSize: 32 }}>
          ལས་རིམ།
        </span>
        <h1>Events</h1>
      </div>
    </div>
  );
}
