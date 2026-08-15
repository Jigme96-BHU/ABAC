import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAllStories } from "@/lib/get-stories";
import { storyDate } from "@/components/StoryCard";

type Props = { params: Promise<{ slug: string }> };

// Stories now include admin-added ones from Supabase, which can appear at
// any time — this route renders per-request rather than pre-generating a
// fixed list at build time, so a new story is visible immediately.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = (await getAllStories()).find((s) => s.slug === slug);
  if (!story) return {};
  return {
    title: story.title,
    description: story.excerpt,
    openGraph: {
      title: story.title,
      description: story.excerpt,
      type: "article",
      publishedTime: story.date,
      images: story.image ? [story.image] : undefined,
    },
  };
}

export default async function EventStoryPage({ params }: Props) {
  const { slug } = await params;
  const story = (await getAllStories()).find((s) => s.slug === slug);
  if (!story) notFound();

  return (
    <main>
      <section className="block">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <Link
            href="/events"
            style={{ fontSize: 13.5, textDecoration: "none", color: "var(--ink-soft)" }}
          >
            ‹ All events &amp; highlights
          </Link>

          <p className="eyebrow-en" style={{ marginTop: 18, marginBottom: 6 }}>
            {storyDate(story.date)}
          </p>
          <h1 style={{ fontSize: "clamp(26px,4vw,36px)", marginBottom: 20 }}>
            {story.title}
          </h1>

          {story.image && (
            <Image
              src={story.image}
              alt=""
              width={story.imageWidth ?? 1000}
              height={story.imageHeight ?? 640}
              sizes="(max-width: 800px) 100vw, 760px"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 14,
                border: "1px solid var(--line)",
                marginBottom: 26,
              }}
              priority
            />
          )}

          {story.images && story.images.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 10,
                marginBottom: 26,
              }}
            >
              {story.images.map((img, i) => (
                <Image
                  key={img.path}
                  src={img.path}
                  alt=""
                  width={img.width ?? 400}
                  height={img.height ?? 260}
                  sizes="(max-width: 800px) 45vw, 240px"
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                  }}
                  loading={i < 2 ? "eager" : "lazy"}
                />
              ))}
            </div>
          )}

          {story.video && (
            <video
              controls
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 14,
                border: "1px solid var(--line)",
                marginBottom: 26,
                background: "#000",
              }}
            >
              <source src={story.video} />
              Your browser does not support the video tag.
            </video>
          )}

          {story.body.map((para, i) => (
            <p key={i} style={{ marginBottom: 16 }}>
              {para}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
