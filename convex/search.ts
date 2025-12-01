import type { Doc } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { ConvexError, v } from "convex/values";

const DEFAULT_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Cache Access Statistics Usage Pattern
 * 
 * When implementing hybrid search or any action that uses the search cache:
 * 
 * 1. Check cache:
 *    const cached = await ctx.runQuery(api.search.getCachedSearchResults, {
 *      queryHash,
 *      locale
 *    });
 * 
 * 2. If cache hit, update statistics:
 *    if (cached) {
 *      await ctx.runMutation(api.search.updateCacheAccessStats, {
 *        cacheId: cached.id
 *      });
 *      return cached.questionIds; // Use cached results
 *    }
 * 
 * 3. If cache miss, execute search and cache:
 *    const results = await executeSearch(...);
 *    await ctx.runMutation(api.search.cacheSearchResults, {
 *      queryHash,
 *      locale,
 *      questionIds: results.map(r => r._id),
 *      scores: results.map(r => r.score),
 *      ...
 *    });
 */

const sanitizeOptionalString = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Semantic search action (deprecated)
 * 
 * @deprecated This action is deprecated. Use api.actions.vectorSearch for vector search
 * or api.actions.hybridSearch for hybrid search instead. This action will be removed
 * in a future version.
 * 
 * For migration:
 * - Replace api.search.semantic with api.actions.vectorSearch for direct vector search
 * - Use api.actions.hybridSearch with searchType: "hybrid" for combined vector + full-text search
 */
export const semantic = action({
  args: {
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.warn("api.search.semantic is deprecated. Use api.actions.vectorSearch or api.actions.hybridSearch instead.");
    
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);

    const results = await ctx.vectorSearch("qa", "by_embedding_doc", {
      vector: args.embedding,
      limit,
      ...(args.category
        ? {
          filter: (q) => q.eq("category", args.category!),
        }
        : {}),
    });

    // Use batch document fetching instead of individual queries
    const documentIds = results.map(result => result._id);
    const documents = await ctx.runQuery(api.queries.documents.getQAsByIds, {
      ids: documentIds,
    });

    // Create a map for quick lookup
    const docMap = new Map(documents.map(doc => [doc._id, doc]));

    return results
      .map((result) => {
        const doc = docMap.get(result._id);
        if (!doc) {
          return null;
        }

        return {
          id: doc._id,
          question: doc.question,
          answer: doc.answer,
          category: doc.category,
          sources: doc.sources,
          tags: doc.keywords ?? [],
          isCommon: false,
          sequence: 0,
          score: result._score,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);
  },
});

/**
 * Retrieves cached search results by query hash and locale
 * 
 * This query checks the cache for previously executed search results.
 * It validates cache expiration and automatically deletes expired entries.
 * 
 * Usage pattern:
 * 1. Call this query to check for cached results
 * 2. If cache hit (returns data), call updateCacheAccessStats mutation to track usage
 * 3. If cache miss (returns null), execute fresh search and cache results
 * 
 * @param queryHash - SHA-256 hash of query + filters + locale
 * @param locale - Language locale (e.g., "en", "vi")
 * @returns Cached search data or null if not found/expired
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.7
 */
export const getCachedSearchResults = query({
  args: {
    queryHash: v.string(),
    locale: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("searchCache")
      .withIndex("byQueryHash", (q) => q.eq("queryHash", args.queryHash).eq("locale", args.locale))
      .first();

    if (!record) {
      return null;
    }

    // Validate cache expiration - return null if expired
    // Note: Expired entries will be cleaned up by clearExpiredSearchCache mutation
    if (record.expiresAt <= Date.now()) {
      return null;
    }

    // Return cache data (access statistics will be updated by separate mutation)
    return {
      id: record._id,
      queryHash: record.queryHash,
      queryText: record.queryText,
      questionIds: record.questionIds,
      scores: record.scores ?? [],
      locale: record.locale,
      filters: record.filters,
      embedding: record.embedding,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      lastAccessedAt: record.lastAccessedAt,
      accessCount: record.accessCount,
    };
  },
});

/**
 * Updates cache access statistics when a cache hit occurs
 * 
 * This mutation should be called after getCachedSearchResults returns data
 * to track cache usage patterns. It increments the access count and updates
 * the last accessed timestamp.
 * 
 * @param cacheId - The ID of the cache entry to update
 * @returns Success status and updated access count
 * 
 * Requirements: 2.3
 */
export const updateCacheAccessStats = mutation({
  args: {
    cacheId: v.id("searchCache"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.cacheId);

    if (!record) {
      return { success: false, reason: "Cache entry not found" };
    }

    // Check if still valid before updating
    if (record.expiresAt <= Date.now()) {
      return { success: false, reason: "Cache entry expired" };
    }

    // Update access statistics
    await ctx.db.patch(args.cacheId, {
      lastAccessedAt: Date.now(),
      accessCount: record.accessCount + 1,
    });

    return { success: true, accessCount: record.accessCount + 1 };
  },
});

export const cacheSearchResults = mutation({
  args: {
    queryHash: v.string(),
    locale: v.string(),
    questionIds: v.array(v.id("qa")),
    queryText: v.optional(v.string()),
    scores: v.optional(v.array(v.float64())),
    embedding: v.optional(v.array(v.float64())),
    filters: v.optional(
      v.object({
        category: v.optional(v.string()),
        section: v.optional(v.string()),
        locale: v.optional(v.string()),
      }),
    ),
    ttlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.scores && args.scores.length > 0 && args.scores.length !== args.questionIds.length) {
      throw new ConvexError("scores length must match questionIds length.");
    }

    const ttl = args.ttlMs ?? DEFAULT_SEARCH_CACHE_TTL_MS;
    if (ttl <= 0) {
      throw new ConvexError("ttlMs must be greater than 0.");
    }

    const now = Date.now();
    const expiresAt = now + ttl;

    const existing = await ctx.db
      .query("searchCache")
      .withIndex("byQueryHash", (q) => q.eq("queryHash", args.queryHash).eq("locale", args.locale))
      .first();

    const embedding = args.embedding && args.embedding.length > 0 ? args.embedding : undefined;
    const sanitizedQueryText = sanitizeOptionalString(args.queryText);

    if (existing) {
      const patchPayload: Partial<Doc<"searchCache">> = {
        questionIds: args.questionIds,
        scores: args.scores ?? existing.scores ?? [],
        expiresAt,
      };

      if (sanitizedQueryText !== undefined) {
        patchPayload.queryText = sanitizedQueryText;
      }

      if (embedding) {
        patchPayload.embedding = embedding;
      }

      if (args.filters) {
        patchPayload.filters = args.filters;
      }

      await ctx.db.patch(existing._id, patchPayload);
      return { id: existing._id, updated: true };
    }

    const insertPayload: Omit<Doc<"searchCache">, "_id" | "_creationTime"> = {
      queryHash: args.queryHash,
      locale: args.locale,
      questionIds: args.questionIds,
      scores: args.scores ?? [],
      createdAt: now,
      expiresAt,
      lastAccessedAt: now,
      accessCount: 0,
      ...(sanitizedQueryText ? { queryText: sanitizedQueryText } : {}),
      ...(args.filters ? { filters: args.filters } : {}),
      ...(embedding ? { embedding } : {}),
    };

    const id = await ctx.db.insert("searchCache", insertPayload);
    return { id, updated: false };
  },
});

export const clearExpiredSearchCache = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const now = Date.now();

    const expired = await ctx.db
      .query("searchCache")
      .withIndex("byExpiresAt", (q) => q.lt("expiresAt", now))
      .take(limit);

    await Promise.all(expired.map((record) => ctx.db.delete(record._id)));

    return { removed: expired.length };
  },
});
