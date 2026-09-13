import type { MetadataRoute } from "next";
import { getAllStories } from "@/lib/get-stories";
import { SITE_URL } from "@/lib/site-url";

// /admin and /join/success (a transient post-submission confirmation, not
// content) are deliberately left out — see robots.ts for /admin and /api.
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/events", changeFrequency: "weekly", priority: 0.9 },
  { path: "/join", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "monthly", priority: 0.6 },
  { path: "/team", changeFrequency: "monthly", priority: 0.6 },
  { path: "/volunteers", changeFrequency: "monthly", priority: 0.6 },
  { path: "/partners", changeFrequency: "monthly", priority: 0.5 },
  { path: "/donate", changeFrequency: "yearly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/documents", changeFrequency: "monthly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stories = await getAllStories();

  const storyRoutes: MetadataRoute.Sitemap = stories.map((story) => ({
    url: `${SITE_URL}/events/${story.slug}`,
    lastModified: story.date,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  return [...staticRoutes, ...storyRoutes];
}
