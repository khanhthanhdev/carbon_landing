import { buildPageMetadata } from "@/lib/seo";
import SearchPageClient from "./search-page-client";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  return buildPageMetadata("search", params?.locale);
}

export default function SearchPage() {
  return <SearchPageClient />;
}

