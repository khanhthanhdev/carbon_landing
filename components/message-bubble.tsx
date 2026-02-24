"use client";

import { Bot, ExternalLink, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ChatMessage } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  isLatest?: boolean;
  message: ChatMessage;
}

interface CitationBadgeProps {
  citation: string;
  onClick?: () => void;
  questionNumber?: string;
  sourceIndex?: number;
}

/**
 * Clickable citation badge component
 * Renders inline citations as interactive badges that can highlight corresponding sources
 */
function CitationBadge({
  citation,
  sourceIndex,
  questionNumber,
  onClick,
}: CitationBadgeProps) {
  return (
    <Button
      className="inline-flex h-5 items-center gap-1 border-blue-200 bg-blue-50 px-1.5 py-0 font-medium text-blue-700 text-xs hover:bg-blue-100 hover:text-blue-800"
      onClick={onClick}
      size="sm"
      variant="outline"
    >
      {citation}
    </Button>
  );
}

/**
 * Parse citation markers from text and return array of text segments and citations
 */
type ParsedSegment = {
  type: "text" | "citation";
  content: string;
  sourceIndex?: number;
  questionNumber?: string;
  key: string;
};

function parseCitations(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const segmentCounts = new Map<string, number>();
  const createSegmentKey = (baseKey: string) => {
    const occurrence = segmentCounts.get(baseKey) ?? 0;
    segmentCounts.set(baseKey, occurrence + 1);
    return `${baseKey}-${occurrence}`;
  };

  // Regex patterns for different citation formats
  const citationPatterns = [
    /\[Source (\d+)\]/g,
    /\[Q([\d.]+)\]/g,
    /\[Source (\d+),\s*Q([\d.]+)\]/g,
  ];

  let lastIndex = 0;
  const allMatches: Array<{ match: RegExpExecArray; pattern: RegExp }> = [];

  // Find all citation matches
  citationPatterns.forEach((pattern) => {
    pattern.lastIndex = 0; // Reset regex state
    let match;
    while ((match = pattern.exec(text)) !== null) {
      allMatches.push({ match, pattern });
    }
  });

  // Sort matches by position
  allMatches.sort((a, b) => a.match.index - b.match.index);

  // Process matches and build segments
  allMatches.forEach(({ match, pattern }) => {
    // Add text before citation
    if (match.index > lastIndex) {
      const textContent = text.substring(lastIndex, match.index);
      if (textContent) {
        segments.push({
          type: "text",
          content: textContent,
          key: createSegmentKey(`text-${textContent}`),
        });
      }
    }

    // Determine citation type and extract info
    let sourceIndex: number | undefined;
    let questionNumber: string | undefined;

    if (pattern.source.includes("Source (\\d+),")) {
      // Combined format: [Source 1, Q1.2.3]
      sourceIndex = match[1] ? Number.parseInt(match[1]) - 1 : undefined;
      questionNumber = match[2] || undefined;
    } else if (pattern.source.includes("Source")) {
      // Source format: [Source 1]
      sourceIndex = match[1] ? Number.parseInt(match[1]) - 1 : undefined;
    } else {
      // Question format: [Q1.2.3]
      questionNumber = match[1] || undefined;
    }

    segments.push({
      type: "citation",
      content: match[0],
      sourceIndex,
      questionNumber,
      key: createSegmentKey(
        `citation-${match[0]}-${sourceIndex ?? "none"}-${questionNumber ?? "none"}`
      ),
    });

    lastIndex = match.index + match[0].length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      segments.push({
        type: "text",
        content: remainingText,
        key: createSegmentKey(`text-${remainingText}`),
      });
    }
  }

  // If no citations found, return the entire text as one segment
  if (segments.length === 0) {
    segments.push({
      type: "text",
      content: text,
      key: createSegmentKey(`text-${text}`),
    });
  }

  return segments;
}

/**
 * Source citation component that displays source information
 */
interface SourceCitationProps {
  index: number;
  isHighlighted?: boolean;
  source: NonNullable<ChatMessage["sources"]>[0];
}

function SourceCitation({ source, index, isHighlighted }: SourceCitationProps) {
  const t = useTranslations("aiAssistant");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card
      className={cn(
        "p-3 transition-colors duration-200",
        isHighlighted
          ? "border-blue-200 bg-blue-50 shadow-sm"
          : "bg-background/50 hover:bg-background/80"
      )}
    >
      <div className="mb-2 flex items-start gap-2">
        <Badge
          className={cn("text-xs", isHighlighted && "bg-blue-600 text-white")}
          variant={isHighlighted ? "default" : "secondary"}
        >
          {source.questionNumber}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {Math.round(source.relevanceScore * 100)}%{" "}
          {t("relevance", { defaultValue: "relevance" })}
        </span>
      </div>

      <p className="mb-2 font-medium text-sm">{source.question}</p>

      {/* Show cited sentences if available */}
      {source.citedSentences && source.citedSentences.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 font-medium text-muted-foreground text-xs">
            {t("citedExcerpts", { defaultValue: "Cited excerpts" })}:
          </p>
          <div className="space-y-1">
            {source.citedSentences.map((sentence) => (
              <p
                className="rounded bg-muted/50 p-2 text-muted-foreground text-xs italic"
                key={`${source.questionId}-${sentence}`}
              >
                "{sentence}"
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Expandable full answer */}
      <div className="space-y-2">
        <Button
          className="h-auto p-0 text-blue-600 text-xs hover:text-blue-800"
          onClick={() => setIsExpanded(!isExpanded)}
          size="sm"
          variant="ghost"
        >
          {isExpanded
            ? t("hideFullAnswer", { defaultValue: "Hide full answer" })
            : t("viewFullAnswer", { defaultValue: "View full answer" })}
        </Button>

        {isExpanded && (
          <div className="rounded border-muted-foreground/20 border-l-2 bg-muted/30 p-3 text-muted-foreground text-sm">
            <p className="whitespace-pre-wrap">
              {source.answer || source.question}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * MessageBubble component with citation support
 *
 * Displays user and assistant messages with different styling.
 * For assistant messages, renders inline citations as clickable badges
 * and shows source references below the message.
 *
 * Requirements addressed:
 * - 11.3: Render inline citations as clickable badges
 * - 11.4: Display user and assistant messages differently, show source references
 */
export function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const t = useTranslations("aiAssistant");
  const isUser = message.role === "user";
  const [highlightedSourceIndex, setHighlightedSourceIndex] = useState<
    number | undefined
  >();

  // Parse message content for citations (only for assistant messages)
  const contentSegments = isUser
    ? [{ type: "text" as const, content: message.content }]
    : parseCitations(message.content);

  const handleCitationClick = (
    sourceIndex?: number,
    questionNumber?: string
  ) => {
    if (sourceIndex !== undefined) {
      // Highlight the corresponding source
      setHighlightedSourceIndex(sourceIndex);

      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedSourceIndex(undefined);
      }, 3000);
    }
  };

  return (
    <div
      className={cn(
        "mb-4 flex gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      <div className={cn("max-w-[80%] space-y-3", isUser && "order-first")}>
        {/* Message content */}
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            isUser
              ? "ml-auto bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <div className="whitespace-pre-wrap leading-relaxed">
            {contentSegments.map((segment) => {
              if (segment.type === "text") {
                return <span key={segment.key}>{segment.content}</span>;
              }
              return (
                <CitationBadge
                  citation={segment.content}
                  key={segment.key}
                  onClick={() =>
                    handleCitationClick(
                      segment.sourceIndex,
                      segment.questionNumber
                    )
                  }
                  questionNumber={segment.questionNumber}
                  sourceIndex={segment.sourceIndex}
                />
              );
            })}
          </div>
        </div>

        {/* Source references for assistant messages */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
              <p className="font-medium text-muted-foreground text-xs">
                {t("sourcesTitle", { defaultValue: "Sources" })} (
                {message.sources.length})
              </p>
            </div>

            <div className="space-y-2">
              {message.sources.map((source, sourcePosition) => (
                <SourceCitation
                  index={sourcePosition}
                  isHighlighted={highlightedSourceIndex === sourcePosition}
                  key={`${source.questionId}-${source.questionNumber ?? source.question}`}
                  source={source}
                />
              ))}
            </div>
          </div>
        )}

        {/* Metadata for assistant messages */}
        {!isUser && message.metadata && (
          <div className="text-muted-foreground/70 text-xs">
            {t("generatedIn", { defaultValue: "Generated in" })}{" "}
            {message.metadata.generationTimeMs}ms •{" "}
            {message.metadata.sourcesUsed}{" "}
            {t("sourcesUsed", { defaultValue: "sources used" })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
