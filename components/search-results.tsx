"use client";

import { AlertCircle, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { ResultCard } from "@/components/result-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SearchMetadata, SearchResult } from "@/hooks/use-search";
import { cn } from "@/lib/utils";

interface SearchResultsProps {
  // UI customization
  className?: string;
  error?: Error | null;

  // State
  isLoading: boolean;
  metadata?: SearchMetadata;
  onClearSearch?: () => void;

  // Event handlers
  onRetry?: () => void;
  query: string;
  // Data
  results: SearchResult[];
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
  const showNoResults =
    !isLoading && query.trim().length >= 2 && !hasResults && !error;
  const showInitialState = query.trim().length < 2 && !error;

  return (
    <div className={cn("w-full", className)}>
      {/* Loading State */}
      {isLoading && <SearchResultsSkeleton />}

      {/* Error State */}
      {error && (
        <Card className="border-2 border-destructive/50 bg-destructive/5 p-6 text-center sm:p-8 md:p-12">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-destructive sm:mb-4 sm:h-8 sm:w-8" />
          <h3 className="mb-2 font-semibold text-base text-foreground sm:text-lg">
            {t("errorTitle")}
          </h3>
          <p className="mb-3 text-muted-foreground text-xs sm:mb-4 sm:text-sm">
            {error instanceof Error ? error.message : t("errorMessage")}
          </p>
          {onRetry && (
            <Button onClick={onRetry} size="sm" variant="outline">
              {t("tryAgain")}
            </Button>
          )}
        </Card>
      )}

      {/* Initial State */}
      {showInitialState && !error && (
        <Card className="border-2 p-6 text-center sm:p-8 md:p-12">
          <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground sm:mb-4 sm:h-12 sm:w-12" />
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            {t("enterQuery")}
          </p>
        </Card>
      )}

      {/* No Results */}

      {/* Search Results */}
      {hasResults && !isLoading && (
        <div className="space-y-4 sm:space-y-6">
          {/* Results Header */}
          <SearchResultsHeader metadata={metadata} results={results} />

          {/* Results List */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {results.map((result) => (
              <ResultCard key={result._id} result={result} />
            ))}
          </div>

          {/* Pagination Placeholder */}
          {results.length >= 10 && (
            <div className="flex justify-center pt-4 sm:pt-6">
              <p className="text-muted-foreground text-xs sm:text-sm">
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
        <p className="text-muted-foreground text-xs sm:text-sm">
          {t("resultsCount", { count: results.length })}
        </p>
        {metadata && (
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground sm:gap-4 sm:text-xs">
            <span className="truncate">Search type: {metadata.searchType}</span>
            <span className="whitespace-nowrap">
              Time: {metadata.latencyMs}ms
            </span>
            {metadata.usedCache && (
              <Badge className="text-[10px] sm:text-xs" variant="secondary">
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
    <Card className="border-2 p-6 text-center sm:p-8 md:p-12">
      <div className="animate-pulse space-y-4 sm:space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="mx-auto h-3 w-1/3 rounded bg-muted sm:h-4 sm:w-1/4" />
          <div className="mx-auto h-2.5 w-1/2 rounded bg-muted sm:h-3 sm:w-1/3" />
        </div>

        {/* Results skeleton */}
        <div className="space-y-3 sm:space-y-4">
          {["skeleton-result-1", "skeleton-result-2", "skeleton-result-3"].map(
            (skeletonId) => (
              <div
                className="space-y-3 rounded-lg border p-4 sm:space-y-4 sm:p-6"
                key={skeletonId}
              >
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-muted sm:h-5 sm:w-3/4" />
                  <div className="flex gap-1.5 sm:gap-2">
                    <div className="h-5 w-16 rounded bg-muted sm:h-6 sm:w-20" />
                    <div className="h-5 w-12 rounded bg-muted sm:h-6 sm:w-16" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 w-full rounded bg-muted sm:h-4" />
                  <div className="h-3.5 w-11/12 rounded bg-muted sm:h-4 sm:w-5/6" />
                  <div className="h-3.5 w-3/4 rounded bg-muted sm:h-4 sm:w-4/6" />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </Card>
  );
}
