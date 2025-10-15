"use client";

import { useQuery } from "@tanstack/react-query";

interface SemanticSearchSource {
  title: string;
  url: string;
  type: string;
  location: string;
}

export interface SemanticSearchMatch {
  id: string;
  question: string;
  answer: string;
  category: string;
  sources: SemanticSearchSource[];
  tags: string[];
  isCommon: boolean;
  sequence?: number | null;
  score: number;
}

interface SemanticSearchResponse {
  matches: SemanticSearchMatch[];
  summary: string | null;
}

interface Options {
  query: string;
  category?: string;
  locale?: string;
  enabled?: boolean;
}

export function useSemanticSearch({ query, category, locale, enabled = true }: Options) {
  return useQuery<SemanticSearchResponse>({
    queryKey: ["semantic-search", query, category, locale],
    queryFn: async () => {
      const response = await fetch("/api/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, category, locale }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch semantic search results");
      }

      return (await response.json()) as SemanticSearchResponse;
    },
    enabled: enabled && query.trim().length >= 3,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
