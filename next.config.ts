import type { NextConfig } from "next";

// ── Hard gate: crash immediately if SESSION_SECRET is missing/weak ──
const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "SESSION_SECRET is missing or too short (need 32+ chars). " +
    "Generate one with:\n" +
    '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
    "Then add it to .env.local (local dev) or your deployment " +
    "platform's environment variables (production/preview). " +
    "Local and production must use DIFFERENT values."
  );
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
