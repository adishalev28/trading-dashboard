/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force HTML responses to never be cached by the browser / PWA shell.
  // Next.js's hashed JS/CSS chunks stay cached forever (their filenames
  // change when content changes), but the HTML that references them must
  // always be revalidated — otherwise an installed PWA can keep serving
  // pre-installation HTML that points at stale environment variables.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        // Hashed static assets — safe to cache aggressively, the filenames
        // bust themselves on every deploy.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
