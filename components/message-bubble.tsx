"use client";

import { useState } from "react";
import { Bot, User, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/use-ai-chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isLatest?: boolean;
}

interface CitationBadgeProps {
  citation: string;
  sourceIndex?: number;
  questionNumber?: string;
  onClick?: () => void;
}

/**
 * Clickable citation badge component
 * Renders inline citations as interactive badges that can highlight corresponding sources
 */
function CitationBadge({ citation, sourceIndex, questionNumber, onClick }: CitationBadgeProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-5 px-1.5 py-0 text-xs font-medium bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
      onClick={onClick}
    >
      {citation}
    </Button>
  );
}

/**
 * Parse citation markers from text and return array of text segments and citations
 */
function parseCitations(text: string): Array<{ type: 'text' | 'citation'; content: string; sourceIndex?: number; questionNumber?: string }> {
  const segments: Array<{ type: 'text' | 'citation'; content: string; sourceIndex?: number; questionNumber?: string }> = [];
  
  // Regex patterns for different citation formats
  const citationPatterns = [
    /\[Source (\d+)\]/g,
    /\[Q([\d.]+)\]/g,
    /\[Source (\d+),\s*Q([\d.]+)\]/g,
  ];
  
  let lastIndex = 0;
  const allMatches: Array<{ match: RegExpExecArray; pattern: RegExp }> = [];
  
  // Find all citation matches
  citationPatterns.forEach(pattern => {
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
        segments.push({ type: 'text', content: textContent });
      }
    }
    
    // Determine citation type and extract info
    let sourceIndex: number | undefined;
    let questionNumber: string | undefined;
    
    if (pattern.source.includes('Source (\\d+),')) {
      // Combined format: [Source 1, Q1.2.3]
      sourceIndex = match[1] ? parseInt(match[1]) - 1 : undefined;
      questionNumber = match[2] || undefined;
    } else if (pattern.source.includes('Source')) {
      // Source format: [Source 1]
      sourceIndex = match[1] ? parseInt(match[1]) - 1 : undefined;
    } else {
      // Question format: [Q1.2.3]
      questionNumber = match[1] || undefined;
    }
    
    segments.push({
      type: 'citation',
      content: match[0],
      sourceIndex,
      questionNumber,
    });
    
    lastIndex = match.index + match[0].length;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      segments.push({ type: 'text', content: remainingText });
    }
  }
  
  // If no citations found, return the entire text as one segment
  if (segments.length === 0) {
    segments.push({ type: 'text', content: text });
  }
  
  return segments;
}

/**
 * Source citation component that displays source information
 */
interface SourceCitationProps {
  source: NonNullable<ChatMessage['sources']>[0];
  index: number;
  isHighlighted?: boolean;
}

function SourceCitation({ source, index, isHighlighted }: SourceCitationProps) {
  const t = useTranslations("aiAssistant");
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card 
      className={cn(
        "p-3 transition-colors duration-200",
        isHighlighted 
          ? "bg-blue-50 border-blue-200 shadow-sm" 
          : "bg-background/50 hover:bg-background/80"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <Badge 
          variant={isHighlighted ? "default" : "secondary"} 
          className={cn(
            "text-xs",
            isHighlighted && "bg-blue-600 text-white"
          )}
        >
          {source.questionNumber}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {Math.round(source.relevanceScore * 100)}% {t("relevance", { defaultValue: "relevance" })}
        </span>
      </div>
      
      <p className="text-sm font-medium mb-2">{source.question}</p>
      
      {/* Show cited sentences if available */}
      {source.citedSentences && source.citedSentences.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-muted-foreground font-medium mb-1">
            {t("citedExcerpts", { defaultValue: "Cited excerpts" })}:
          </p>
          <div className="space-y-1">
            {source.citedSentences.map((sentence, idx) => (
              <p key={idx} className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded">
                "{sentence}"
              </p>
            ))}
          </div>
        </div>
      )}
      
      {/* Expandable full answer */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded 
            ? t("hideFullAnswer", { defaultValue: "Hide full answer" })
            : t("viewFullAnswer", { defaultValue: "View full answer" })
          }
        </Button>
        
        {isExpanded && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border-l-2 border-muted-foreground/20">
            <p className="whitespace-pre-wrap">{source.answer || source.question}</p>
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
  const [highlightedSourceIndex, setHighlightedSourceIndex] = useState<number | undefined>();
  
  // Parse message content for citations (only for assistant messages)
  const contentSegments = isUser ? [{ type: 'text' as const, content: message.content }] : parseCitations(message.content);
  
  const handleCitationClick = (sourceIndex?: number, questionNumber?: string) => {
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
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      
      <div className={cn("max-w-[80%] space-y-3", isUser && "order-first")}>
        {/* Message content */}
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-muted text-muted-foreground"
          )}
        >
          <div className="whitespace-pre-wrap leading-relaxed">
            {contentSegments.map((segment, index) => {
              if (segment.type === 'text') {
                return <span key={index}>{segment.content}</span>;
              } else {
                return (
                  <CitationBadge
                    key={index}
                    citation={segment.content}
                    sourceIndex={segment.sourceIndex}
                    questionNumber={segment.questionNumber}
                    onClick={() => handleCitationClick(segment.sourceIndex, segment.questionNumber)}
                  />
                );
              }
            })}
          </div>
        </div>
        
        {/* Source references for assistant messages */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">
                {t("sourcesTitle", { defaultValue: "Sources" })} ({message.sources.length})
              </p>
            </div>
            
            <div className="space-y-2">
              {message.sources.map((source, index) => (
                <SourceCitation
                  key={`${source.questionId}-${index}`}
                  source={source}
                  index={index}
                  isHighlighted={highlightedSourceIndex === index}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Metadata for assistant messages */}
        {!isUser && message.metadata && (
          <div className="text-xs text-muted-foreground/70">
            {t("generatedIn", { defaultValue: "Generated in" })} {message.metadata.generationTimeMs}ms • {message.metadata.sourcesUsed} {t("sourcesUsed", { defaultValue: "sources used" })}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}