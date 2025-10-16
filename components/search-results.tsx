"use client";

import * as React from "react";
import { AlertCircle, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SearchResult, SearchMetadata } from "@/hooks/use-search";
import { ResultCard } from "@/components/result-card";

interface SearchResultsProps {
  // Data
  results: SearchResult[];
  metadata?: SearchMetadata;
  query: string;
  
  // State
  isLoading: boolean;
  error?: Error | null;
  
  // Event handlers
  onRetry?: () => void;
  onClearSearch?: () => void;
  
  // UI customization
  className?: string;
}

/**
 * SearchResults component displays search results in card format with loading,
 * error, and empty states. Handles result display, metadata, and user interactions.
 * 
 * Features:
 * - Display results in card format with question, answer, category, and sources
 * - Show loading skeleton during fetch
 * - Display empty state with helpful message
 * - Show error state with retry button
 * - Display result count and search metadata
 * 
 * Requirements addressed:
 * - 3.2: Display results in card format with question, answer preview, category, and sources
 * - 3.3: Show loading skeleton UI when results are loading
 * - 3.4: Display helpful message when no results found
 * - 3.6: Show result count and search type indicator
 * - 3.7: Display search metadata (time taken, cache status)
 * - 4.8: Display search metadata (time taken, result count)
 */
export function SearchResults({
  results,
  metadata,
  query,
  isLoading,
  error,
  onRetry,
  onClearSearch,
  className,
}: SearchResultsProps) {
  const t = useTranslations("search");
  const tQuestions = useTranslations("questions");

  const hasResults = results && results.length > 0;
  const showNoResults = !isLoading && query.trim().length >= 2 && !hasResults && !error;
  const showInitialState = query.trim().length < 2 && !error;

  return (
    <div className={cn("w-full", className)}>
      {/* Loading State */}
      {isLoading && <SearchResultsSkeleton />}

      {/* Error State */}
      {error && (
        <Card className="p-6 sm:p-8 md:p-12 text-center border-2 border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-3 sm:mb-4 text-destructive" />
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
            {t("errorTitle")}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
            {error instanceof Error ? error.message : t("errorMessage")}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t("tryAgain")}
            </Button>
          )}
        </Card>
      )}

      {/* Initial State */}
      {showInitialState && !error && (
        <Card className="p-6 sm:p-8 md:p-12 text-center border-2">
          <Search className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            {t("enterQuery")}
          </p>
        </Card>
      )}

      {/* No Results */}
      {showNoResults && (
        <Card className="p-6 sm:p-8 md:p-12 text-center border-2">
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-3 sm:mb-4">
            {tQuestions("noResults")}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
            {t("noResultsHint")}
          </p>
          {onClearSearch && (
            <Button variant="outline" size="sm" onClick={onClearSearch}>
              {tQuestions("clearSearch")}
            </Button>
          )}
        </Card>
      )}

      {/* Search Results */}
      {hasResults && !isLoading && (
        <div className="space-y-4 sm:space-y-6">
          {/* Results Header */}
          <SearchResultsHeader results={results} metadata={metadata} />

          {/* Results List */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {results.map((result) => (
              <ResultCard key={result._id} result={result} />
            ))}
          </div>

          {/* Pagination Placeholder */}
          {results.length >= 10 && (
            <div className="flex justify-center pt-4 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Showing top {results.length} results
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SearchResultsHeader displays result count and search metadata
 */
function SearchResultsHeader({
  results,
  metadata,
}: {
  results: SearchResult[];
  metadata?: SearchMetadata;
}) {
  const t = useTranslations("search");

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("resultsCount", { count: results.length })}
        </p>
        {metadata && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
            <span className="truncate">Search type: {metadata.searchType}</span>
            <span className="whitespace-nowrap">Time: {metadata.latencyMs}ms</span>
            {metadata.usedCache && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                Cached
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



/**
 * SearchResultsSkeleton displays loading skeleton during search
 */
function SearchResultsSkeleton() {
  return (
    <Card className="p-6 sm:p-8 md:p-12 text-center border-2">
      <div className="animate-pulse space-y-4 sm:space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-3 sm:h-4 bg-muted rounded w-1/3 sm:w-1/4 mx-auto" />
          <div className="h-2.5 sm:h-3 bg-muted rounded w-1/2 sm:w-1/3 mx-auto" />
        </div>
        
        {/* Results skeleton */}
        <div className="space-y-3 sm:space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <div className="h-4 sm:h-5 bg-muted rounded w-full sm:w-3/4" />
                <div className="flex gap-1.5 sm:gap-2">
                  <div className="h-5 sm:h-6 bg-muted rounded w-16 sm:w-20" />
                  <div className="h-5 sm:h-6 bg-muted rounded w-12 sm:w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3.5 sm:h-4 bg-muted rounded w-full" />
                <div className="h-3.5 sm:h-4 bg-muted rounded w-11/12 sm:w-5/6" />
                <div className="h-3.5 sm:h-4 bg-muted rounded w-3/4 sm:w-4/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}