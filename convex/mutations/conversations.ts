import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Saves a conversation message with sources and citation metadata
 * 
 * Creates a new conversation if it doesn't exist, or appends a message
 * to an existing conversation. Supports both user questions and assistant
 * answers with full citation metadata and generation statistics.
 * 
 * @param sessionId - Unique session identifier for the conversation
 * @param role - Message role ("user" | "assistant")
 * @param content - Message content (question or answer text)
 * @param sources - Optional array of source references with citation data
 * @param metadata - Optional generation metadata (timing, token usage, etc.)
 * @returns ID of the conversation record
 * 
 * Requirements: 11.9, 11.12
 */
export const saveConversationMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    locale: v.optional(v.string()),
    userId: v.optional(v.string()),
    sources: v.optional(v.array(v.object({
      questionId: v.id("qa"),
      questionNumber: v.string(),
      question: v.string(),
      relevanceScore: v.number(),
      citedSentences: v.optional(v.array(v.string())),
      citationMarkers: v.optional(v.array(v.string())),
    }))),
    followUpQuestions: v.optional(v.array(v.string())),
    metadata: v.optional(v.object({
      sourcesUsed: v.number(),
      generationTimeMs: v.number(),
      tokensUsed: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const locale = args.locale ?? "vi";
    
    // Check if conversation already exists
    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("bySessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    const newMessage = {
      role: args.role,
      content: args.content,
      timestamp: now,
      sources: args.sources,
      followUpQuestions: args.followUpQuestions,
      metadata: args.metadata,
    };

    if (existingConversation) {
      // Append message to existing conversation
      const updatedMessages = [...existingConversation.messages, newMessage];
      
      await ctx.db.patch(existingConversation._id, {
        messages: updatedMessages,
        updatedAt: now,
      });
      
      return existingConversation._id;
    } else {
      // Create new conversation
      const conversationId = await ctx.db.insert("conversations", {
        sessionId: args.sessionId,
        userId: args.userId,
        locale,
        messages: [newMessage],
        createdAt: now,
        updatedAt: now,
      });
      
      return conversationId;
    }
  },
});

