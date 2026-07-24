import type { Metadata } from "next";
import { STORIES } from "@/content/stories";
import StoryCard from "@/components/StoryCard";

export const metadata: Metadata = {
  title: "Stories",
  description:
    "News and highlights from the Bhutanese community in Canberra — celebrations, milestones, and moments worth sharing.",
};

export default function StoriesPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <span className="dz-eyebrow">གཏམ་རྒྱུད</span>
          <h2 style={{ fontSize: 32, marginBottom: 6 }}>Stories and highlights</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>
            What our community has been up to — celebrations, milestones, and moments worth
            sharing.
          </p>
          <div className="story-grid">
            {STORIES.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
