"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send, Leaf } from "lucide-react"

const suggestedQuestions = [
  "What is the cost of the training?",
  "How long does certification take?",
  "Do you offer group discounts?",
  "What are the prerequisites?",
]

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm here to help you learn about our carbon training programs. How can I assist you today?",
    },
  ])
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return

    setMessages([...messages, { role: "user", content: input }])

    // Simulate bot response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Thank you for your question! Our team will provide you with detailed information. In the meantime, you can explore our training modules above or contact us directly at training@carbonlearn.com.",
        },
      ])
    }, 1000)

    setInput("")
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <>
      {/* Chatbot Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            size="lg"
            className="rounded-full h-16 w-16 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 transition-transform"
            onClick={() => setIsOpen(true)}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Chatbot Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] shadow-2xl flex flex-col border-2">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary-foreground/20 rounded-full p-2">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Carbon Assistant</div>
                <div className="text-xs opacity-90">Always here to help</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {/* Suggested Questions */}
            {messages.length === 1 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground text-center mb-2">Suggested questions:</div>
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="w-full text-left text-sm p-2 rounded-lg bg-card hover:bg-muted border transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask a question..."
                className="flex-1"
              />
              <Button onClick={handleSend} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  )
}
