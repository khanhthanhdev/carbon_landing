import { buildPageMetadata, getPageStructuredData } from "@/lib/seo";
import SearchPageClient from "./search-page-client";
import { locales } from "@/i18n/request";
import { JsonLd } from "@/components/json-ld";

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

  return (
    <>
      <JsonLd data={structuredData} />
      <SearchPageClient />
    </>
  );
}

