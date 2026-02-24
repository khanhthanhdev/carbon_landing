"use client";

import { AlertCircle, Bot, Loader2, Send, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import AIMessageWithCitations from "@/components/ai-message-with-citations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  type ChatMessage,
  useAIChat,
  useGenerateSessionId,
} from "@/hooks/use-ai-chat";

interface AIChatDialogProps {
  initialContext?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SuggestedQuestion {
  key: string;
  label: string;
  prompt: string;
  wide?: boolean;
}

interface EmptyChatStateProps {
  description: string;
  onSelectQuestion: (question: string) => void;
  suggestedHeader: string;
  suggestedQuestions: SuggestedQuestion[];
  title: string;
}

function EmptyChatState({
  description,
  suggestedHeader,
  suggestedQuestions,
  title,
  onSelectQuestion,
}: EmptyChatStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 sm:h-24 sm:w-24">
        <Bot className="h-10 w-10 text-primary sm:h-12 sm:w-12" />
      </div>
      <h3 className="mb-2 font-bold text-foreground text-xl sm:text-2xl">
        {title}
      </h3>
      <p className="mb-6 max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base">
        {description}
      </p>

      <div className="w-full max-w-3xl space-y-2">
        <p className="mb-3 font-medium text-muted-foreground text-sm">
          {suggestedHeader}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {suggestedQuestions.map((question) => (
            <button
              className={`group rounded-xl border-2 border-border p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${question.wide ? "sm:col-span-2" : ""}`}
              key={question.key}
              onClick={() => onSelectQuestion(question.prompt)}
            >
              <div className="font-medium text-foreground text-sm transition-colors group-hover:text-primary">
                {question.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ChatMessagesProps {
  emptyState: EmptyChatStateProps;
  followUpTitle: string;
  isLoading: boolean;
  isSending: boolean;
  loadingLabel: string;
  messages: ChatMessage[];
  onFeedback: (messageId: string, rating: number, comment: string) => void;
  onFollowUpQuestion: (question: string) => void;
  thinkingLabel: string;
}

function ChatMessages({
  followUpTitle,
  isLoading,
  isSending,
  loadingLabel,
  messages,
  thinkingLabel,
  onFeedback,
  onFollowUpQuestion,
  emptyState,
}: ChatMessagesProps) {
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary sm:h-16 sm:w-16" />
        <p className="text-muted-foreground text-sm sm:text-base">
          {loadingLabel}
        </p>
      </div>
    );
  }

  if (messages.length === 0) {
    return <EmptyChatState {...emptyState} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {messages.map((message, index) => {
        const messageId = `${message.timestamp}-${index}`;
        return (
          <div className="space-y-3" key={messageId}>
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

            {message.role === "assistant" &&
              message.followUpQuestions &&
              message.followUpQuestions.length > 0 && (
                <div className="ml-10 space-y-2">
                  <p className="text-muted-foreground text-xs">
                    {followUpTitle}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {message.followUpQuestions.map(
                      (question, questionIndex) => (
                        <button
                          className="max-w-xs rounded-lg border border-border px-3 py-2 text-left font-medium text-foreground text-xs transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isSending}
                          key={`${messageId}-${questionIndex}`}
                          onClick={() => onFollowUpQuestion(question)}
                        >
                          {question}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        );
      })}

      {isSending && (
        <div className="flex gap-3 sm:gap-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 sm:h-10 sm:w-10">
            <Bot className="h-5 w-5 text-primary sm:h-5 sm:w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary sm:h-5 sm:w-5" />
              <span className="font-medium text-muted-foreground text-sm sm:text-base">
                {thinkingLabel}
              </span>
            </div>
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary/40" />
              <div
                className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary/40"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary/40"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ChatComposerProps {
  autoFocus?: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isSending: boolean;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  placeholder: string;
  value: string;
}

function ChatComposer({
  autoFocus = false,
  inputRef,
  isSending,
  placeholder,
  value,
  onChange,
  onKeyDown,
  onSend,
}: ChatComposerProps) {
  return (
    <div className="flex-shrink-0 border-t bg-white px-3 py-2">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2">
          <Textarea
            autoFocus={autoFocus}
            className="max-h-36 min-h-[36px] flex-1 resize-none transition-all"
            disabled={isSending}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            ref={inputRef}
            rows={2}
            value={value}
          />
          <div className="flex items-center">
            <Button
              aria-label="Send message"
              className="h-9 w-9"
              disabled={!value.trim() || isSending}
              onClick={onSend}
              size="icon"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OpenAIChatDialogProps {
  initialContext?: string;
  locale: string;
  onClose: () => void;
  sessionId: string;
}

function OpenAIChatDialog({
  initialContext,
  locale,
  onClose,
  sessionId,
}: OpenAIChatDialogProps) {
  const [inputValue, setInputValue] = useState(() => initialContext ?? "");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isLoading, isSending, sendMessage, error } = useAIChat({
    sessionId,
    locale,
    maxSources: 5,
  });

  const t = useTranslations("aiChat.dialog");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (overrideMessage?: string) => {
    const messageContent = (overrideMessage ?? inputValue).trim();
    if (!messageContent || isSending) {
      return;
    }

    if (!overrideMessage) {
      setInputValue("");
    }

    try {
      await sendMessage(messageContent);
    } catch (sendError) {
      console.error("Failed to send message:", sendError);
      if (!overrideMessage) {
        setInputValue(messageContent);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleFollowUpQuestion = (question: string) => {
    void handleSend(question);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleFeedback = (
    messageId: string,
    rating: number,
    comment: string
  ) => {
    console.log("Feedback:", { messageId, rating, comment });
  };

  const contextualQuestions: SuggestedQuestion[] = [
    {
      key: "context-1",
      label: t("contextualQuestion1"),
      prompt: `Tell me more about: ${initialContext}`,
    },
    {
      key: "context-2",
      label: t("contextualQuestion2"),
      prompt: `What are the key concepts related to ${initialContext}?`,
    },
    {
      key: "context-3",
      label: t("contextualQuestion3"),
      prompt: `How does ${initialContext} work in practice?`,
      wide: true,
    },
  ];

  const generalQuestions: SuggestedQuestion[] = [
    {
      key: "general-1",
      label: t("generalQuestion1"),
      prompt: "What is a carbon credit?",
    },
    {
      key: "general-2",
      label: t("generalQuestion2"),
      prompt: "How do carbon markets work?",
    },
    {
      key: "general-3",
      label: t("generalQuestion3"),
      prompt: "What are the different types of carbon offset projects?",
    },
    {
      key: "general-4",
      label: t("generalQuestion4"),
      prompt: "How can companies participate in carbon markets?",
    },
  ];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <Card className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:h-[85vh]">
        <div className="absolute top-3 right-3 z-30">
          <Button
            className="h-8 w-8"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-white px-3 py-3">
          <ChatMessages
            emptyState={{
              description: initialContext
                ? t("contextualDescription", { context: initialContext })
                : t("defaultDescription"),
              suggestedHeader: t("suggestedHeader"),
              suggestedQuestions: initialContext
                ? contextualQuestions
                : generalQuestions,
              title: t("welcomeTitle"),
              onSelectQuestion: setInputValue,
            }}
            followUpTitle={t("followUpTitle") || "Follow-up questions:"}
            isLoading={isLoading}
            isSending={isSending}
            loadingLabel={t("loading")}
            messages={messages}
            onFeedback={handleFeedback}
            onFollowUpQuestion={handleFollowUpQuestion}
            thinkingLabel={t("thinking")}
          />
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="flex-shrink-0 border-border border-t bg-destructive/5 px-4 py-3 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <Alert className="py-3" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  {error.message || t("errorMessage")}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        <ChatComposer
          autoFocus
          inputRef={inputRef}
          isSending={isSending}
          onChange={setInputValue}
          onKeyDown={handleKeyDown}
          onSend={() => void handleSend()}
          placeholder={t("inputPlaceholder")}
          value={inputValue}
        />
      </Card>
    </div>
  );
}

export function AIChatDialog({
  isOpen,
  onClose,
  initialContext,
}: AIChatDialogProps) {
  const locale = useLocale();
  const sessionId = useGenerateSessionId();

  if (!isOpen) {
    return null;
  }

  return (
    <OpenAIChatDialog
      initialContext={initialContext}
      locale={locale}
      onClose={onClose}
      sessionId={sessionId}
    />
  );
}
