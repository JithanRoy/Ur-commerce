import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { NextConfig } from "next";

function requireApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || !URL.canParse(apiUrl)) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is missing or not a URL. It is baked in at build time: set it in your host's build environment (for example Render's Environment tab), not only in .env.local, which is never deployed.",
    );
  }
  if (process.env.VERCEL && !process.env.INTERNAL_API_KEY) {
    throw new Error(
      "INTERNAL_API_KEY must be set in your host's environment and equal the backend's. Without it the API cannot tell which store a request is for.",
    );
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["*.localhost"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost", port: "9100" },
    ],
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) requireApiUrl();
  return nextConfig;
}
