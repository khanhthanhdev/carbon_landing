"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  className?: string;
}

/**
 * SearchFilters component displays fixed hybrid-search mode.
 */
export function SearchFilters({ className }: SearchFiltersProps) {
  const t = useTranslations("search.filters");

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 font-medium text-primary text-xs sm:text-sm",
        className
      )}
    >
      {t("hybrid")}
    </div>
  );
}
