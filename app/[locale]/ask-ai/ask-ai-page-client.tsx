"use client"

import { Navigation } from "@/components/navigation"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"
import { AIChatInterface } from "@/components/ai-chat-interface"
import { useAIChat, useGenerateSessionId } from "@/hooks/use-ai-chat"
import { useLocale } from "next-intl"
import { useState } from "react"

export default function AskAiPageClient() {
  const locale = useLocale()
  const sessionId = useGenerateSessionId()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const {
    conversation,
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

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content)
    } catch (error) {
      // Error handled silently
    }
  }

  const handleFeedback = (messageId: string, rating: number, comment: string) => {
    // TODO: Implement feedback mutation
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-16 lg:pt-20 h-screen flex">
        <AIChatSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          sessionId={sessionId}
        />
        <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
          <AIChatInterface
            messages={messages}
            isLoading={isLoading}
            isSending={isSending}
            error={error}
            onSendMessage={handleSendMessage}
            onFeedback={handleFeedback}
            isSidebarOpen={isSidebarOpen}
          />
        </div>
      </div>
    </div>
  )
}
