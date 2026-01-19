import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    localPatterns: [
      {
        pathname: "/avatars/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
