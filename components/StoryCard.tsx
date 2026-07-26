import path from "node:path";
import Link from "next/link";
import Image from "next/image";
import type { Story } from "@/content/stories";
import { imageSize } from "@/lib/image-size";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function storyDate(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export default function StoryCard({ story }: { story: Story }) {
  // Real intrinsic size, so the whole photo shows uncropped at its natural
  // aspect ratio instead of a fixed-height crop. Admin-added stories (photo
  // hosted in Supabase Storage) already carry their dimensions; the static
  // WordPress-migrated ones are read from the local file on demand.
  const dim =
    story.imageWidth && story.imageHeight
      ? { width: story.imageWidth, height: story.imageHeight }
      : story.image?.startsWith("/")
        ? imageSize(path.join(process.cwd(), "public", story.image))
        : null;

  return (
    <Link
      href={`/events/${story.slug}`}
      className="story-card"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      {story.image && dim ? (
        <Image
          src={story.image}
          alt=""
          width={dim.width}
          height={dim.height}
          sizes="(max-width: 700px) 100vw, 360px"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      ) : (
        <div className="story-img" style={{ background: "var(--gd)" }}>
          ༄
        </div>
      )}
      <div className="story-body">
        <span className="date">{storyDate(story.date)}</span>
        <h3>{story.title}</h3>
        <p>{story.excerpt}</p>
      </div>
    </Link>
  );
}
