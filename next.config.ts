import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-build",
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
