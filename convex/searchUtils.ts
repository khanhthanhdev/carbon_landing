/**
 * Search utility functions for vector and full-text search implementation
 */

import { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { generateEmbedding as geminiGenerateEmbedding } from "../lib/ai/gemini";

/**
 * Search result interface for search operations
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
  score?: number;
  [key: string]: any;
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
