import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@todos/shared"],
};

export default nextConfig;
