import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { STORIES } from "@/content/stories";
import { storyDate } from "@/components/StoryCard";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = STORIES.find((s) => s.slug === slug);
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

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = STORIES.find((s) => s.slug === slug);
  if (!story) notFound();

  return (
    <main>
      <section className="block">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <Link
            href="/stories"
            style={{ fontSize: 13.5, textDecoration: "none", color: "var(--ink-soft)" }}
          >
            ‹ All stories
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
              width={1000}
              height={640}
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
