"use client";

import { useQuery } from "@tanstack/react-query";

interface SemanticSearchSource {
  location: string;
  title: string;
  type: string;
  url: string;
}

export interface SemanticSearchMatch {
  answer: string;
  category: string;
  id: string;
  isCommon: boolean;
  question: string;
  score: number;
  sequence?: number | null;
  sources: SemanticSearchSource[];
  tags: string[];
}

interface SemanticSearchResponse {
  matches: SemanticSearchMatch[];
  summary: string | null;
}

interface Options {
  category?: string;
  enabled?: boolean;
  locale?: string;
  query: string;
}

export function useSemanticSearch({
  query,
  category,
  locale,
  enabled = true,
}: Options) {
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
