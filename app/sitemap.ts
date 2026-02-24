import type { MetadataRoute } from "next";

const SUPPORTED_LOCALES = ["en", "vi"];
const DEFAULT_LOCALE = "vi";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://carbonmarketvietnam.com";

const pages = ["", "/search", "/books", "/ask-ai", "/about-us"];

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemap: MetadataRoute.Sitemap = [];

  // Add all locale variants for each page
  for (const locale of SUPPORTED_LOCALES) {
    for (const page of pages) {
      const path = page === "" ? "" : page;
      const url =
        locale === DEFAULT_LOCALE
          ? `${SITE_URL}${path === "" ? "" : path}`
          : `${SITE_URL}/${locale}${path}`;

      sitemap.push({
        url,
        changeFrequency: "weekly",
        priority: page === "" ? 1.0 : 0.8,
      });
    }
  }

  return sitemap;
}
