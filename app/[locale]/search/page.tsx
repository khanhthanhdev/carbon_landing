import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { locales } from "@/i18n/request";
import { prefetchCategories, prefetchQAItems } from "@/lib/convex-server";
import { buildPageMetadata, getPageStructuredData } from "@/lib/seo";
import SearchPageClient from "./search-page-client";

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
    prefetchQAItems({ numItems: 20, lang: locale }).catch(() => ({
      page: [],
      isDone: true,
      continueCursor: "",
    })),
  ]);

  return (
    <>
      <JsonLd data={structuredData} />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        {/* Pass prefetched data to client for hydration */}
        <SearchPageClient
          initialCategories={categories}
          initialQAItems={initialQAItems.page}
        />
      </Suspense>
    </>
  );
}
