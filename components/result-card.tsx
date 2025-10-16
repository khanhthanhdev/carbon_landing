"use client";

import * as React from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/hooks/use-search";
import { RichTextRenderer } from "@/components/rich-text-renderer";

interface ResultCardProps {
  result: SearchResult;
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
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
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
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
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest'
        });
      }, 50);
    }
  };

  // Calculate if answer needs truncation (approximately 3 lines = ~200 characters)
  const PREVIEW_LENGTH = 200;
  const needsExpansion = result.answer.length > PREVIEW_LENGTH;
  
  // Show preview or full answer based on expansion state
  const displayAnswer = isExpanded || !needsExpansion
    ? result.answer
    : `${result.answer.substring(0, PREVIEW_LENGTH)}...`;

  return (
    <Card ref={cardRef} className={cn("p-4 sm:p-6 hover:shadow-md transition-shadow", className)}>
      <div className="space-y-3 sm:space-y-4">
        {/* Question Header with Category Badge */}
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
            {result.question}
          </h3>
          
          {/* Badges Row */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Category Badge */}
            <Badge variant="secondary" className="font-medium text-xs sm:text-sm max-w-[150px] sm:max-w-none truncate">
              {result.category}
            </Badge>
            
            {/* Relevance Score Badge */}
            <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
              {t("relevanceScore", { 
                score: (result.hybridScore * 100).toFixed(0) 
              })}
            </Badge>
            
            {/* Search Type Indicators */}
            {result.reasons && result.reasons.length > 0 && (
              <div className="flex gap-1">
                {result.reasons.map((reason) => (
                  <Badge 
                    key={reason} 
                    variant="outline" 
                    className="text-[10px] sm:text-xs bg-primary/5 text-primary border-primary/20"
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
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-3">
                {displayAnswer}
              </p>
            </div>
          ) : (
            // Expanded mode - show rich text
            <div className="prose prose-sm max-w-none">
              <RichTextRenderer 
                content={result.answer}
                className="text-sm sm:text-base text-muted-foreground leading-relaxed"
              />
            </div>
          )}
          
          {/* Expand/Collapse Button */}
          {needsExpansion && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="h-auto p-0 text-sm sm:text-base text-primary hover:text-primary/80 font-medium"
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
          <div className="pt-3 sm:pt-4 border-t border-border/50">
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-xs sm:text-sm font-medium text-foreground">
                {t("sources", { count: result.sources.length })}
              </h4>
              
              <div className="space-y-1.5 sm:space-y-2">
                {result.sources.slice(0, 2).map((source, sourceIndex) => (
                  <a
                    key={sourceIndex}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-2 text-xs sm:text-sm text-primary hover:text-primary/80",
                      "hover:underline transition-colors group"
                    )}
                  >
                    <span className="flex-1 line-clamp-1 break-all sm:break-normal">
                      {source.title}
                    </span>
                    <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                ))}
                {result.sources.length > 2 && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground pl-1">
                    +{result.sources.length - 2} more {result.sources.length - 2 === 1 ? 'source' : 'sources'}
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