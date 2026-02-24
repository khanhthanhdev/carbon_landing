import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Retrieves a conversation by session ID
 *
 * Returns the complete conversation history including all messages
 * with their sources and metadata. Used by the chat interface to
 * display conversation history and restore context.
 *
 * @param sessionId - Unique session identifier for the conversation
 * @returns Complete conversation record with messages, or null if not found
 *
 * Requirements: 11.9
 */
export const getConversation = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("bySessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    return conversation;
  },
});
