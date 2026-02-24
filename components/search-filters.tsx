"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SearchType } from "@/hooks/use-search";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  // UI state
  className?: string;

  // Event handlers
  onSearchTypeChange: (type: SearchType) => void;
  // Current filter state
  searchType: SearchType;
}

/**
 * SearchFilters component provides filtering controls for search results.
 *
 * Features:
 * - Search type tabs (vector/fulltext)
 */
export function SearchFilters({
  searchType,
  onSearchTypeChange,
  className,
}: SearchFiltersProps) {
  const t = useTranslations("search.filters");

  return (
    <div className={cn("flex justify-center", className)}>
      <Tabs
        className="w-full sm:w-auto"
        onValueChange={onSearchTypeChange}
        value={searchType}
      >
        <TabsList className="grid h-9 w-full grid-cols-2 sm:h-10 sm:w-auto">
          <TabsTrigger
            className="px-2 text-xs sm:px-4 sm:text-sm"
            value="vector"
          >
            {t("semantic")}
          </TabsTrigger>
          <TabsTrigger
            className="px-2 text-xs sm:px-4 sm:text-sm"
            value="fulltext"
          >
            {t("keyword")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
