"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SearchType } from "@/hooks/use-search";

interface SearchFiltersProps {
  // Current filter state
  searchType: SearchType;
  
  // Event handlers
  onSearchTypeChange: (type: SearchType) => void;
  
  // UI state
  className?: string;
}

/**
 * SearchFilters component provides filtering controls for search results.
 * 
 * Features:
 * - Search type tabs (hybrid/vector/fulltext)
 */
export function SearchFilters({
  searchType,
  onSearchTypeChange,
  className,
}: SearchFiltersProps) {
  const t = useTranslations("search.filters");

  return (
    <div className={cn("flex justify-center", className)}>
      <Tabs value={searchType} onValueChange={onSearchTypeChange} className="w-full sm:w-auto">
        <TabsList className="grid grid-cols-3 h-9 sm:h-10 w-full sm:w-auto">
          <TabsTrigger value="hybrid" className="text-xs sm:text-sm px-2 sm:px-4">
            {t("hybrid")}
          </TabsTrigger>
          <TabsTrigger value="vector" className="text-xs sm:text-sm px-2 sm:px-4">
            {t("semantic")}
          </TabsTrigger>
          <TabsTrigger value="fulltext" className="text-xs sm:text-sm px-2 sm:px-4">
            {t("keyword")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
