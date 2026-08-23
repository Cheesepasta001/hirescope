import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth", "@prisma/client"],
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
