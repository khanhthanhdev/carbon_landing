"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Message interface matching the Convex schema
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: Array<{
    questionId: Id<"qa">;
    questionNumber: string;
    question: string;
    relevanceScore: number;
    citedSentences?: string[];
    citationMarkers?: string[];
  }>;
  metadata?: {
    sourcesUsed: number;
    generationTimeMs: number;
    tokensUsed?: number;
  };
}

/**
 * Conversation interface matching the Convex schema
 */
export interface Conversation {
  _id: Id<"conversations">;
  sessionId: string;
  userId?: string;
  locale: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Response from the askAI action
 */
export interface AIResponse {
  answer: string;
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
  conversationId: string;
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
}

/**
 * Options for the useAIChat hook
 */
export interface UseAIChatOptions {
  sessionId: string;
  locale?: string;
  maxSources?: number;
  enabled?: boolean;
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
}: UseAIChatOptions) {
  const queryClient = useQueryClient();
  const convex = useConvex();
  const [isSending, setIsSending] = useState(false);

  // Query for fetching conversation history
  const {
    data: conversation,
    isLoading,
    error,
    refetch,
  } = useQuery<Conversation | null>({
    ...convexQuery(api.queries.conversations.getConversation, { sessionId }),
    enabled: enabled && !!sessionId,
    staleTime: 30 * 1000, // 30 seconds - conversations change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount: number, error: Error) => {
      // Retry up to 2 times for network errors
      if (failureCount >= 2) return false;
      return true;
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: async (question: string): Promise<AIResponse> => {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion) {
        throw new Error("Question cannot be empty");
      }

      // Call the Convex askAI action directly using the Convex client
      const result = await convex.action(api.actions.askAI, {
        question: trimmedQuestion,
        sessionId,
        locale,
        maxSources,
      });

      return result as AIResponse;
    },
    onMutate: () => {
      setIsSending(true);
    },
    onSuccess: () => {
      // Invalidate and refetch the conversation to get the latest messages
      queryClient.invalidateQueries({
        queryKey: ["convex", "queries.conversations.getConversation", { sessionId }],
      });
    },
    onError: (error: Error) => {
      console.error("Failed to send message:", error);
    },
    onSettled: () => {
      setIsSending(false);
    },
    retry: (failureCount: number, error: Error) => {
      // Don't retry for client errors (4xx) or if already retried twice
      if (failureCount >= 2) return false;
      
      // Don't retry for validation errors
      if (error instanceof Error && error.message.includes("empty")) {
        return false;
      }

      return true;
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Wrapper function for sending messages
  const sendMessage = useCallback(
    async (question: string): Promise<AIResponse> => {
      return sendMessageMutation.mutateAsync(question);
    },
    [sendMessageMutation]
  );

  // Helper function to get the latest messages
  const messages = conversation?.messages || [];

  // Helper function to check if there are any messages
  const hasMessages = messages.length > 0;

  // Helper function to get the last message
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  // Helper function to clear conversation (for future use)
  const clearConversation = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["convex", "queries.conversations.getConversation", { sessionId }],
    });
  }, [queryClient, sessionId]);

  return {
    // Conversation data
    conversation,
    messages,
    hasMessages,
    lastMessage,

    // Loading states
    isLoading,
    isSending,
    isLoadingConversation: isLoading,

    // Error states
    error,
    sendError: sendMessageMutation.error,

    // Functions
    sendMessage,
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