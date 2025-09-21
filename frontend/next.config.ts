import type { NextConfig } from "next";

// Allow mobile devices on your LAN to load Next dev resources (/_next/*) without warnings.
// Configure ALLOWED_DEV_ORIGINS in your env as a comma-separated list, e.g.:
// ALLOWED_DEV_ORIGINS=http://192.168.68.62:3000,http://192.168.68.61:3000
const allowedFromEnv = (process.env.ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // See https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  // Note: This only has effect in development.
  ...(allowedFromEnv.length ? { allowedDevOrigins: allowedFromEnv as any } : {}),
};

export default nextConfig;
