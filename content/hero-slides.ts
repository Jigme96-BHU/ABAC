import type { StaticImageData } from "next/image";
import community from "@/public/img/hero/community.jpg";
import volleyball from "@/public/img/stories/volleyball-tournament.jpg";
import handover from "@/public/img/stories/executive-handover-2026.jpeg";

export type HeroSlide = {
  src: StaticImageData;
  /** CSS object-position for this photo's crop. The hero is a wide, short
   *  band, so each image is cropped vertically — nudge this per photo so
   *  faces don't land outside the visible strip. */
  position: string;
};

/** Background photos for the home page hero, cross-faded in order.
 *
 *  To add one: drop the file under public/img/, import it above (a static
 *  import is what gives Next the dimensions and the blur placeholder), and
 *  add a line here. To remove one, delete its line. A single slide is fine —
 *  the slideshow just stops rotating.
 *
 *  These are decorative: they sit behind a scrim and the hero copy, so pick
 *  wide group photos without important detail at the edges, and avoid images
 *  that already carry text of their own (posters, flyers). */
export const HERO_SLIDES: HeroSlide[] = [
  { src: community, position: "center 34%" },
  { src: volleyball, position: "center 40%" },
  { src: handover, position: "center 30%" },
];
