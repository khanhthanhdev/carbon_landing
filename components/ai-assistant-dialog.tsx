"use client";

import { useEffect, useState, useRef } from "react";
import { Wand2, Loader2, Send, Bot } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale, useTranslations } from "next-intl";
import { useAIChat, useGenerateSessionId } from "@/hooks/use-ai-chat";
import { MessageBubble } from "@/components/message-bubble";

interface AiAssistantDialogProps {
  trigger: React.ReactNode;
  initialPrompt?: string;
}



function ChatInterface({ sessionId, initialPrompt }: { sessionId: string; initialPrompt?: string }) {
  const t = useTranslations("aiAssistant");
  const locale = useLocale();
  const [inputValue, setInputValue] = useState(initialPrompt ?? "");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isSending,
    sendMessage,
    sendError,
    isLoadingConversation,
  } = useAIChat({
    sessionId,
    locale,
    maxSources: 5,
  });

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending]);

  // Set initial prompt when dialog opens
  useEffect(() => {
    if (initialPrompt) {
      setInputValue(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isSending) return;

    try {
      setInputValue(""); // Clear input immediately for better UX
      await sendMessage(trimmedInput);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore input value on error
      setInputValue(trimmedInput);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-2">
        {isLoadingConversation ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <div className="space-y-2">
              <Bot className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">{t("welcomeMessage")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.timestamp}-${index}`}
                message={message}
                isLatest={index === messages.length - 1}
              />
            ))}
          </div>
        )}
        
        {/* Loading indicator for new message */}
        {isSending && (
          <div className="flex gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-muted-foreground">{t("generating")}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 space-y-2">
        {sendError && (
          <p className="text-sm text-destructive">{sendError.message}</p>
        )}
        
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t("promptPlaceholder")}
            className="min-h-[60px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            size="icon"
            className="h-[60px] w-12 flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AiAssistantDialog({ trigger, initialPrompt }: AiAssistantDialogProps) {
  const t = useTranslations("aiAssistant");
  const [isOpen, setIsOpen] = useState(false);
  const sessionId = useGenerateSessionId();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <ChatInterface sessionId={sessionId} initialPrompt={initialPrompt} />
      </DialogContent>
    </Dialog>
  );
}
