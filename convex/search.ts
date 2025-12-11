import type { Id, Doc } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { logSearchError, SearchErrorContext } from "./shared";

interface QA {
  _id: Id<"qa">;
  _creationTime: number;
  question: string;
  answer: string;
  category: string;
  sources?: any[];
  keywords?: string[];
  lang?: string;
}


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
 * @deprecated This action is deprecated. Use api.search.vectorSearch for vector search
 * or api.search.hybridSearch for hybrid search instead. This action will be removed
 * in a future version.
 * 
 * For migration:
 * - Replace api.search.semantic with api.search.vectorSearch for direct vector search
 * - Use api.search.hybridSearch with searchType: "hybrid" for combined vector + full-text search
 */
export const semantic = action({
  args: {
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.warn("api.search.semantic is deprecated. Use api.search.vectorSearch or api.search.hybridSearch instead.");

    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);

    const vectorResults = (await ctx.vectorSearch("qa", "by_embedding_doc", {
      vector: args.embedding,
      limit: limit * 2, // Fetch more for re-ranking
      ...(args.category
        ? {
          filter: (q) => q.eq("category", args.category!),
        }
        : {}),
    })) as Array<{ _id: Id<"qa">; _score: number }>;

    const vectorDocs = await ctx.runQuery(api.queries.documents.getQAsByIds, {
      ids: vectorResults.map((r) => r._id),
    });

    const vectorDocMap = new Map(vectorDocs.map((d) => [d._id, d]));

    const results = vectorResults
      .map((r, i) => {
        const doc = vectorDocMap.get(r._id) as QA | undefined;
        if (!doc) return null;
        return {
          _id: doc._id,
          question: doc.question,
          answer: doc.answer,
          category: doc.category,
          sources: doc.sources,
          score: r._score,
          rank: i + 1,
          matchType: "vector" as const,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return results
      .map((result) => {
        const doc = vectorDocMap.get(result._id) as QA | undefined;
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
          score: result.score,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);
  },
});

/**
 * Retrieves cached search results by query hash and locale
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
      }),
    ),
    ttlMs: v.optional(v.number()),
  },
  handler: async (ctx, { queryHash, locale, questionIds, queryText, scores, embedding, filters, ttlMs }) => {
    if (scores && scores.length > 0 && scores.length !== questionIds.length) {
      throw new ConvexError("scores length must match questionIds length.");
    }

    const ttl = ttlMs ?? DEFAULT_SEARCH_CACHE_TTL_MS;
    if (ttl <= 0) {
      throw new ConvexError("ttlMs must be greater than 0.");
    }

    const now = Date.now();
    const expiresAt = now + ttl;

    const existing = await ctx.db
      .query("searchCache")
      .withIndex("byQueryHash", (q) => q.eq("queryHash", queryHash).eq("locale", locale))
      .first();

    const embeddingValue = embedding && embedding.length > 0 ? embedding : undefined;
    const sanitizedQueryText = sanitizeOptionalString(queryText);

    if (existing) {
      const patchPayload: Partial<Doc<"searchCache">> = {
        questionIds: questionIds,
        scores: scores ?? existing.scores ?? [],
        expiresAt,
      };

      if (sanitizedQueryText !== undefined) {
        patchPayload.queryText = sanitizedQueryText;
      }

      if (embeddingValue) {
        patchPayload.embedding = embeddingValue;
      }

      if (filters) {
        patchPayload.filters = filters;
      }

      await ctx.db.patch(existing._id, patchPayload);
      return { id: existing._id, updated: true };
    }

    const insertPayload: Omit<Doc<"searchCache">, "_id" | "_creationTime"> = {
      queryHash: queryHash,
      locale: locale,
      questionIds: questionIds,
      scores: scores ?? [],
      createdAt: now,
      expiresAt,
      lastAccessedAt: now,
      accessCount: 0,
      ...(sanitizedQueryText ? { queryText: sanitizedQueryText } : {}),
      ...(filters ? { filters: filters } : {}),
      ...(embeddingValue ? { embedding: embeddingValue } : {}),
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

/**
 * Helper function to combine search results using Reciprocal Rank Fusion (RRF)
 */
function combineWithRRF(
  vectorResults: Array<{ _id: Id<"qa">; _score: number }>,
  textResults: Array<{ _id: Id<"qa">; _score: number }>,
  k: number = 60,
  vectorWeight: number = 0.5,
  textWeight: number = 0.5
): Array<{ _id: Id<"qa">; vectorRank: number; textRank: number; rrfScore: number; normalizedScore: number }> {
  // Create maps for quick rank and score lookup
  const vectorRankMap = new Map<Id<"qa">, number>();
  const textRankMap = new Map<Id<"qa">, number>();
  const vectorScoreMap = new Map<Id<"qa">, number>();
  const textScoreMap = new Map<Id<"qa">, number>();

  vectorResults.forEach((result, index) => {
    vectorRankMap.set(result._id, index + 1); // Rank starts at 1
    vectorScoreMap.set(result._id, result._score);
  });

  textResults.forEach((result, index) => {
    textRankMap.set(result._id, index + 1); // Rank starts at 1
    textScoreMap.set(result._id, result._score);
  });

  // Collect all unique document IDs
  const allIds = new Set<Id<"qa">>([
    ...vectorResults.map(r => r._id),
    ...textResults.map(r => r._id)
  ]);

  // Calculate RRF score and weighted similarity score for each document
  const combined = Array.from(allIds).map(_id => {
    const vectorRank = vectorRankMap.get(_id) ?? Infinity;
    const textRank = textRankMap.get(_id) ?? Infinity;
    const vectorScore = vectorScoreMap.get(_id) ?? 0;
    const textScore = textScoreMap.get(_id) ?? 0;

    // RRF formula: sum of 1/(k + rank) for each ranking
    const rrfScore = (vectorRank < Infinity ? 1 / (k + vectorRank) : 0) +
      (textRank < Infinity ? 1 / (k + textRank) : 0);

    // Weighted combination of similarity scores
    const normalizedVectorScore = Math.max(0, Math.min(1, vectorScore));
    const normalizedTextScore = Math.max(0, Math.min(1, textScore));

    let weightedScore = 0;
    let totalWeight = 0;

    if (vectorRank < Infinity) {
      weightedScore += normalizedVectorScore * vectorWeight;
      totalWeight += vectorWeight;
    }
    if (textRank < Infinity) {
      weightedScore += normalizedTextScore * textWeight;
      totalWeight += textWeight;
    }

    // Normalize by total weight if both are present
    const finalWeightedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    return {
      _id,
      vectorRank: vectorRank < Infinity ? vectorRank : -1,
      textRank: textRank < Infinity ? textRank : -1,
      rrfScore,
      normalizedScore: finalWeightedScore, // Use weighted similarity score as the main score
    };
  });

  // Sort by RRF score descending (for ranking), but use normalizedScore for display
  combined.sort((a, b) => b.rrfScore - a.rrfScore);

  return combined;
}

/**
 * Unified search action orchestrator
 */
export const hybridSearch = action({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    topK: v.optional(v.number()),
    alpha: v.optional(v.number()),
    searchType: v.optional(v.union(
      v.literal("vector"),
      v.literal("fulltext"),
      v.literal("hybrid")
    )),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // Validate and normalize parameters
    const query = args.query.trim();
    if (!query || query.length === 0) {
      throw new ConvexError("Query text cannot be empty");
    }

    const topK = Math.min(Math.max(args.topK ?? 10, 1), 50);
    const alpha = Math.min(Math.max(args.alpha ?? 0.6, 0), 1);
    const searchType = args.searchType ?? "vector";
    const category = args.category?.trim() || undefined;
    // Normalize lang
    const lang = args.lang?.trim() || undefined;
    if (lang && lang !== "vi" && lang !== "en") {
      console.warn(`Invalid lang value: ${lang}, expected "vi" or "en"`);
    }

    // Build filters object for cache key generation
    const filters: Record<string, string> = {};
    if (category) filters.category = category;
    if (lang) filters.lang = lang;

    // Generate query hash for caching
    const { generateQueryHash } = await import("./searchUtils");
    const queryHash = await generateQueryHash(query, filters, lang);

    // Check cache first
    const cached = await ctx.runQuery(api.search.getCachedSearchResults, {
      queryHash,
      locale: lang ?? "vi",
    });

    const shouldUseCache = (() => {
      if (!cached || cached.questionIds.length === 0) {
        return false;
      }

      const cachedScores = cached.scores ?? [];
      if (cachedScores.length === 0) {
        return false;
      }

      const maxCachedScore = Math.max(...cachedScores);
      if (!Number.isFinite(maxCachedScore)) {
        return false;
      }

      // Legacy cache entries might have low quality, refresh if too low
      if (maxCachedScore < 0.3) {
        return false;
      }

      return true;
    })();

    if (shouldUseCache && cached) {
      const cacheRecord = cached;
      // Cache hit - update access statistics
      await ctx.runMutation(api.search.updateCacheAccessStats, {
        cacheId: cacheRecord.id,
      });

      // Fetch full question data using batch query
      const questionIds = cacheRecord.questionIds.slice(0, topK);
      const questions = await ctx.runQuery(api.queries.documents.getQAsByIds, {
        ids: questionIds,
      }) as QA[];

      // Create a map for quick lookup
      const questionMap = new Map(questions.map(q => [q._id, q]));

      // Build results from cached data
      const results = questionIds
        .map((id, index) => {
          const q = questionMap.get(id);
          if (!q) return null;

          const cachedScore = cacheRecord.scores?.[index] ?? 0;
          const score = typeof cachedScore === 'number' && !isNaN(cachedScore) ? cachedScore : Math.max(0.1, 1 - index * 0.1);
          return {
            _id: q._id,
            question: q.question,
            answer: q.answer,
            category: q.category,
            sources: q.sources,
            score,
            reasons: ["cached"] as string[],
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const latencyMs = Date.now() - startTime;

      return {
        results,
        metadata: {
          totalResults: results.length,
          searchType,
          usedCache: true,
          latencyMs,
          usedVector: false,
          usedFullText: false,
        },
      };
    }

    // Cache miss - execute search based on search type
    let usedVector = false;
    let usedFullText = false;
    let embedding: number[] | undefined;
    let searchErrors: string[] = [];

    // Final formatted results
    let finalResults: Array<{
      _id: Id<"qa">;
      question: string | undefined;
      answer: string | undefined;
      category: string;
      sources: any;
      score: number;
      vectorScore?: number;
      textScore?: number;
      rrfScore?: number;
      vectorRank?: number;
      textRank?: number;
      reasons: string[];
    }> = [];

    // Helper function to perform vector search directly
    const performVectorSearch = async (embeddingVector: number[], limit: number) => {
      // Build filter based on category and lang
      let filterFn: ((q: any) => any) | undefined;
      if (category && lang) {
        filterFn = (q: any) => q.eq("category", category).eq("lang", lang);
      } else if (category) {
        filterFn = (q: any) => q.eq("category", category);
      } else if (lang) {
        filterFn = (q: any) => q.eq("lang", lang);
      }

      // Perform vector search directly (no action-to-action call)
      const results = (filterFn
        ? await ctx.vectorSearch("qa", "by_embedding_doc", {
          vector: embeddingVector,
          limit,
          filter: filterFn,
        })
        : await ctx.vectorSearch("qa", "by_embedding_doc", {
          vector: embeddingVector,
          limit,
        })) as Array<{ _id: Id<"qa">; _score: number }>;

      return results;
    };

    // Execute searches based on search type with enhanced error handling
    if (searchType === "vector") {
      // Vector search only
      try {
        const { generateQueryEmbedding } = await import("./searchUtils");
        embedding = await generateQueryEmbedding(ctx, query);
        usedVector = true;

        // Perform vector search directly
        const vectorResults = await performVectorSearch(embedding, topK);

        console.log(`Vector search returned ${vectorResults.length} results`);

        if (vectorResults.length > 0) {
          // Fetch full documents using batch query
          const documentIds = vectorResults.map(result => result._id);
          const documents = await ctx.runQuery(api.queries.documents.getQAsByIds, {
            ids: documentIds,
          }) as QA[];

          // Create a map for quick lookup
          const docMap = new Map(documents.map(doc => [doc._id, doc]));

          // Format results
          finalResults = vectorResults.map((result, index) => {
            const doc = docMap.get(result._id);
            if (!doc) {
              console.warn(`Document not found for ID: ${result._id}`);
              return null;
            }

            const score = typeof result._score === 'number' && !isNaN(result._score)
              ? result._score
              : Math.max(0.1, 1 - index * 0.1);

            return {
              _id: doc._id,
              question: doc.question,
              answer: doc.answer,
              category: doc.category,
              sources: doc.sources,
              score,
              vectorScore: result._score,
              reasons: ["vector"] as string[],
            };
          }).filter((r): r is NonNullable<typeof r> => r !== null);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        let errorType: SearchErrorContext['errorType'] = 'unknown';

        if (errorMsg.includes('Embedding generation failed') || errorMsg.includes('Gemini')) {
          errorType = 'embedding_generation';
        } else {
          errorType = 'vector_search';
        }

        console.error("Vector search error:", errorMsg);
        logSearchError({
          query,
          searchType,
          category,
          lang,
          topK,
          alpha,
          latencyMs: Date.now() - startTime,
          usedVector: false,
          usedFullText: false,
          usedCache: false,
          queryHash,
          error: errorMsg,
          errorType,
          fallbackUsed: "Returning empty results"
        });

        searchErrors.push(`Vector search error: ${errorMsg}`);
      }

    } else if (searchType === "fulltext") {
      // Full-text search only
      try {
        usedFullText = true;
        const textResults = await ctx.runQuery(api.queries.search.fullTextSearch, {
          query,
          category,
          lang,
          limit: topK,
        });

        console.log(`Full-text search returned ${textResults.length} results`);

        if (textResults.length > 0) {
          finalResults = textResults.map((result, index) => {
            const score = typeof result.textScore === 'number' && !isNaN(result.textScore)
              ? result.textScore
              : Math.max(0.1, 1 - index * 0.1);

            return {
              _id: result._id as Id<"qa">,
              question: result.question,
              answer: result.answer,
              category: result.category,
              sources: result.sources,
              score,
              textScore: result.textScore,
              reasons: ["fulltext"] as string[],
            };
          });
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        console.error("Full-text search error:", errorMsg);
        logSearchError({
          query,
          searchType,
          category,
          lang,
          topK,
          alpha,
          latencyMs: Date.now() - startTime,
          usedVector: false,
          usedFullText: false,
          usedCache: false,
          queryHash,
          error: errorMsg,
          errorType: 'fulltext_search',
          fallbackUsed: "Returning empty results"
        });

        searchErrors.push(`Full-text search error: ${errorMsg}`);
      }

    } else {
      // Hybrid search
      try {
        const { generateQueryEmbedding } = await import("./searchUtils");
        embedding = await generateQueryEmbedding(ctx, query);

        const [vectorSearchResults, textSearchResults] = await Promise.all([
          performVectorSearch(embedding, topK * 2).catch((err) => {
            console.warn("Vector search in hybrid mode failed:", err);
            searchErrors.push(`Vector search: ${err instanceof Error ? err.message : String(err)}`);
            return [] as Array<{ _id: Id<"qa">; _score: number }>;
          }),
          ctx.runQuery(api.queries.search.fullTextSearch, {
            query,
            category,
            lang,
            limit: topK * 2,
          }).then(res => res as Array<Doc<"qa"> & { textScore: number }>).catch((err) => {
            console.warn("Full-text search in hybrid mode failed:", err);
            searchErrors.push(`Full-text search: ${err instanceof Error ? err.message : String(err)}`);
            return [] as Array<{ _id: Id<"qa">; textScore: number }>;
          }),
        ]);

        usedVector = vectorSearchResults.length > 0;
        usedFullText = textSearchResults.length > 0;

        console.log(`Hybrid search: vector=${vectorSearchResults.length} results, fulltext=${textSearchResults.length} results`);

        if (vectorSearchResults.length > 0 || textSearchResults.length > 0) {
          const textResultsForRRF = textSearchResults.map(r => ({
            _id: r._id,
            _score: r.textScore ?? 0,
          }));

          const combined = combineWithRRF(vectorSearchResults, textResultsForRRF, 60);

          const allDocumentIds = Array.from(new Set([
            ...vectorSearchResults.map(r => r._id),
            ...textSearchResults.map(r => r._id)
          ]));

          const allDocs = await ctx.runQuery(api.queries.documents.getQAsByIds, {
            ids: allDocumentIds,
          }) as QA[];

          const docMap = new Map(allDocs.map(doc => [doc._id, doc]));

          const vectorScoreMap = new Map<Id<"qa">, { rank: number; score: number }>();
          vectorSearchResults.forEach((r, i) => vectorScoreMap.set(r._id, { rank: i + 1, score: r._score }));

          const textScoreMap = new Map<Id<"qa">, { rank: number; score: number }>();
          textSearchResults.forEach((r, i) => textScoreMap.set(r._id, { rank: i + 1, score: r.textScore }));

          finalResults = combined
            .slice(0, topK)
            .map(item => {
              const doc = docMap.get(item._id) as QA | undefined;
              if (!doc) return null;

              const vectorInfo = vectorScoreMap.get(item._id);
              const textInfo = textScoreMap.get(item._id);

              return {
                _id: doc._id,
                question: doc.question,
                answer: doc.answer,
                category: doc.category,
                sources: doc.sources,
                vectorScore: vectorInfo?.score,
                textScore: textInfo?.score,
                rrfScore: item.rrfScore,
                vectorRank: item.vectorRank,
                textRank: item.textRank,
                score: item.normalizedScore,
                reasons: ["hybrid"] as string[],
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        console.error("Hybrid search error:", errorMsg);
        logSearchError({
          query,
          searchType,
          category,
          lang,
          topK,
          alpha,
          latencyMs: Date.now() - startTime,
          usedVector,
          usedFullText,
          usedCache: false,
          queryHash,
          error: errorMsg,
          errorType: usedVector || usedFullText ? 'unknown' : 'both_searches_failed',
          fallbackUsed: "Returning empty results"
        });

        searchErrors.push(`Hybrid search error: ${errorMsg}`);
      }
    }

    const results = finalResults.slice(0, topK);

    // Cache the results
    let cacheWriteSuccess = false;
    try {
      await ctx.runMutation(api.search.cacheSearchResults, {
        queryHash,
        locale: lang ?? "vi",
        questionIds: results.map(r => r._id as Id<"qa">),
        queryText: query,
        scores: results.map(r => r.score),
        embedding,
        filters: Object.keys(filters).length > 0 ? {
          category,
          locale: lang,
        } : undefined,
        ttlMs: DEFAULT_SEARCH_CACHE_TTL_MS,
      });
      cacheWriteSuccess = true;
      console.log("Successfully cached search results");
    } catch (cacheError) {
      const errorMsg = cacheError instanceof Error ? cacheError.message : String(cacheError);

      logSearchError({
        query,
        searchType,
        category,
        lang,
        topK,
        alpha,
        latencyMs: Date.now() - startTime,
        usedVector,
        usedFullText,
        usedCache: false,
        queryHash,
        error: errorMsg,
        errorType: 'cache_operation',
        fallbackUsed: 'Continuing without cache'
      });
      console.warn("Failed to cache search results:", errorMsg);
    }

    const latencyMs = Date.now() - startTime;

    console.log(`Search completed: ${results.length} results in ${latencyMs}ms`);

    return {
      results,
      metadata: {
        totalResults: results.length,
        searchType,
        usedCache: false,
        latencyMs,
        usedVector,
        usedFullText,
        cacheWriteSuccess,
        errors: searchErrors.length > 0 ? searchErrors : undefined,
      },
    };
  },
});

/**
 * Enhanced vector search action using the qa table with by_embedding_doc index
 */
export const vectorSearch = action({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { embedding, category, lang, limit }) => {
    const take = Math.min(Math.max(limit ?? 20, 1), 50);

    if (embedding.length !== 768) {
      throw new Error(`Invalid embedding dimensions: expected 768, got ${embedding.length}`);
    }

    let filterFn;
    if (category && lang) {
      filterFn = (q: any) => q.eq("category", category).eq("lang", lang);
    } else if (category) {
      filterFn = (q: any) => q.eq("category", category);
    } else if (lang) {
      filterFn = (q: any) => q.eq("lang", lang);
    }

    let results;
    if (filterFn) {
      results = await ctx.vectorSearch("qa", "by_embedding_doc", {
        vector: embedding,
        limit: take,
        filter: filterFn,
      });
    } else {
      results = await ctx.vectorSearch("qa", "by_embedding_doc", {
        vector: embedding,
        limit: take,
      });
    }

    const documentIds = results.map(result => result._id);
    const documents = await ctx.runQuery(api.queries.documents.getQAsByIds, {
      ids: documentIds,
    }) as QA[];

    const docMap = new Map(documents.map(doc => [doc._id, doc]));

    return results.map((result) => {
      const doc = docMap.get(result._id) as any;
      if (!doc) {
        console.warn(`Document not found for ID: ${result._id}`);
        return null;
      }

      return {
        _id: result._id,
        question: doc.question as string,
        answer: doc.answer as string,
        category: doc.category as string,
        sources: (doc.sources as any[]) || [],
        question_number: doc.question_number as string | undefined,
        section_number: doc.section_number as string | undefined,
        section_title: doc.section_title as string | undefined,
        lang: doc.lang as string | undefined,
        vectorScore: result._score,
      };
    }).filter((result): result is NonNullable<typeof result> => result !== null);
  },
});
