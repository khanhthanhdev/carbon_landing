import { buildPageMetadata } from "@/lib/seo";
import SearchPageClient from "./search-page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata("search", locale);
}

export default function SearchPage() {
  return <SearchPageClient />;
}

