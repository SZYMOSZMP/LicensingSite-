import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "nodemailer"],
  poweredByHeader: false,
  // The Java library template is read from disk at runtime.
  outputFileTracingIncludes: { "/**": ["./library/src/**/*.java"] },
};

export default nextConfig;
