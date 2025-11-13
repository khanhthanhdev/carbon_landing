import { buildPageMetadata } from "@/lib/seo";
import BooksPageClient from "./books-page-client";
import { locales } from "@/i18n/request";

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
  return <BooksPageClient locale={locale} />;
}

