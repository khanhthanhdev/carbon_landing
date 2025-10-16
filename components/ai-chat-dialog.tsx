"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Send, Bot, User, Loader2, AlertCircle } from "lucide-react"
import { RichTextRenderer } from "@/components/rich-text-renderer"
import { useAIChat, useGenerateSessionId } from "@/hooks/use-ai-chat"
import { useLocale } from "next-intl"
import { Alert, AlertDescription } from "@/components/ui/alert"
import AIMessageWithCitations from "@/components/ai-message-with-citations"
import { useTranslations } from "next-intl"

interface AIChatDialogProps {
  isOpen: boolean
  onClose: () => void
  initialContext?: string
}

export function AIChatDialog({ isOpen, onClose, initialContext }: AIChatDialogProps) {
  const locale = useLocale()
  const sessionId = useGenerateSessionId()
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    messages,
    isLoading,
    isSending,
    sendMessage,
    error,
  } = useAIChat({
    sessionId,
    locale,
    maxSources: 5,
  })

  const t = useTranslations("aiChat.dialog")

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      if (initialContext) {
        setInputValue(initialContext)
      }
    }
  }, [isOpen, initialContext])

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return

    const messageContent = inputValue
    setInputValue("")
    
    try {
      await sendMessage(messageContent)
    } catch (error) {
      console.error("Failed to send message:", error)
      // Restore input value on error
      setInputValue(messageContent)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFeedback = (messageId: string, rating: number, comment: string) => {
    // TODO: Implement feedback mutation
    console.log("Feedback:", { messageId, rating, comment })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("title")}</h2>
              <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-0">
          {isLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground text-sm sm:text-base">{t("loading")}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{t("welcomeTitle")}</h3>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed mb-8">
                {initialContext 
                  ? t("contextualDescription", { context: initialContext })
                  : t("defaultDescription")}
              </p>
              
              {/* Suggested Questions */}
              <div className="w-full max-w-3xl space-y-3">
                <p className="text-sm font-medium text-muted-foreground mb-4">{t("suggestedHeader")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {initialContext ? (
                    <>
                      <button 
                        onClick={() => setInputValue(`Tell me more about: ${initialContext}`)}
                        className="p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="text-2xl mb-2">📖</div>
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {t("contextualQuestion1")}
                        </div>
                      </button>
                      <button 
                        onClick={() => setInputValue(`What are the key concepts related to ${initialContext}?`)}
                        className="p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="text-2xl mb-2">💡</div>
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {t("contextualQuestion2")}
                        </div>
                      </button>
                      <button 
                        onClick={() => setInputValue(`How does ${initialContext} work in practice?`)}
                        className="p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group sm:col-span-2"
                      >
                        <div className="text-2xl mb-2">⚙️</div>
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {t("contextualQuestion3")}
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => setInputValue("What is a carbon credit?")}
                        className="p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="text-2xl mb-2">💰</div>
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {t("generalQuestion1")}
                        </div>
                      </button>
                      <button 
                        onClick={() => setInputValue("How do carbon markets work?")}
                        className="p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="text-2xl mb-2">🌍</div>
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {t("generalQuestion2")}
                        </div>
                      </button>
                      <button 
                        onClick={() => setInputValue("What are the different types of carbon offset projects?")}
                        className="p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="text-2xl mb-2">🌱</div>
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {t("generalQuestion3")}
                        </div>
                      </button>
                      <button 
                        onClick={() => setInputValue("How can companies participate in carbon markets?")}
                        className="p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="text-2xl mb-2">🏢</div>
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {t("generalQuestion4")}
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message, index) => {
                const messageId = `${message.timestamp}-${index}`;
                return (
                  <AIMessageWithCitations
                    key={messageId}
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
                    onFeedback={handleFeedback}
                    onReference={() => {}}
                  />
                );
              })}
              {isSending && (
                <div className="flex gap-3 sm:gap-4">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
                      <span className="text-sm sm:text-base text-muted-foreground font-medium">{t("thinking")}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary/40 animate-pulse" />
                      <div className="h-2.5 w-2.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <div className="h-2.5 w-2.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 sm:px-6 lg:px-8 py-3 border-t border-border bg-destructive/5 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <Alert variant="destructive" className="py-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  {error.message || t("errorMessage")}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 sm:p-6 lg:p-8 border-t bg-muted/30 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 sm:gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("inputPlaceholder")}
                className="flex-1 px-4 sm:px-5 py-3 sm:py-4 rounded-full border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={isSending}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
                className="rounded-full h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 transition-all hover:scale-105"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 text-center">
              {t("inputHelp")}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
