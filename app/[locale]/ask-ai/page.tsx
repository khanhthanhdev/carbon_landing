import { buildPageMetadata } from "@/lib/seo";
import AskAiPageClient from "./ask-ai-page-client";

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

