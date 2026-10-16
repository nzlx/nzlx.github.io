import type { NextConfig } from "next";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Размеры моделей вшиваются в сборку: на статическом хостинге (GitHub Pages) нельзя
 * отдать свой заголовок с размером файла, а Content-Length при gzip не совпадает
 * с распакованными байтами. По этим числам прелоадер показывает реальный прогресс.
 */
const size = (file: string) => {
  const path = join(process.cwd(), "public/models", file);
  return existsSync(path) ? String(statSync(path).size) : "";
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Статический экспорт в папку out — для GitHub Pages
  output: "export",
  // Оптимизатор картинок требует сервер — отдаём файлы как есть (они уже в webp)
  images: { unoptimized: true },
  // /about → /about/index.html: так GitHub Pages находит страницы без серверной маршрутизации
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_MODEL_SIZE_DESKTOP: size("car.glb"),
    NEXT_PUBLIC_MODEL_SIZE_MOBILE: size("car-mobile.glb"),
  },
};

export default nextConfig;
