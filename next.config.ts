import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Páginas da base leem sessão e órgão a cada requisição; Cache Components
  // fica desligado até os módulos públicos precisarem de cache fino.
  cacheComponents: false,
  poweredByHeader: false,
  experimental: {
    // Anexos do protocolo vão até 4 MB; a Vercel aceita corpo de até 4,5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
