import { JsonLd } from "@/components/json-ld";
import { locales } from "@/i18n/request";
import { buildPageMetadata, getPageStructuredData } from "@/lib/seo";
import BooksPageClient from "./books-page-client";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata("books", locale);
}

export default async function BooksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const structuredData = getPageStructuredData("books", locale);

  return (
    <>
      <JsonLd data={structuredData} />
      <BooksPageClient />
    </>
  );
}
