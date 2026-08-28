import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth", "@prisma/client"],
  experimental: { serverActions: { bodySizeLimit: "10mb" } },

  // The hiring side used to live under /manager. Anything already sent out —
  // a bookmark, a link in a message, the demo video's URLs — keeps working.
  async redirects() {
    return [
      { source: "/manager", destination: "/hire/search", permanent: true },
      { source: "/manager/candidates", destination: "/hire/candidates", permanent: true },
      { source: "/manager/candidate/:id", destination: "/hire/candidate/:id", permanent: true },
    ];
  },
};

export default nextConfig;
