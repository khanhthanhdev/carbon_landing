import { buildPageMetadata } from "@/lib/seo";
import AskAiPageClient from "./ask-ai-page-client";
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
  return buildPageMetadata("askAi", locale);
}

export default function AskAiPage() {
  return <AskAiPageClient />;
}

