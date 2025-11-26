import { buildPageMetadata, getPageStructuredData } from "@/lib/seo";
import SearchPageClient from "./search-page-client";
import { locales } from "@/i18n/request";
import { JsonLd } from "@/components/json-ld";
import { prefetchCategories, prefetchQAItems } from "@/lib/convex-server";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata("search", locale);
}

export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const structuredData = getPageStructuredData("search", locale);

  // Server-side data fetching for SEO - crawlers see fully rendered HTML
  const [categories, initialQAItems] = await Promise.all([
    prefetchCategories().catch(() => []),
    prefetchQAItems({ numItems: 20, lang: locale }).catch(() => ({ page: [], isDone: true, continueCursor: "" })),
  ]);

  return (
    <>
      <JsonLd data={structuredData} />
      {/* Pass prefetched data to client for hydration */}
      <SearchPageClient 
        initialCategories={categories}
        initialQAItems={initialQAItems.page}
      />
    </>
  );
}

