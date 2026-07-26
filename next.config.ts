import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // /stories was folded into /events (avoided showing the same posts
      // twice under two nav items) — keep old links and bookmarks working.
      { source: "/stories", destination: "/events", permanent: true },
      { source: "/stories/:slug", destination: "/events/:slug", permanent: true },
    ];
  },
  images: {
    /* Allow a query string on local images. RoyalPortrait appends a `?v=<hash>`
       of the file's contents so that replacing a picture under the same
       filename actually reaches browsers instead of serving the cached
       previous one. Next 16 rejects local query strings unless listed here. */
    localPatterns: [{ pathname: "/img/**" }, { pathname: "/**", search: "" }],
    // Story photos an admin uploads through /admin live in Supabase Storage's
    // public bucket, not /public — next/image needs the host allow-listed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ooywyhednfgjisdondtg.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
