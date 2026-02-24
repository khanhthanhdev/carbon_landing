"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvex, useQuery as useConvexQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Message interface matching the Convex schema
 */
export interface ChatMessage {
  content: string;
  followUpQuestions?: string[]; // Added for follow-up questions functionality
  metadata?: {
    sourcesUsed: number;
    generationTimeMs: number;
    tokensUsed?: number;
  };
  role: "user" | "assistant";
  sources?: Array<{
    questionId: Id<"qa">;
    questionNumber: string;
    question: string;
    relevanceScore: number;
    citedSentences?: string[];
    citationMarkers?: string[];
  }>;
  timestamp: number;
}

/**
 * Conversation interface matching the Convex schema
 */
export interface Conversation {
  _id: Id<"conversations">;
  createdAt: number;
  locale: string;
  messages: ChatMessage[];
  sessionId: string;
  updatedAt: number;
  userId?: string;
}

/**
 * Response from the askAI action
 */
export interface AIResponse {
  answer: string;
  conversationId: string;
  followUpQuestions?: string[]; // Added for follow-up questions functionality
  metadata: {
    sourcesUsed: number;
    generationTimeMs: number;
    embeddingGenerationTimeMs?: number;
    searchTimeMs?: number;
    totalTimeMs?: number;
    queryLength?: number;
    contextLength?: number;
    answerLength?: number;
    citationsFound?: number;
  };
  sources: Array<{
    questionId: Id<"qa">;
    questionNumber: string;
    question: string;
    answer: string;
    category: string;
    relevanceScore: number;
    citedSentences?: string[];
    citationMarkers?: string[];
  }>;
}

/**
 * Options for the useAIChat hook
 */
export interface UseAIChatOptions {
  enabled?: boolean;
  focusTopic?: string;
  locale?: string;
  maxSources?: number;
  sessionId: string;
}

/**
 * Custom hook for AI chat functionality with conversation management
 *
 * This hook provides a complete interface for managing AI conversations,
 * including fetching conversation history, sending messages, and handling
 * loading and error states. It integrates with the Convex askAI action
 * and conversation management system.
 *
 * @param options - Configuration options for the chat
 * @param options.sessionId - Unique session identifier for the conversation
 * @param options.locale - Language preference for responses (default: "vi")
 * @param options.maxSources - Maximum number of sources to use for context (default: 5)
 * @param options.enabled - Whether the conversation query should be enabled (default: true)
 *
 * @returns Object containing conversation data, loading states, and functions
 *
 * Requirements addressed:
 * - 11.9: Manage conversation state with sessionId, fetch conversation history
 * - Provide sendMessage mutation function
 * - Handle loading and error states
 *
 * @example
 * ```tsx
 * const {
 *   conversation,
 *   isLoading,
 *   error,
 *   sendMessage,
 *   isSending
 * } = useAIChat({
 *   sessionId: "user-session-123",
 *   locale: "en"
 * });
 *
 * // Send a message
 * const handleSendMessage = async (question: string) => {
 *   try {
 *     await sendMessage(question);
 *   } catch (error) {
 *     console.error("Failed to send message:", error);
 *   }
 * };
 * ```
 */
export function useAIChat({
  sessionId,
  locale = "vi",
  maxSources = 5,
  enabled = true,
  focusTopic = "general",
}: UseAIChatOptions) {
  const queryClient = useQueryClient();
  const convex = useConvex();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use native Convex useQuery for better reactivity
  // This will automatically re-render when the conversation updates
  const conversation = useConvexQuery(
    api.queries.conversations.getConversation,
    enabled && !!sessionId ? { sessionId } : "skip"
  );

  const isLoading = conversation === undefined;

  // Mutation for sending messages using native Convex
  const sendMessageMutation = useMutation({
    mutationFn: async (question: string): Promise<AIResponse> => {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion) {
        throw new Error("Question cannot be empty");
      }

      setError(null); // Clear any previous errors

      // Call the Convex askAI action directly using the Convex client
      const result = await convex.action(api.rag.askAI, {
        question: trimmedQuestion,
        sessionId,
        locale,
        maxSources,
        focusTopic,
      });

      return result as AIResponse;
    },
    onMutate: () => {
      setIsSending(true);
      setError(null);
    },
    onSuccess: async (data) => {
      // With native Convex useQuery, the conversation will automatically update
      // We don't need to manually refetch - Convex handles reactivity
    },
    onError: (error: Error) => {
      console.error("Failed to send message:", error);
      setError(error);
    },
    onSettled: () => {
      setIsSending(false);
    },
    retry: (failureCount: number, error: Error) => {
      // Don't retry for client errors (4xx) or if already retried twice
      if (failureCount >= 2) {
        return false;
      }

      // Don't retry for validation errors
      if (error instanceof Error && error.message.includes("empty")) {
        return false;
      }

      return true;
    },
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30_000),
  });

  // Wrapper function for sending messages
  const sendMessage = useCallback(
    async (question: string): Promise<AIResponse> => {
      return sendMessageMutation.mutateAsync(question);
    },
    [sendMessageMutation]
  );

  // Function to handle follow-up questions based on the last message
  const handleFollowUp = useCallback(
    async (question: string): Promise<AIResponse> => {
      // Simply send the follow-up question as a new message
      return sendMessage(question);
    },
    [sendMessage]
  );

  // Helper function to get the latest messages
  const messages = conversation?.messages || [];

  // Helper function to check if there are any messages
  const hasMessages = messages.length > 0;

  // Helper function to get the last message
  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;

  // Helper function to get follow-up questions from the last message
  const lastFollowUpQuestions =
    lastMessage?.role === "assistant"
      ? lastMessage.followUpQuestions || []
      : [];

  // Helper function to clear conversation (not needed with native Convex)
  const clearConversation = useCallback(() => {
    // With native Convex, data updates automatically
  }, []);

  // Refetch function placeholder (not needed with native Convex reactivity)
  const refetch = useCallback(() => {
    // Native Convex handles updates automatically
  }, []);

  return {
    // Conversation data
    conversation: conversation ?? null,
    messages,
    hasMessages,
    lastMessage,

    // Follow-up questions
    lastFollowUpQuestions, // Added for follow-up questions

    // Loading states
    isLoading,
    isSending,
    isLoadingConversation: isLoading,

    // Error states
    error: error || sendMessageMutation.error || null,
    sendError: sendMessageMutation.error,

    // Functions
    sendMessage,
    handleFollowUp, // Added for follow-up questions
    refetch,
    clearConversation,

    // Mutation state for advanced use cases
    sendMessageMutation,

    // Session info
    sessionId,
    locale,
  };
}

/**
 * Hook for generating a unique session ID
 *
 * This utility hook generates a unique session ID that can be used
 * with the useAIChat hook. It creates a timestamp-based ID with
 * a random component for uniqueness.
 *
 * @returns A unique session ID string
 *
 * @example
 * ```tsx
 * const sessionId = useGenerateSessionId();
 * const chat = useAIChat({ sessionId });
 * ```
 */
export function useGenerateSessionId(): string {
  const [sessionId] = useState(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${random}`;
  });

  return sessionId;
}
