import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Статический экспорт (GitHub Pages): файл генерируется один раз при сборке
export const dynamic = "force-static";

/** Индексация всего сайта разрешена */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
