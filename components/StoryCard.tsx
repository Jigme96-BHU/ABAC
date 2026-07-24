import Link from "next/link";
import Image from "next/image";
import type { Story } from "@/content/stories";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function storyDate(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export default function StoryCard({ story }: { story: Story }) {
  return (
    <Link
      href={`/stories/${story.slug}`}
      className="story-card"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      {story.image ? (
        <div className="story-img" style={{ position: "relative", padding: 0 }}>
          <Image
            src={story.image}
            alt=""
            fill
            sizes="(max-width: 700px) 100vw, 340px"
            style={{ objectFit: "cover" }}
          />
        </div>
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
