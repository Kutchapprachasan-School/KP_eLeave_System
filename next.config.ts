import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    minimumCacheTTL: 2592000, // แคชรูปภาพ 30 วัน
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // โลโก้โรงเรียน + ไฟล์แนบที่อัปโหลด — 7 วัน, stale-while-revalidate 1 วัน
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // คู่มือการใช้งาน (PDF, รูป) — 30 วัน, stale-while-revalidate 1 วัน
        source: "/manual/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // รูปภาพและไฟล์ Static ทั่วไป — 1 ปี (Immutable)
        source: "/:path*.(png|jpg|jpeg|gif|webp|svg|ico|woff2)",
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
