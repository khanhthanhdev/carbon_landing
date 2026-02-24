"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { AIChatInterface } from "@/components/ai-chat-interface";
import { AIChatSidebar } from "@/components/ai-chat-sidebar";
import { Navigation } from "@/components/navigation";
import { useAIChat, useGenerateSessionId } from "@/hooks/use-ai-chat";

export default function AskAiPageClient() {
  const locale = useLocale();
  const sessionId = useGenerateSessionId();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>("general");

  const { conversation, messages, isLoading, isSending, sendMessage, error } =
    useAIChat({
      sessionId,
      locale,
      maxSources: 5,
      focusTopic: selectedTopic,
    });

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error) {
      // Error handled silently
    }
  };

  const handleFeedback = (
    messageId: string,
    rating: number,
    comment: string
  ) => {
    // TODO: Implement feedback mutation
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex h-screen pt-16 lg:pt-20">
        <AIChatSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onTopicChange={setSelectedTopic}
          selectedTopic={selectedTopic}
          sessionId={sessionId}
        />
        <div
          className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "lg:ml-72" : "lg:ml-0"}`}
        >
          <AIChatInterface
            error={error}
            isLoading={isLoading}
            isSending={isSending}
            isSidebarOpen={isSidebarOpen}
            messages={messages}
            onFeedback={handleFeedback}
            onSendMessage={handleSendMessage}
            selectedTopic={selectedTopic}
          />
        </div>
      </div>
    </div>
  );
}
