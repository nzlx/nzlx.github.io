import type { NextConfig } from "next";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * three.js FileLoader берёт размер файла из X-File-Size (Content-Length при gzip
 * не совпадает с распакованными байтами) — так прелоадер показывает реальный прогресс.
 */
const MODELS = ["car.glb", "car-mobile.glb"];
const modelHeaders = MODELS.filter((f) => existsSync(join(process.cwd(), "public/models", f))).map((f) => ({
  source: `/models/${f}`,
  headers: [
    { key: "X-File-Size", value: String(statSync(join(process.cwd(), "public/models", f)).size) },
    { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
  ],
}));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return modelHeaders;
  },
};

export default nextConfig;
