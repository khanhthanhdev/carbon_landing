import { buildPageMetadata } from "@/lib/seo";
import BooksPageClient from "./books-page-client";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  return buildPageMetadata("books", params?.locale);
}

export default function BooksPage() {
  return <BooksPageClient />;
}

