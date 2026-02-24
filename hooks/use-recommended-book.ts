"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { api } from "@/convex/_generated/api";

export function useRecommendedBook() {
  const locale = useLocale();

  return useQuery({
    ...convexQuery(api.landingContent.getRecommendedBook, { locale }),
    gcTime: 60 * 60 * 1000,
  });
}
