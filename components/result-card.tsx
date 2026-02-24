"use client";

import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SearchResult } from "@/hooks/use-search";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  className?: string;
  expanded?: boolean;
  onToggle?: () => void;
  result: SearchResult;
}

/**
 * ResultCard component displays individual search result with expand/collapse functionality
 *
 * Features:
 * - Show question as heading with category badge
 * - Display answer preview (3 lines) with expand/collapse
 * - Display sources with external link icons
 * - Add expand button to show full answer
 * - Show relevance score as percentage
 * - Display search type indicators (semantic/keyword)
 *
 * Requirements addressed:
 * - 3.2: Display results in card format with question, answer preview, category, and sources
 * - 3.5: Expand to show full answer when user clicks
 * - 7.5: Show relevance score as percentage
 * - 7.6: Display sources with external link icons
 * - 7.7: Show preview with "Show more" expansion, render full content with proper formatting
 */
export function ResultCard({
  result,
  expanded: controlledExpanded,
  onToggle,
  className,
}: ResultCardProps) {
  const t = useTranslations("search");
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Use controlled expansion if provided, otherwise use internal state
  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }

    // When collapsing, scroll the card into view to prevent page jump
    if (isExpanded && cardRef.current) {
      // Use a small delay to allow the collapse animation to start
      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }, 50);
    }
  };

  // Calculate if answer needs truncation (approximately 3 lines = ~200 characters)
  const PREVIEW_LENGTH = 200;
  const needsExpansion = result.answer.length > PREVIEW_LENGTH;

  // Show preview or full answer based on expansion state
  const displayAnswer =
    isExpanded || !needsExpansion
      ? result.answer
      : `${result.answer.substring(0, PREVIEW_LENGTH)}...`;

  return (
    <Card
      className={cn("p-4 transition-shadow hover:shadow-md sm:p-6", className)}
      ref={cardRef}
    >
      <div className="space-y-3 sm:space-y-4">
        {/* Question Header with Category Badge */}
        <div className="space-y-2 sm:space-y-3">
          <h3 className="font-semibold text-base text-foreground leading-tight sm:text-lg">
            {result.question}
          </h3>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Category Badge */}
            <Badge
              className="max-w-[150px] truncate font-medium text-xs sm:max-w-none sm:text-sm"
              variant="secondary"
            >
              {result.category}
            </Badge>

            {/* Relevance Score Badge */}
            <Badge
              className="flex-shrink-0 text-[10px] sm:text-xs"
              variant="outline"
            >
              {t("relevanceScore", {
                score: (result.score * 100).toFixed(0),
              })}
            </Badge>

            {/* Search Type Indicators */}
            {result.reasons && result.reasons.length > 0 && (
              <div className="flex gap-1">
                {result.reasons.map((reason) => (
                  <Badge
                    className="border-primary/20 bg-primary/5 text-[10px] text-primary sm:text-xs"
                    key={reason}
                    variant="outline"
                  >
                    {reason === "vector" ? t("semantic") : t("keyword")}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Answer Content */}
        <div className="space-y-2 sm:space-y-3">
          {!isExpanded && needsExpansion ? (
            // Preview mode - show truncated plain text
            <div className="prose prose-sm max-w-none">
              <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed sm:text-base">
                {displayAnswer}
              </p>
            </div>
          ) : (
            // Expanded mode - show rich text
            <div className="prose prose-sm max-w-none">
              <RichTextRenderer
                className="text-muted-foreground text-sm leading-relaxed sm:text-base"
                content={result.answer}
              />
            </div>
          )}

          {/* Expand/Collapse Button */}
          {needsExpansion && (
            <Button
              className="h-auto p-0 font-medium text-primary text-sm hover:text-primary/80 sm:text-base"
              onClick={handleToggle}
              size="sm"
              variant="ghost"
            >
              <span className="flex items-center gap-1">
                {isExpanded ? (
                  <>
                    {t("showLess")}
                    <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </>
                ) : (
                  <>
                    {t("showMore")}
                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </>
                )}
              </span>
            </Button>
          )}
        </div>

        {/* Sources Section */}
        {result.sources && result.sources.length > 0 && (
          <div className="border-border/50 border-t pt-3 sm:pt-4">
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-medium text-foreground text-xs sm:text-sm">
                {t("sources", { count: result.sources.length })}
              </h4>

              <div className="space-y-1.5 sm:space-y-2">
                {result.sources.slice(0, 2).map((source, sourceIndex) => (
                  <a
                    className={cn(
                      "flex items-center gap-2 text-primary text-xs hover:text-primary/80 sm:text-sm",
                      "group transition-colors hover:underline"
                    )}
                    href={source.url}
                    key={sourceIndex}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span className="line-clamp-1 flex-1 break-all sm:break-normal">
                      {source.title}
                    </span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:h-3.5 sm:w-3.5" />
                  </a>
                ))}
                {result.sources.length > 2 && (
                  <p className="pl-1 text-[10px] text-muted-foreground sm:text-xs">
                    +{result.sources.length - 2} more{" "}
                    {result.sources.length - 2 === 1 ? "source" : "sources"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
