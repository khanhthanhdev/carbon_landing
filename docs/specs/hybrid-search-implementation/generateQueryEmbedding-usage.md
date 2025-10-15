# generateQueryEmbedding Usage Guide

## Quick Start

```typescript
import { generateQueryEmbedding } from "./searchUtils";

// In a Convex action
export const mySearchAction = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    // Generate embedding for search query
    const embedding = await generateQueryEmbedding(ctx, args.query);

    // Use embedding for vector search
    const results = await ctx.vectorSearch("qa", "by_embedding_doc", {
      vector: embedding,
      limit: 10,
    });

    return results;
  },
});
```

## API Reference

### generateQueryEmbedding

Generates a 768-dimensional embedding vector for a search query with automatic caching.

**Signature**:

```typescript
async function generateQueryEmbedding(
  ctx: ActionCtx,
  query: string,
  options?: {
    ttlMs?: number;
    skipCache?: boolean;
  }
): Promise<number[]>;
```

**Parameters**:

- `ctx` (ActionCtx): Convex action context
- `query` (string): The search query text
- `options` (optional):
  - `ttlMs` (number): Cache TTL in milliseconds (default: 24 hours)
  - `skipCache` (boolean): Skip cache and force regeneration (default: false)

**Returns**: Promise<number[]> - 768-dimensional embedding vector

**Throws**: Error if query is empty or embedding generation fails

## Usage Examples

### Basic Usage

```typescript
const embedding = await generateQueryEmbedding(ctx, "What is carbon trading?");
// Returns: [0.123, -0.456, 0.789, ...] (768 values)
```

### Custom Cache TTL

```typescript
// Cache for 7 days
const embedding = await generateQueryEmbedding(ctx, "carbon credits", {
  ttlMs: 7 * 24 * 60 * 60 * 1000,
});
```

### Force Regeneration

```typescript
// Skip cache and generate fresh embedding
const embedding = await generateQueryEmbedding(ctx, "sustainability", {
  skipCache: true,
});
```

### Error Handling

```typescript
try {
  const embedding = await generateQueryEmbedding(ctx, userQuery);
  // Use embedding...
} catch (error) {
  console.error("Failed to generate embedding:", error);
  // Fallback to text-only search
  return await textSearchFallback(ctx, userQuery);
}
```

### Batch Processing

```typescript
import { batchGenerateQueryEmbeddings } from "./searchUtils";

const queries = [
  "What is carbon trading?",
  "How do carbon credits work?",
  "What is a carbon offset?",
];

const embeddings = await batchGenerateQueryEmbeddings(ctx, queries, {
  ttlMs: 24 * 60 * 60 * 1000,
  batchDelayMs: 1000, // 1 second delay between requests
});

// embeddings[0] corresponds to queries[0], etc.
```

## Cache Behavior

### Cache Key

The cache key is generated from the normalized query:

```typescript
// These queries produce the same cache key:
"What is Carbon Trading?";
"what is carbon trading?";
"  What is carbon trading?  ";
```

### Cache Hit

When a cache hit occurs:

1. Embedding is retrieved from database (~50-100ms)
2. Access count is incremented
3. No API call to Gemini
4. Log message: `Cache hit for query: "..."`

### Cache Miss

When a cache miss occurs:

1. Embedding is generated via Gemini API (~500-2000ms)
2. Embedding is stored in cache
3. Log message: `Generated embedding for query: "..."`
4. Log message: `Cached embedding for query: "..."`

## Performance Tips

1. **Use caching**: Don't set `skipCache: true` unless necessary
2. **Batch processing**: Use `batchGenerateQueryEmbeddings` for multiple queries
3. **Rate limiting**: Add delays between batch requests to avoid rate limits
4. **Error handling**: Always wrap in try-catch for production code

## Common Patterns

### Hybrid Search

```typescript
export const hybridSearch = action({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Generate query embedding
    const embedding = await generateQueryEmbedding(ctx, args.query);

    // Vector search
    const vectorResults = await ctx.vectorSearch("qa", "by_embedding_doc", {
      vector: embedding,
      limit,
    });

    // Full-text search
    const textResults = await ctx.db
      .query("qa")
      .withSearchIndex("by_text", (q) => q.search("content", args.query))
      .take(limit);

    // Merge with RRF
    const merged = mergeWithRRF(vectorResults, textResults);

    return merged;
  },
});
```

### Search with Fallback

```typescript
export const searchWithFallback = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    try {
      // Try vector search
      const embedding = await generateQueryEmbedding(ctx, args.query);
      return await vectorSearch(ctx, embedding);
    } catch (error) {
      console.warn("Vector search failed, falling back to text search:", error);
      // Fallback to text-only search
      return await textSearch(ctx, args.query);
    }
  },
});
```

### Pre-warming Cache

```typescript
export const prewarmSearchCache = action({
  args: { queries: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results = [];

    for (const query of args.queries) {
      try {
        await generateQueryEmbedding(ctx, query);
        results.push({ query, status: "cached" });
      } catch (error) {
        results.push({ query, status: "failed", error: String(error) });
      }

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  },
});
```

## Troubleshooting

### Error: "Query text cannot be empty"

**Cause**: Empty or whitespace-only query string
**Solution**: Validate query before calling function

### Error: "Invalid embedding dimensions: expected 768, got X"

**Cause**: Gemini API returned wrong dimensions
**Solution**: This should not happen with the current implementation. Check if `dimensions: 768` is set in the call to `generateEmbedding`.

### Error: "Rate limit exceeded"

**Cause**: Too many requests to Gemini API
**Solution**:

- Add delays between requests
- Use batch processing with `batchDelayMs`
- Check rate limiter status in GeminiHelper

### Slow Performance

**Cause**: Cache misses or API latency
**Solution**:

- Pre-warm cache for common queries
- Increase cache TTL
- Monitor cache hit rate

## Monitoring

### Check Cache Stats

```typescript
const stats = await ctx.runQuery(api.embeddings.getCacheStats, {});
console.log("Cache stats:", stats);
// {
//   totalEntries: 150,
//   activeEntries: 145,
//   expiredEntries: 5,
//   totalAccesses: 1250,
//   avgAccessCount: 8.62
// }
```

### View Logs

Check Convex logs for:

- `Cache hit for query: "..."` - Successful cache retrieval
- `Generated embedding for query: "..."` - New embedding created
- `Cached embedding for query: "..."` - Embedding stored in cache
- `Cache check failed for query "...":` - Cache error (non-fatal)
- `Failed to cache embedding for query "...":` - Cache storage error (non-fatal)

## Best Practices

1. ✅ Always use within Convex actions (requires ActionCtx)
2. ✅ Wrap in try-catch for production code
3. ✅ Use default cache TTL unless you have specific requirements
4. ✅ Add delays between batch requests
5. ✅ Monitor cache hit rates
6. ✅ Pre-warm cache for common queries
7. ❌ Don't use `skipCache: true` in production
8. ❌ Don't call from queries or mutations (actions only)
9. ❌ Don't ignore errors - implement fallback strategies
