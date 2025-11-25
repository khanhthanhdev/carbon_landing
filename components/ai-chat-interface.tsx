"use client";

import React, { useState, useRef, useEffect, memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, AlertCircle, Loader2, ArrowDown } from "lucide-react";
import AIMessageWithCitations from "@/components/ai-message-with-citations";
import type { ChatMessage } from "@/hooks/use-ai-chat";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

interface AIChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: Error | null;
  onSendMessage: (content: string) => Promise<void>;
  onFeedback: (messageId: string, rating: number, comment: string) => void;
  isSidebarOpen: boolean;
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
    messages.length > 0
      ? messages[messages.length - 1].followUpQuestions || []
      : [];

  // Memoize rendered messages for performance
  const renderedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const messageId = `${message.timestamp}-${index}`;
      return (
        <div key={messageId} className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  {t("followUpTitle") ||
                    t("followUpQuestions") ||
                    "Follow-up questions:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.followUpQuestions.map((question, qIndex) => (
                    <button
                      key={qIndex}
                      onClick={() => handleFollowUpQuestion(question)}
                      className="px-3 py-2 text-xs rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left font-medium text-foreground max-w-xs"
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
  }, [messages, onFeedback, t, selectedTopic]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const messageContent = inputValue;
    setInputValue("");

    try {
      await onSendMessage(messageContent);
    } catch (error) {
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

  return (
    <main className="flex-1 flex flex-col bg-background relative overflow-hidden h-screen">
      {/* Messages Area */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onScroll={handleScroll}
      >
        <div className="px-4 lg:px-8 py-6 space-y-0">
          <div className="max-w-4xl mx-auto">
            {isLoading && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] text-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">{t("loading")}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] text-center px-4">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  {t("welcome")}
                </h2>
                <p className="text-muted-foreground max-w-2xl mb-4 leading-relaxed">
                  {t("welcomeDescription")}
                </p>

                {/* Active Topic Badge */}
                {selectedTopic && selectedTopic !== "general" && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <span className="text-xs font-medium text-primary">
                      {t("topicFocus")}: {tSidebar(`topics.${selectedTopic}`)}
                    </span>
                  </div>
                )}

                {/* Suggested Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 w-full max-w-4xl">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const questionKey = `suggestedQuestions.${selectedTopic}.${num}`;
                    const question = t(questionKey);
                    // Only render if translation key exists (not fallback to key name)
                    if (question === questionKey) return null;
                    return (
                      <button
                        key={num}
                        onClick={() => setInputValue(question)}
                        className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left text-base font-medium text-foreground"
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
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground font-medium">
                            {t("thinking")}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse" />
                          <div
                            className="h-2 w-2 rounded-full bg-primary/40 animate-pulse"
                            style={{ animationDelay: "0.2s" }}
                          />
                          <div
                            className="h-2 w-2 rounded-full bg-primary/40 animate-pulse"
                            style={{ animationDelay: "0.4s" }}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Show follow-up questions if available while loading */}
                    {followUpQuestions.length > 0 && (
                      <div className="ml-10 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {t("followUpTitle") ||
                            t("followUpQuestions") ||
                            "Follow-up questions:"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {followUpQuestions.map((question, qIndex) => (
                            <button
                              key={qIndex}
                              className="px-3 py-2 text-xs rounded-lg border border-border bg-muted text-muted-foreground max-w-xs cursor-not-allowed"
                              disabled={true} // Disable during loading
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
          onClick={scrollToBottom}
          className="fixed bottom-48 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors z-20"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* Error Display and Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-sm">
        {error && (
          <div className="px-4 lg:px-6 py-2 border-b border-border bg-destructive/5">
            <div className="max-w-4xl mx-auto">
              <Alert variant="destructive" className="py-2">
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
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 sm:gap-3">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("placeholder")}
                disabled={isSending}
                className="flex-1 px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none min-h-[48px] max-h-[200px] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/60"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
                className="rounded-lg h-12 w-12 sm:h-12 sm:w-12 flex-shrink-0 flex items-center justify-center"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t("inputHelp")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
});
