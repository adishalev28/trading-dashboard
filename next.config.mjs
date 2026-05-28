/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force HTML pages to revalidate so installed PWAs always see the latest
  // env-var-baked bundles. We deliberately DON'T touch /api/*, /_next/*, or
  // image/manifest assets — only the HTML routes the user actually navigates
  // to. Aggressive no-cache on everything was breaking React hydration.
  async headers() {
    return [
      {
        // Match all paths EXCEPT api/, _next/, and common static asset
        // extensions. Tested negative lookahead works in Next.js path-to-regexp.
        source: "/((?!api|_next|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|json|xml|txt|webmanifest)).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
