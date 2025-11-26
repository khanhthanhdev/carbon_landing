import { buildPageMetadata, getPageStructuredData } from "@/lib/seo";
import AskAiPageClient from "./ask-ai-page-client";
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
  return buildPageMetadata("askAi", locale);
}

export default async function AskAiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const structuredData = getPageStructuredData("askAi", locale);

  return (
    <>
      <JsonLd data={structuredData} />
      <AskAiPageClient />
    </>
  );
}

