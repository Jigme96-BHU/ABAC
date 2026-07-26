import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Image from "next/image";
import { imageSize } from "@/lib/image-size";

/** Place of honour at the top of the home page.
 *
 *  Drop an official portrait at public/img/royal/hm-king.jpg (or .jpeg/.png)
 *  and it renders automatically; until then the framed placeholder shows.
 *  Checked at build time so a missing file can never ship as a broken image.
 *
 *  The image must come from an officially released source, and ABAC should
 *  confirm it has permission to publish it — see HANDOVER.md. */

const DIR = path.join(process.cwd(), "public", "img", "royal");
const CANDIDATES = ["hm-king.jpg", "hm-king.jpeg", "hm-king.png", "hm-king.webp"];

/** Returns the public path plus the file's real intrinsic size, so the frame
 *  fits whatever shape gets dropped in rather than stretching it to a
 *  hard-coded ratio.
 *
 *  The `?v=` content hash matters: replacing the portrait keeps the same
 *  filename, so without it browsers (and Next's own image cache) keep serving
 *  the previous picture under the unchanged URL. Hashing the bytes means a new
 *  file is always a new URL. */
function findPortrait() {
  for (const name of CANDIDATES) {
    const file = path.join(DIR, name);
    if (!fs.existsSync(file)) continue;
    const bytes = fs.readFileSync(file);
    const v = crypto.createHash("sha1").update(bytes).digest("hex").slice(0, 8);
    return {
      src: `/img/royal/${name}?v=${v}`,
      size: imageSize(file) ?? { width: 880, height: 1173 },
    };
  }
  return null;
}

/** One thangka-mount corner ornament: a layered gold bracket with a jewel,
 *  drawn for the top-left and rotated by CSS to the other three corners. */
function Corner({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg className={`royal-corner ${position}`} viewBox="0 0 88 88" aria-hidden="true">
      <g fill="none" stroke="currentColor">
        <path d="M88 12 H30 C20 12 12 20 12 30 V88" strokeWidth="2" />
        <path d="M88 19 H33 C25 19 19 25 19 33 V88" strokeWidth="1" opacity="0.45" />
        <circle cx="12" cy="12" r="6.5" strokeWidth="1" opacity="0.5" />
      </g>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

export default function RoyalPortrait() {
  const portrait = findPortrait();

  return (
    <div className="royal-band">
      <div className="royal-mount">
        <Corner position="tl" />
        <Corner position="tr" />
        <Corner position="bl" />
        <Corner position="br" />

        <p className="royal-hon">མི་དབང་མངའ་བདག་རིན་པོ་ཆེ།</p>

        <div className="royal-frame">
          <div className="royal-frame-inner">
            {portrait ? (
              <Image
                src={portrait.src}
                alt="His Majesty King Jigme Khesar Namgyel Wangchuck, the Druk Gyalpo of Bhutan"
                width={portrait.size.width}
                height={portrait.size.height}
                sizes="(max-width: 560px) 68vw, 280px"
                priority
              />
            ) : (
              <div className="royal-ph">
                <span>☸</span>
                PORTRAIT OF
                <br />
                HIS MAJESTY THE KING
                <br />
                OFFICIAL IMAGE HERE
              </div>
            )}
          </div>
        </div>

        <div className="royal-rule">
          <span />
          <i>◆</i>
          <span />
        </div>
        <p className="royal-cap">HIS MAJESTY KING JIGME KHESAR NAMGYEL WANGCHUCK</p>
        <p className="royal-sub2">The Druk Gyalpo of Bhutan</p>
      </div>
    </div>
  );
}
