/**
 * Публичный адрес сайта — для metadataBase, sitemap и robots.
 * Можно переопределить переменной окружения NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
