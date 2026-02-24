import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Logs search analytics for tracking query patterns and performance
 *
 * Records comprehensive search metadata including query text, filters,
 * performance metrics, search types used, and error information.
 * Used for analyzing user behavior and optimizing search experience.
 *
 * @param query - Search query text
 * @param locale - Language locale (e.g., "en", "vi")
 * @param category - Optional category filter applied
 * @param searchType - Type of search performed ("hybrid" | "vector" | "fulltext")
 * @param resultCount - Number of results returned
 * @param latencyMs - Search execution time in milliseconds
 * @param usedVector - Whether vector search was executed
 * @param usedFullText - Whether full-text search was executed
 * @param usedCache - Whether results were served from cache
 * @param error - Optional error message if search failed
 * @param ipHash - Optional hashed IP address for rate limiting analysis
 * @returns ID of the created analytics record
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export const logSearchAnalytics = mutation({
  args: {
    query: v.string(),
    locale: v.string(),
    category: v.optional(v.string()),
    searchType: v.string(),
    resultCount: v.number(),
    latencyMs: v.number(),
    usedVector: v.boolean(),
    usedFullText: v.boolean(),
    usedCache: v.boolean(),
    error: v.optional(v.string()),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Insert analytics record
    const id = await ctx.db.insert("searchAnalytics", {
      query: args.query,
      locale: args.locale,
      category: args.category,
      searchType: args.searchType,
      resultCount: args.resultCount,
      latencyMs: args.latencyMs,
      usedVector: args.usedVector,
      usedFullText: args.usedFullText,
      usedCache: args.usedCache,
      error: args.error,
      ipHash: args.ipHash,
      timestamp,
    });

    return id;
  },
});

/**
 * Clears expired cache entries in batches
 *
 * Queries for cache entries past their expiration time and deletes them
 * in configurable batches. Used for periodic cache cleanup to prevent
 * unbounded growth of the searchCache table.
 *
 * @param limit - Maximum number of entries to delete (default: 100, max: 500)
 * @returns Count of deleted cache entries
 *
 * Requirements: 2.7, 8.1
 */
export const clearExpiredCache = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const now = Date.now();

    // Query expired cache entries
    const expired = await ctx.db
      .query("searchCache")
      .withIndex("byExpiresAt", (q) => q.lt("expiresAt", now))
      .take(limit);

    // Delete in batch
    await Promise.all(expired.map((entry) => ctx.db.delete(entry._id)));

    return { deleted: expired.length };
  },
});
