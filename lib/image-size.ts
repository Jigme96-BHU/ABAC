import fs from "node:fs";

/** Minimal intrinsic-size reader for JPEG / PNG / WebP, so components can pass
 *  correct width+height to next/image for files discovered at build time
 *  (a hard-coded aspect ratio silently stretches the image when the file
 *  someone drops in isn't the shape the code assumed). */
export type Size = { width: number; height: number };

export function imageSize(file: string): Size | null {
  let buf: Buffer;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return null;
  }
  return imageSizeFromBuffer(buf);
}

/** Same as imageSize(), but for bytes already in memory — e.g. a file
 *  uploaded through a form, which never touches disk before going to
 *  Supabase Storage. */
export function imageSizeFromBuffer(buf: Buffer): Size | null {
  // PNG: IHDR width/height at bytes 16..24
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // WebP (VP8X / VP8L / VP8 )
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return {
        width: 1 + buf.readUIntLE(24, 3),
        height: 1 + buf.readUIntLE(27, 3),
      };
    }
    if (chunk === "VP8 ") {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }

  // JPEG: walk the segments to the first SOF marker
  if (buf.length > 4 && buf.readUInt16BE(0) === 0xffd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15 carry the frame size
      const isSOF =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSOF) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }

  return null;
}
