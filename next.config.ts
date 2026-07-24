import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    /* Allow a query string on local images. RoyalPortrait appends a `?v=<hash>`
       of the file's contents so that replacing a picture under the same
       filename actually reaches browsers instead of serving the cached
       previous one. Next 16 rejects local query strings unless listed here. */
    localPatterns: [{ pathname: "/img/**" }, { pathname: "/**", search: "" }],
  },
};

export default nextConfig;
