"use client";

import { AlertCircle, ArrowDown, Loader2, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import AIMessageWithCitations from "@/components/ai-message-with-citations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/hooks/use-ai-chat";

interface AIChatInterfaceProps {
  error: Error | null;
  isLoading: boolean;
  isSending: boolean;
  isSidebarOpen: boolean;
  messages: ChatMessage[];
  onFeedback: (messageId: string, rating: number, comment: string) => void;
  onSendMessage: (content: string) => Promise<void>;
  selectedTopic?: string;
}

export const AIChatInterface = memo(function AIChatInterface({
  messages,
  isLoading,
  isSending,
  error,
  onSendMessage,
  onFeedback,
  isSidebarOpen,
  selectedTopic = "general",
}: AIChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations("aiChat.interface");
  const tSidebar = useTranslations("aiChat.sidebar");

  // Extract follow-up questions from the last message if available
  const followUpQuestions =
    messages.length > 0 ? messages.at(-1).followUpQuestions || [] : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) {
      return;
    }

    const messageContent = inputValue;
    setInputValue("");

    try {
      await onSendMessage(messageContent);
    } catch (_error) {
      // Restore input value on error
      setInputValue(messageContent);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Function to handle follow-up questions (set input and send)
  const handleFollowUpQuestion = async (question: string) => {
    setInputValue(question);
    // Wait for the state update to complete before sending
    setTimeout(() => {
      handleSend();
      // Focus on the input to provide visual feedback
      inputRef.current?.focus();
    }, 0);
  };

  // Memoize rendered messages for performance
  const renderedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const messageId = `${message.timestamp}-${index}`;
      return (
        <div className="space-y-4" key={messageId}>
          <AIMessageWithCitations
            message={{
              id: messageId,
              role: message.role,
              content: message.content,
              timestamp: new Date(message.timestamp),
              citations: message.sources?.map((source, idx) => ({
                id: idx + 1,
                text: source.citedSentences?.join(" ") || source.question,
                source: `${source.questionNumber}: ${source.question}`,
                page: `Relevance: ${(source.relevanceScore * 100).toFixed(1)}%`,
              })),
            }}
            onFeedback={onFeedback}
            onReference={() => {}}
          />
          {/* Show follow-up questions if available for assistant messages */}
          {message.role === "assistant" &&
            message.followUpQuestions &&
            message.followUpQuestions.length > 0 && (
              <div className="ml-10 space-y-2">
                <p className="text-muted-foreground text-xs">
                  {t("followUpTitle") ||
                    t("followUpQuestions") ||
                    "Follow-up questions:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.followUpQuestions.map((question, qIndex) => (
                    <button
                      className="max-w-xs rounded-lg border border-border px-3 py-2 text-left font-medium text-foreground text-xs transition-colors hover:border-primary hover:bg-primary/5"
                      key={qIndex}
                      onClick={() => handleFollowUpQuestion(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      );
    });
  }, [messages, onFeedback, t, handleFollowUpQuestion]);

  return (
    <main className="relative flex h-screen flex-1 flex-col overflow-hidden bg-background">
      {/* Messages Area */}
      <ScrollArea
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onScroll={handleScroll}
        ref={scrollAreaRef}
      >
        <div className="space-y-0 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            {isLoading && messages.length === 0 ? (
              <div className="flex h-[calc(100vh-350px)] flex-col items-center justify-center text-center">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">{t("loading")}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-[calc(100vh-350px)] flex-col items-center justify-center px-4 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="mb-3 font-bold text-2xl text-foreground">
                  {t("welcome")}
                </h2>
                <p className="mb-4 max-w-2xl text-muted-foreground leading-relaxed">
                  {t("welcomeDescription")}
                </p>

                {/* Active Topic Badge */}
                {selectedTopic && selectedTopic !== "general" && (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
                    <span className="font-medium text-primary text-xs">
                      {t("topicFocus")}: {tSidebar(`topics.${selectedTopic}`)}
                    </span>
                  </div>
                )}

                {/* Suggested Questions */}
                <div className="mt-6 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const questionKey = `suggestedQuestions.${selectedTopic}.${num}`;
                    const question = t(questionKey);
                    // Only render if translation key exists (not fallback to key name)
                    if (question === questionKey) {
                      return null;
                    }
                    return (
                      <button
                        className="rounded-lg border border-border p-4 text-left font-medium text-base text-foreground transition-colors hover:border-primary hover:bg-primary/5"
                        key={num}
                        onClick={() => setInputValue(question)}
                      >
                        {question}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {renderedMessages}
                {isSending && (
                  <div className="space-y-4">
                    <div className="flex gap-3 py-4">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="font-medium text-muted-foreground text-sm">
                            {t("thinking")}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-primary/40" />
                          <div
                            className="h-2 w-2 animate-pulse rounded-full bg-primary/40"
                            style={{ animationDelay: "0.2s" }}
                          />
                          <div
                            className="h-2 w-2 animate-pulse rounded-full bg-primary/40"
                            style={{ animationDelay: "0.4s" }}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Show follow-up questions if available while loading */}
                    {followUpQuestions.length > 0 && (
                      <div className="ml-10 space-y-2">
                        <p className="text-muted-foreground text-xs">
                          {t("followUpTitle") ||
                            t("followUpQuestions") ||
                            "Follow-up questions:"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {followUpQuestions.map((question, qIndex) => (
                            <button
                              className="max-w-xs cursor-not-allowed rounded-lg border border-border bg-muted px-3 py-2 text-muted-foreground text-xs"
                              disabled={true}
                              key={qIndex} // Disable during loading
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          aria-label="Scroll to bottom"
          className="fixed bottom-48 left-1/2 z-20 -translate-x-1/2 transform rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* Error Display and Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 border-border border-t bg-background/95 backdrop-blur-sm">
        {error && (
          <div className="border-border border-b bg-destructive/5 px-4 py-2 lg:px-6">
            <div className="mx-auto max-w-4xl">
              <Alert className="py-2" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  {error.message || t("errorMessage")}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 lg:p-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex gap-2 sm:gap-3">
              <textarea
                className="max-h-[200px] min-h-[48px] flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSending}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("placeholder")}
                ref={inputRef}
                rows={1}
                value={inputValue}
              />
              <Button
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12"
                disabled={!inputValue.trim() || isSending}
                onClick={handleSend}
                size="icon"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-center text-muted-foreground text-xs">
              {t("inputHelp")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
});
