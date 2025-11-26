import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable.");
}

export const convexServerClient = new ConvexHttpClient(convexUrl);

/**
 * Type-safe server-side query function for Convex
 * Use this in Server Components to fetch data for SSR/SEO
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * const categories = await fetchQuery(api.queries.search.getCategories, {});
 * const qaItems = await fetchQuery(api.queries.qa.listPaginated, { 
 *   paginationOpts: { numItems: 10, cursor: null },
 *   lang: "vi" 
 * });
 * ```
 */
export async function fetchQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>
): Promise<FunctionReturnType<Query>> {
  return convexServerClient.query(query, args);
}

// ============================================================================
// Pre-built SSR fetch functions for common data
// ============================================================================

/**
 * Fetch categories for SSR - used in search page
 */
export async function prefetchCategories() {
  return fetchQuery(api.queries.search.getCategories, {});
}

/**
 * Fetch recommended book for SSR - used in home/books pages
 */
export async function prefetchRecommendedBook(locale: string = "vi") {
  return fetchQuery(api.landingContent.getRecommendedBook, { locale });
}

/**
 * Fetch paginated QA items for SSR - used in search page
 */
export async function prefetchQAItems(options: {
  numItems?: number;
  lang?: string;
  category?: string;
  search?: string;
}) {
  const { numItems = 10, lang, category, search } = options;
  return fetchQuery(api.queries.qa.listPaginated, {
    paginationOpts: { numItems, cursor: null },
    lang,
    category,
    search,
  });
}

/**
 * Fetch single QA item by ID for SSR
 */
export async function prefetchQAItem(id: string) {
  return fetchQuery(api.queries.qa.get, { id: id as any });
}

/**
 * Full-text search for SSR - useful for search results pages
 */
export async function prefetchSearchResults(options: {
  query: string;
  category?: string;
  lang?: string;
  limit?: number;
}) {
  return fetchQuery(api.queries.search.fullTextSearch, options);
}

// ============================================================================
// Types for client hydration
// ============================================================================

export type PrefetchedCategories = Awaited<ReturnType<typeof prefetchCategories>>;
export type PrefetchedBook = Awaited<ReturnType<typeof prefetchRecommendedBook>>;
export type PrefetchedQAItems = Awaited<ReturnType<typeof prefetchQAItems>>;
export type PrefetchedSearchResults = Awaited<ReturnType<typeof prefetchSearchResults>>;
