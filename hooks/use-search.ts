"use client";

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";

export type SearchType = "hybrid" | "vector" | "fulltext";

export interface SearchFilters {
    category?: string;
    lang?: string;
}

export interface SearchResult {
    _id: string;
    question: string;
    answer: string;
    category: string;
    sources?: Array<{
        type: string;
        title: string;
        url: string;
        location?: string;
    }>;
    hybridScore: number;
    vectorScore?: number;
    textScore?: number;
    reasons: string[];
}

export interface SearchMetadata {
    totalResults: number;
    searchType: string;
    usedCache: boolean;
    latencyMs: number;
    usedVector: boolean;
    usedFullText: boolean;
}

export interface SearchResponse {
    results: SearchResult[];
    metadata: SearchMetadata;
}

interface UseSearchOptions {
    query: string;
    searchType?: SearchType;
    filters?: SearchFilters;
    topK?: number;
    alpha?: number;
    enabled?: boolean;
}

/**
 * Custom hook for hybrid search functionality using TanStack Query
 * 
 * This hook provides a React interface to the Convex hybridSearch action,
 * with built-in caching, loading states, and error handling. It follows
 * the requirements for query length validation, caching configuration,
 * and performance optimization.
 * 
 * @param options - Search configuration options
 * @param options.query - Search query string (must be >= 2 characters)
 * @param options.searchType - Type of search: "hybrid", "vector", or "fulltext"
 * @param options.filters - Optional filters for category and language
 * @param options.topK - Maximum number of results to return (default: 10)
 * @param options.alpha - Weight for vector vs text search (0-1, default: 0.6)
 * @param options.enabled - Whether the query should be enabled (default: true)
 * 
 * @returns TanStack Query result with search data, loading state, and error handling
 * 
 * Requirements addressed:
 * - 3.1: Enable only when query length >= 2
 * - 6.6: Configure stale time (5 min) and cache time (30 min)
 * - 6.7: Use TanStack Query with key based on query, type, and filters
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSearch({
 *   query: "carbon trading",
 *   searchType: "hybrid",
 *   filters: { category: "Carbon Markets" }
 * });
 * ```
 */
export function useSearch({
    query,
    searchType = "hybrid",
    filters = {},
    topK = 10,
    alpha = 0.6,
    enabled = true,
}: UseSearchOptions) {
    const trimmedQuery = query.trim();

    return useQuery<SearchResponse>({
        queryKey: [
            "search",
            searchType,
            trimmedQuery,
            filters.category,
            filters.lang,
            topK,
            alpha,
        ],
        queryFn: async (): Promise<SearchResponse> => {
            try {
                // Call the search API route
                const response = await fetch("/api/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        query: trimmedQuery,
                        searchType,
                        category: filters.category,
                        lang: filters.lang,
                        topK,
                        alpha,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    
                    // If it's a service unavailable error, provide a more user-friendly message
                    if (response.status === 503 || response.status === 404) {
                        throw new Error(
                            errorData.details || "Search service is temporarily unavailable. Please try the question request form below."
                        );
                    }
                    
                    throw new Error(
                        errorData.error || `Search failed with status ${response.status}`
                    );
                }

                return (await response.json()) as SearchResponse;
            } catch (error) {
                // Handle network errors or other fetch failures
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    throw new Error("Unable to connect to search service. Please check your internet connection and try again.");
                }
                
                // Re-throw other errors as-is
                throw error;
            }
        },
        enabled: enabled && trimmedQuery.length >= 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
        retry: (failureCount: number, error: Error) => {
            // Retry up to 2 times for network errors, but not for validation errors
            if (failureCount >= 2) return false;

            // Don't retry for client errors (4xx) or service unavailable
            if (error instanceof Error) {
                if (error.message.includes("400") || 
                    error.message.includes("service is temporarily unavailable") ||
                    error.message.includes("Search service")) {
                    return false;
                }
            }

            return true;
        },
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
}

/**
 * Custom hook for fetching categories using TanStack Query
 * 
 * This hook provides a React interface to the Convex getCategories query,
 * with infinite stale time since categories rarely change. It follows
 * the requirements for caching configuration and performance optimization.
 * 
 * @returns TanStack Query result with categories data, loading state, and error handling
 * 
 * Requirements addressed:
 * - 4.1: Call Convex getCategories query
 * - 6.8: Use TanStack Query with infinite stale time
 * 
 * @example
 * ```tsx
 * const { data: categories, isLoading, error } = useCategories();
 * ```
 */
export function useCategories() {
    return useQuery<string[]>({
        ...convexQuery(api.queries.search.getCategories, {}),
        staleTime: Infinity, // Categories rarely change, so cache indefinitely
        gcTime: Infinity, // Keep in cache indefinitely
        retry: (failureCount: number, error: Error) => {
            // Retry up to 3 times for network errors
            if (failureCount >= 3) return false;
            return true;
        },
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
}