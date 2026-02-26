"use client";

import { Leaf, MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const suggestedQuestions = [
  "What is the cost of the training?",
  "How long does certification take?",
  "Do you offer group discounts?",
  "What are the prerequisites?",
];

const createMessageId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface ChatbotMessage {
  content: string;
  id: string;
  role: "assistant" | "user";
}

const createMessage = (
  role: ChatbotMessage["role"],
  content: string
): ChatbotMessage => ({
  id: createMessageId(),
  role,
  content,
});

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>(() => [
    createMessage(
      "assistant",
      "Hello! I'm here to help you learn about our carbon training programs. How can I assist you today?"
    ),
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) {
      return;
    }

    setMessages([...messages, createMessage("user", input)]);

    // Simulate bot response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        createMessage(
          "assistant",
          "Thank you for your question! Our team will provide you with detailed information. In the meantime, you can explore our training modules above or contact us directly at training@carbonlearn.com."
        ),
      ]);
    }, 1000);

    setInput("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      <div className="fixed right-6 bottom-6 z-50">
        {!isOpen && (
          <Button
            className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 hover:bg-primary/90"
            onClick={() => setIsOpen(true)}
            size="lg"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Chatbot Window */}
      {isOpen && (
        <Card className="fixed right-6 bottom-6 z-50 flex h-[600px] w-[380px] flex-col border-2 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-lg bg-primary p-4 text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary-foreground/20 p-2">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Carbon Assistant</div>
                <div className="text-xs opacity-90">Always here to help</div>
              </div>
            </div>
            <Button
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
              size="sm"
              variant="ghost"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4">
            {messages.map((message) => (
              <div
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                key={message.id}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card text-card-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {/* Suggested Questions */}
            {messages.length === 1 && (
              <div className="space-y-2">
                <div className="mb-2 text-center text-muted-foreground text-xs">
                  Suggested questions:
                </div>
                {suggestedQuestions.map((question) => (
                  <button
                    className="w-full rounded-lg border bg-card p-2 text-left text-sm transition-colors hover:bg-muted"
                    key={question}
                    onClick={() => handleSuggestedQuestion(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t bg-background p-4">
            <div className="flex gap-2">
              <Input
                className="flex-1"
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask a question..."
                value={input}
              />
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSend}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
