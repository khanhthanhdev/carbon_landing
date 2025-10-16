import { buildPageMetadata } from "@/lib/seo";
import BooksPageClient from "./books-page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata("books", locale);
}

export default function BooksPage() {
  return <BooksPageClient />;
}

