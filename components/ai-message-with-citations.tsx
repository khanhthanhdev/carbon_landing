"use client";

import {
  Bot,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  MessageSquareQuote,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { ChatFeedback } from "@/components/chat-feedback";
import { CitationPanel } from "@/components/citation-panel";
import { RichTextRenderer } from "@/components/rich-text-renderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { richTextToHtml } from "@/lib/rich-text";

interface Citation {
  id: number;
  page?: string;
  source: string;
  text: string;
  url?: string;
}

interface Message {
  citations?: Citation[];
  content: string;
  feedback?: {
    rating: number;
    comment: string;
  };
  id: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface AIMessageWithCitationsProps {
  message: Message;
  onFeedback: (messageId: string, rating: number, comment: string) => void;
  onReference: (message: Message) => void;
}

export default function AIMessageWithCitations({
  message,
  onFeedback,
  onReference,
}: AIMessageWithCitationsProps) {
  const [showCitations, setShowCitations] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipCitation, setTooltipCitation] = useState<Citation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const t = useTranslations("aiChat.messages");

  // Auto-resize textarea to fit content while editing user messages.
  const adjustTextareaHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  React.useEffect(() => {
    if (message.role === "user" && isEditing) {
      adjustTextareaHeight();
    }
  }, [message.role, isEditing, adjustTextareaHeight]);

  // Parse content to highlight citations with colored markers
  const renderContentWithCitations = (content: string) => {
    if (!message.citations || message.citations.length === 0) {
      return (
        <RichTextRenderer
          className="text-sm leading-relaxed"
          content={content}
        />
      );
    }

    // Process markdown first
    const htmlContent = richTextToHtml(content);

    // Replace [Source X] with inline citation markers
    const processedContent = htmlContent.replace(
      /\[Source (\d+)\]/g,
      (match, citationId) => {
        const id = Number.parseInt(citationId);
        const citation = message.citations?.find((c) => c.id === id);
        if (citation) {
          return `<span class="citation-marker inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-semibold mx-0.5 cursor-pointer hover:bg-primary/30 transition-colors" data-citation-id="${id}">${id}</span>`;
        }
        return match; // Keep original if citation not found
      }
    );

    return (
      <div className="text-sm leading-relaxed">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: processedContent }}
          onMouseLeave={() => {
            // Hide tooltip when leaving the container entirely
            setTooltipCitation(null);
          }}
          onMouseMove={(e) => {
            // Use closest to allow child elements inside the marker
            const target = (e.target as HTMLElement).closest(
              ".citation-marker"
            ) as HTMLElement | null;
            if (target && target.getAttribute) {
              const citationId = Number.parseInt(
                target.getAttribute("data-citation-id") || "0"
              );
              const citation = message.citations?.find(
                (c) => c.id === citationId
              );
              if (citation) {
                const rect = target.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 10,
                });
                setTooltipCitation(citation);
                return;
              }
            }

            // If we're not over a citation marker, hide the tooltip
            setTooltipCitation(null);
          }}
        />
      </div>
    );
  };

  if (message.role === "user") {
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        // You could add a toast notification here
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    };

    const handleEdit = () => {
      setIsEditing(true);
      setEditContent(message.content);
    };

    const handleSaveEdit = () => {
      // For now, just update the local state. In a real app, you'd send this to the backend
      setIsEditing(false);
      // You could call an onEdit callback here if needed
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditContent(message.content);
    };

    return (
      <div className="group flex justify-end gap-3">
        <div className="flex min-w-0 max-w-[80%] flex-1 flex-col items-end gap-1">
          <Card className="relative w-full rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground shadow-sm">
            {isEditing ? (
              <div className="w-full space-y-2">
                <textarea
                  className="w-full resize-none overflow-hidden rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-2 py-1 text-primary-foreground text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary-foreground/50"
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    adjustTextareaHeight();
                  }}
                  ref={textareaRef}
                  style={{ minHeight: "40px" }}
                  value={editContent}
                />
                <div className="flex justify-end gap-1">
                  <Button
                    className="h-6 px-2 text-primary-foreground/70 text-xs hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    onClick={handleCancelEdit}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="mr-1 h-3 w-3" />
                    {t("cancel")}
                  </Button>
                  <Button
                    className="h-6 bg-primary-foreground/20 px-2 text-primary-foreground text-xs hover:bg-primary-foreground/30"
                    onClick={handleSaveEdit}
                    size="sm"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    {t("save")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </p>
            )}
          </Card>

          {/* Action buttons below the message */}
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                className="h-6 px-2 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
                onClick={handleCopy}
                size="sm"
                title={t("copyMessage")}
                variant="ghost"
              >
                <Copy className="mr-1 h-3 w-3" />
                {t("copyMessage")}
              </Button>
              <Button
                className="h-6 px-2 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
                onClick={handleEdit}
                size="sm"
                title={t("editMessage")}
                variant="ghost"
              >
                <Edit3 className="mr-1 h-3 w-3" />
                {t("editMessage")}
              </Button>
            </div>
          )}

          <p className="text-muted-foreground text-xs">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="max-w-[85%] flex-1">
        <Card className="rounded-2xl rounded-tl-sm bg-card px-3 py-2 shadow-sm">
          <div className="prose prose-sm max-w-none">
            {renderContentWithCitations(message.content)}
          </div>
          <p className="mt-2 text-muted-foreground text-xs">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {/* Action Buttons */}
          <div className="mt-3 flex items-center gap-1 border-border border-t pt-2">
            <Button
              className="h-6 px-2 text-xs"
              onClick={() => onReference(message)}
              size="sm"
              variant="ghost"
            >
              <MessageSquareQuote className="mr-1 h-3 w-3" />
              Ask Follow-up
            </Button>
            <Button
              className="h-6 px-2 text-xs"
              onClick={() => setShowFeedback(!showFeedback)}
              size="sm"
              variant="ghost"
            >
              {message.feedback ? (
                <>
                  <ThumbsUp className="mr-1 h-3 w-3 fill-primary text-primary" />
                  Feedback Given
                </>
              ) : (
                <>
                  <ThumbsUp className="mr-1 h-3 w-3" />
                  Give Feedback
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Feedback Form */}
        {showFeedback && !message.feedback && (
          <ChatFeedback
            messageId={message.id}
            onCancel={() => setShowFeedback(false)}
            onSubmit={(rating, comment) => {
              onFeedback(message.id, rating, comment);
              setShowFeedback(false);
            }}
          />
        )}

        {/* Show existing feedback */}
        {message.feedback && (
          <Card className="mt-3 bg-muted/50 p-3">
            <p className="mb-1 font-medium text-foreground text-xs">
              Your Feedback:
            </p>
            <div className="mb-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  className={`text-sm ${
                    star <= message.feedback!.rating
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                  }`}
                  key={star}
                >
                  ★
                </span>
              ))}
            </div>
            {message.feedback.comment && (
              <p className="text-muted-foreground text-xs">
                {message.feedback.comment}
              </p>
            )}
          </Card>
        )}

        {/* Citations Panel */}
        {message.citations && message.citations.length > 0 && (
          <CitationPanel citations={message.citations} />
        )}

        {/* Citation Tooltip */}
        {tooltipCitation && (
          <div
            className="pointer-events-none fixed z-50 w-64 rounded-lg border border-border bg-background p-3 shadow-lg"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-primary" />
                <span className="font-semibold text-xs">
                  Source {tooltipCitation.id}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {tooltipCitation.source}
                </p>
              </div>
              {tooltipCitation.page && (
                <div>
                  <p className="text-muted-foreground text-xs">
                    {tooltipCitation.page}
                  </p>
                </div>
              )}
              <div>
                <p className="line-clamp-2 text-muted-foreground text-xs">
                  {tooltipCitation.text}
                </p>
              </div>
              {tooltipCitation.url && (
                <div className="pt-1">
                  <a
                    className="pointer-events-auto inline-flex items-center gap-1 text-primary text-xs hover:underline"
                    href={tooltipCitation.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View Source
                    <ExternalLink className="h-2 w-2" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
