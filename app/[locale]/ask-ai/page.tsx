import { buildPageMetadata } from "@/lib/seo";
import AskAiPageClient from "./ask-ai-page-client";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  return buildPageMetadata("askAi", params?.locale);
}

export default function AskAiPage() {
  return <AskAiPageClient />;
}

