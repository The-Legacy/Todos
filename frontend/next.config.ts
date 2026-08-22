import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: ["@todos/shared"],
};

export default nextConfig;

// Enables the Cloudflare bindings/dev experience when running `next dev` locally.
initOpenNextCloudflareForDev();
