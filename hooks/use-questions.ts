"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import type { PublicQuestion } from "@/convex/qa";

export type QuestionRecord = PublicQuestion;

interface UseQuestionsOptions {
  search?: string;
  category?: string;
  limit?: number;
  commonOnly?: boolean;
}

export function useQuestions(options: UseQuestionsOptions) {
  const queryArgs = useMemo(() => {
    const args: { search?: string; category?: string; limit?: number; commonOnly?: boolean } = {};

    if (options.search && options.search.trim().length > 0) {
      args.search = options.search.trim();
    }

    if (options.category && options.category.trim().length > 0 && options.category !== "All") {
      args.category = options.category.trim();
    }

    if (options.limit && options.limit > 0) {
      args.limit = options.limit;
    }

    if (options.commonOnly) {
      args.commonOnly = true;
    }

    return args;
  }, [options.category, options.commonOnly, options.limit, options.search]);

  return useQuery<PublicQuestion[]>({
    ...convexQuery(api.qa.list, queryArgs),
    gcTime: 5 * 60 * 1000,
  });
}
