/**
 * Search utility functions for hybrid search implementation
 */

import { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { generateEmbedding as geminiGenerateEmbedding } from "../lib/ai/gemini";

/**
 * Search result interface for RRF merging
 */
export interface SearchResult {
  _id: string;
  question: string;
  answer: string;
  category: string;
  sources?: Array<{
    type: string;
    title: string;
    url: string;
    location?: string;
  }>;
  vectorScore?: number;
  textScore?: number;
  [key: string]: any;
}

/**
 * Merged search result with hybrid scoring
 */
export interface MergedSearchResult extends SearchResult {
  hybridScore: number;
  reasons: string[];
}

/**
 * Merges vector and full-text search results using Reciprocal Rank Fusion (RRF)
 * 
 * Formula: RRF_score(d) = α × (1 / (k + rank_vector(d))) + (1 - α) × (1 / (k + rank_text(d)))
 * 
 * @param vectorResults - Results from vector search, ordered by relevance
 * @param textResults - Results from full-text search, ordered by relevance
 * @param alpha - Weight for vector search (0-1, default 0.6). Higher values favor semantic search.
 * @param k - Constant to prevent division by zero and reduce impact of high ranks (default 60)
 * @returns Merged and sorted results with hybrid scores
 * 
 * @example
 * const merged = mergeWithRRF(vectorResults, textResults, 0.6, 60);
 * // Results are sorted by hybridScore in descending order
 */
export function mergeWithRRF(
  vectorResults: SearchResult[],
  textResults: SearchResult[],
  alpha: number = 0.6,
  k: number = 60
): MergedSearchResult[] {
  // Validate alpha parameter
  if (alpha < 0 || alpha > 1) {
    throw new Error("Alpha must be between 0 and 1");
  }

  // Validate k parameter
  if (k < 0) {
    throw new Error("k must be non-negative");
  }

  // Map to store combined scores
  const scoreMap = new Map<string, {
    doc: SearchResult;
    score: number;
    reasons: string[];
    vectorRank?: number;
    textRank?: number;
  }>();

  // Process vector search results
  vectorResults.forEach((doc, index) => {
    const rank = index; // 0-indexed rank
    const score = alpha * (1 / (k + rank));
    
    scoreMap.set(doc._id, {
      doc: { ...doc, vectorScore: doc.vectorScore },
      score,
      reasons: ["vector"],
      vectorRank: rank,
    });
  });

  // Process full-text search results
  textResults.forEach((doc, index) => {
    const rank = index; // 0-indexed rank
    const score = (1 - alpha) * (1 / (k + rank));
    
    const existing = scoreMap.get(doc._id);
    
    if (existing) {
      // Document appears in both results - add scores
      existing.score += score;
      existing.reasons.push("fts");
      existing.textRank = rank;
      // Preserve text score if available
      if (doc.textScore !== undefined) {
        existing.doc.textScore = doc.textScore;
      }
    } else {
      // Document only in text results
      scoreMap.set(doc._id, {
        doc: { ...doc, textScore: doc.textScore },
        score,
        reasons: ["fts"],
        textRank: rank,
      });
    }
  });

  // Convert map to array and sort by hybrid score (descending)
  const mergedResults = Array.from(scoreMap.values())
    .map(({ doc, score, reasons }) => ({
      ...doc,
      hybridScore: score,
      reasons,
    }))
    .sort((a, b) => {
      // Primary sort: by hybrid score (descending)
      if (b.hybridScore !== a.hybridScore) {
        return b.hybridScore - a.hybridScore;
      }
      
      // Secondary sort: by document ID for consistency
      return a._id.localeCompare(b._id);
    });

  return mergedResults;
}

const interpolateScore = (index: number, total: number, top: number, bottom: number) => {
  if (total <= 1) {
    return top;
  }
  const ratio = index / (total - 1);
  return top - (top - bottom) * ratio;
};

/**
 * Merges search results while prioritising keyword (full-text) hits before vector hits.
 *
 * The algorithm keeps all full-text results in their original order at the top of the list,
 * then appends unique vector-only results. Scores are normalised to the [0, 1] range with
 * full-text results occupying the upper band so they are surfaced first in the UI.
 *
 * @param vectorResults - Results from vector search.
 * @param textResults - Results from full-text search.
 * @param query - Raw search query used to evaluate exact matches.
 * @param alpha - Optional weight that controls how much vector matches boost keyword hits.
 * @returns Merged results with keyword hits first and hybrid scores in a friendly range.
 */
export function mergeWithKeywordPriority(
  vectorResults: SearchResult[],
  textResults: SearchResult[],
  query: string,
  alpha: number = 0.6
): MergedSearchResult[] {
  const resultsMap = new Map<
    string,
    {
      doc: SearchResult;
      score: number;
      reasons: Set<string>;
      textRank?: number;
      vectorRank?: number;
    }
  >();

  const hasTextResults = textResults.length > 0;
  const normalizedQuery = normalizeForMatch(query);
  const hasQuery = normalizedQuery.length > 0;

  const TEXT_TOP = 1;
  const TEXT_BOTTOM = hasTextResults ? 0.6 : 0.5;
  const VECTOR_TOP = hasTextResults ? 0.55 : 1;
  const VECTOR_BOTTOM = hasTextResults ? 0.2 : 0.3;

  textResults.forEach((doc, index) => {
    const score = interpolateScore(index, textResults.length, TEXT_TOP, TEXT_BOTTOM);
    resultsMap.set(doc._id, {
      doc: {
        ...doc,
        textScore: doc.textScore,
      },
      score,
      reasons: new Set<string>(["fts"]),
      textRank: index,
    });
  });

  vectorResults.forEach((doc, index) => {
    const baseVectorScore = interpolateScore(index, vectorResults.length, VECTOR_TOP, VECTOR_BOTTOM);
    const existing = resultsMap.get(doc._id);

    if (existing) {
      existing.reasons.add("vector");
      existing.doc = {
        ...existing.doc,
        vectorScore: doc.vectorScore,
      };
      const boost = baseVectorScore * Math.min(1, Math.max(alpha, 0)) * 0.25;
      existing.score = Math.min(TEXT_TOP, existing.score + boost);
      existing.vectorRank = index;
    } else {
      resultsMap.set(doc._id, {
        doc: {
          ...doc,
          vectorScore: doc.vectorScore,
        },
        score: baseVectorScore,
        reasons: new Set<string>(["vector"]),
        vectorRank: index,
      });
    }
  });

  const entries = Array.from(resultsMap.values());

  if (hasQuery) {
    entries.forEach((entry) => {
      const { doc, reasons } = entry;
      const normalizedQuestion = normalizeForMatch(doc.question);

      if (normalizedQuestion === normalizedQuery) {
        entry.score = TEXT_TOP;
        reasons.add("exact-question");
        return;
      }

      const answerMatch = doc.answer
        ? normalizeForMatch(doc.answer).includes(normalizedQuery)
        : false;

      if (answerMatch) {
        entry.score = Math.max(entry.score, 0.9);
        reasons.add("answer-match");
      }
    });
  }

  return entries
    .map(({ doc, score, reasons }) => ({
      ...doc,
      hybridScore: Number(Math.min(1, Math.max(0, score)).toFixed(6)),
      reasons: Array.from(reasons),
    }))
    .sort((a, b) => {
      if (b.hybridScore !== a.hybridScore) {
        return b.hybridScore - a.hybridScore;
      }
      return a._id.localeCompare(b._id);
    });
}

function normalizeForMatch(value: string | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Normalizes scores to 0-1 range for display purposes
 * 
 * @param results - Results with hybrid scores
 * @returns Results with normalized scores
 */
export function normalizeScores(results: MergedSearchResult[]): MergedSearchResult[] {
  if (results.length === 0) return results;

  // Find min and max scores
  const scores = results.map(r => r.hybridScore);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  
  // Avoid division by zero
  const range = maxScore - minScore;
  if (range === 0) {
    return results.map(r => ({ ...r, hybridScore: 1.0 }));
  }

  // Normalize to 0-1 range
  return results.map(r => ({
    ...r,
    hybridScore: (r.hybridScore - minScore) / range,
  }));
}

/**
 * Search filters interface for hash generation
 */
export interface SearchFilters {
  category?: string;
  section?: string;
  locale?: string;
  [key: string]: string | undefined;
}

/**
 * Generates a SHA-256 hash from query, filters, and locale for cache key generation
 * 
 * This function creates a deterministic hash that uniquely identifies a search query
 * with its associated filters and locale. The hash is used as a cache key to store
 * and retrieve search results efficiently.
 * 
 * @param query - The search query text
 * @param filters - Optional search filters (category, section, etc.)
 * @param locale - Language locale (e.g., "en", "vi")
 * @returns SHA-256 hash string (64 hex characters)
 * 
 * @example
 * const hash = await generateQueryHash("carbon trading", { category: "basics" }, "en");
 * // Returns: "a1b2c3d4e5f6..." (64-character hex string)
 * 
 * @example
 * // Same inputs always produce the same hash
 * const hash1 = await generateQueryHash("test", {}, "en");
 * const hash2 = await generateQueryHash("test", {}, "en");
 * // hash1 === hash2
 * 
 * @example
 * // Different inputs produce different hashes
 * const hash1 = await generateQueryHash("test", { category: "a" }, "en");
 * const hash2 = await generateQueryHash("test", { category: "b" }, "en");
 * // hash1 !== hash2
 */
export async function generateQueryHash(
  query: string,
  filters?: SearchFilters,
  locale?: string
): Promise<string> {
  // Normalize query text
  const normalizedQuery = query.trim().toLowerCase();
  
  // Create a deterministic string representation of filters
  const filterKeys = filters ? Object.keys(filters).sort() : [];
  const filterString = filterKeys
    .map(key => {
      const value = filters![key];
      return value ? `${key}:${value}` : '';
    })
    .filter(Boolean)
    .join('|');
  
  // Combine all components into a single string
  const combinedString = [
    normalizedQuery,
    filterString,
    locale || ''
  ].join('::');
  
  // Generate SHA-256 hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(combinedString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert hash buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  return hashHex;
}

/**
 * Generates a cache key for query embeddings
 * 
 * @param query - The search query text
 * @returns A cache key string
 */
function generateEmbeddingCacheKey(query: string): string {
  const normalized = query.trim().toLowerCase();
  return `query::${normalized}`;
}

/**
 * Generates query embedding with caching and error handling
 * 
 * This function wraps the Gemini embedding generation with:
 * 1. Cache checking before API call
 * 2. Proper task type (RETRIEVAL_QUERY) for search queries
 * 3. Error handling with fallback strategy
 * 4. Cache storage after successful generation
 * 
 * @param ctx - Convex action context
 * @param query - The search query text
 * @param options - Optional configuration
 * @param options.ttlMs - Cache TTL in milliseconds (default: 24 hours)
 * @param options.skipCache - Skip cache check and force regeneration
 * @returns Query embedding vector (768 dimensions)
 * @throws Error if query is empty or embedding generation fails
 * 
 * @example
 * const embedding = await generateQueryEmbedding(ctx, "What is carbon trading?");
 * // Returns: [0.123, -0.456, ...] (768-dimensional vector)
 * 
 * @example
 * // With custom TTL
 * const embedding = await generateQueryEmbedding(ctx, "carbon credits", {
 *   ttlMs: 7 * 24 * 60 * 60 * 1000 // 7 days
 * });
 */
export async function generateQueryEmbedding(
  ctx: ActionCtx,
  query: string,
  options?: {
    ttlMs?: number;
    skipCache?: boolean;
  }
): Promise<number[]> {
  // Validate input
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("Query text cannot be empty");
  }

  // Configuration
  const ttlMs = options?.ttlMs ?? 24 * 60 * 60 * 1000; // Default: 24 hours
  const skipCache = options?.skipCache ?? false;
  const cacheKey = generateEmbeddingCacheKey(trimmedQuery);

  // Check cache first (unless skipCache is true)
  if (!skipCache) {
    try {
      const cached = await ctx.runQuery(api.embeddings.getCachedEmbedding, {
        hash: cacheKey,
      });

      if (cached && cached.embedding && cached.embedding.length === 768) {
        console.log(`Cache hit for query: "${trimmedQuery.substring(0, 50)}..."`);
        
        // Update access tracking
        await ctx.runMutation(api.embeddings.updateAccessTracking, {
          hash: cacheKey,
        });

        return cached.embedding;
      }
    } catch (cacheError) {
      // Log cache error but continue to generate embedding
      console.warn(`Cache check failed for query "${trimmedQuery.substring(0, 50)}...":`, cacheError);
    }
  }

  // Generate new embedding with RETRIEVAL_QUERY task type
  try {
    console.log(`Generating embedding for query: "${trimmedQuery.substring(0, 50)}..."`);
    
    const embedding = await geminiGenerateEmbedding(trimmedQuery, {
      usage: "query", // Maps to RETRIEVAL_QUERY task type
      dimensions: 768, // Explicitly set to 768 dimensions
    });

    // Validate embedding dimensions
    if (!embedding || embedding.length !== 768) {
      throw new Error(
        `Invalid embedding dimensions: expected 768, got ${embedding?.length || 0}`
      );
    }

    // Cache the embedding for future use
    try {
      await ctx.runMutation(api.embeddings.cacheEmbedding, {
        hash: cacheKey,
        provider: "google-gemini",
        model: "gemini-embedding-001",
        dimensions: 768,
        embedding,
        expiresAt: Date.now() + ttlMs,
        taskType: "RETRIEVAL_QUERY",
        text: trimmedQuery,
      });
      
      console.log(`Cached embedding for query: "${trimmedQuery.substring(0, 50)}..."`);
    } catch (cacheError) {
      // Log cache storage error but don't fail the request
      console.warn(`Failed to cache embedding for query "${trimmedQuery.substring(0, 50)}...":`, cacheError);
    }

    return embedding;
  } catch (error) {
    // Enhanced error handling with context
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to generate embedding for query "${trimmedQuery.substring(0, 50)}...":`, errorMessage);
    
    // Determine if this is a rate limit, API unavailable, or other error
    let errorContext = '';
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorContext = ' (Rate limit exceeded - try again in a moment)';
    } else if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('unavailable')) {
      errorContext = ' (Gemini API unavailable - fallback to full-text search recommended)';
    } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
      errorContext = ' (Authentication error - check API configuration)';
    } else {
      errorContext = ' (Unknown error - fallback to full-text search recommended)';
    }
    
    // Re-throw with additional context and fallback suggestions
    throw new Error(
      `Embedding generation failed: ${errorMessage}${errorContext}. Query: "${trimmedQuery.substring(0, 100)}${trimmedQuery.length > 100 ? '...' : ''}"`
    );
  }
}

/**
 * Batch generates embeddings for multiple queries with rate limiting
 * 
 * @param ctx - Convex action context
 * @param queries - Array of query strings
 * @param options - Optional configuration
 * @param options.ttlMs - Cache TTL in milliseconds
 * @param options.batchDelayMs - Delay between batches in milliseconds (default: 1000ms)
 * @returns Array of embeddings corresponding to input queries
 * 
 * @example
 * const embeddings = await batchGenerateQueryEmbeddings(ctx, [
 *   "What is carbon trading?",
 *   "How do carbon credits work?",
 *   "What is a carbon offset?"
 * ]);
 */
export async function batchGenerateQueryEmbeddings(
  ctx: ActionCtx,
  queries: string[],
  options?: {
    ttlMs?: number;
    batchDelayMs?: number;
  }
): Promise<number[][]> {
  const batchDelayMs = options?.batchDelayMs ?? 1000;
  const embeddings: number[][] = [];

  for (let i = 0; i < queries.length; i++) {
    try {
      const embedding = await generateQueryEmbedding(ctx, queries[i], {
        ttlMs: options?.ttlMs,
      });
      embeddings.push(embedding);

      // Add delay between requests to respect rate limits
      if (i < queries.length - 1 && batchDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelayMs));
      }
    } catch (error) {
      console.error(`Failed to generate embedding for query ${i + 1}/${queries.length}:`, error);
      throw error;
    }
  }

  return embeddings;
}
