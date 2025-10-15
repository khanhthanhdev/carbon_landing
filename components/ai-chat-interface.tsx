"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Sparkles, AlertCircle, Loader2 } from "lucide-react"
import { AIMessageWithCitations } from "@/components/ai-message-with-citations"
import type { ChatMessage } from "@/hooks/use-ai-chat"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AIChatInterfaceProps {
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean
  error: Error | null
  onSendMessage: (content: string) => Promise<void>
  onFeedback: (messageId: string, rating: number, comment: string) => void
  isSidebarOpen: boolean
}

export function AIChatInterface({ 
  messages, 
  isLoading, 
  isSending, 
  error,
  onSendMessage, 
  onFeedback, 
  isSidebarOpen 
}: AIChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return
    
    const messageContent = inputValue
    setInputValue("")
    
    try {
      await onSendMessage(messageContent)
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

  return (
    <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:ml-0" : "ml-0"}`}>
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {isLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Start a Conversation</h2>
              <p className="text-muted-foreground max-w-md">
                Ask me anything about carbon markets, sustainability, emissions trading, or environmental policies.
                I'm here to help!
              </p>
            </div>
          ) : (
            <>
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
                    onFeedback={onFeedback}
                    onReference={() => {}}
                  />
                );
              })}
              {isSending && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Error Display */}
      {error && (
        <div className="px-4 lg:px-6 pb-2">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message || "An error occurred. Please try again."}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-muted/30 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about carbon markets..."
              disabled={isSending}
              className="flex-1 px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none min-h-[56px] max-h-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending}
              className="rounded-xl h-14 w-14 flex-shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
    </main>
  )
}
