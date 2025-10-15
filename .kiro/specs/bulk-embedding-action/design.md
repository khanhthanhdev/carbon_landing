# Design Document

## Overview

This design document describes the implementation of:
1. A bulk embedding action (`embedAllQA`) in `convex/actions.ts` that processes all Q&A documents in the qa table
2. An automatic embedding action (`autoEmbedQA`) that triggers when new Q&A documents are added or updated

Both actions use Google's gemini-embedding-001 model with appropriate task types and integrate with existing embedding infrastructure (`convex/embeddings.ts`) while adding comprehensive error handling, rate limiting, and progress tracking.

The qa table stores three types of embeddings:
- `embedding_doc`: Document-level embedding (from full content)
- `embedding_qa`: Question-answer pair embedding
- `embedding_fact`: Factual content embedding

## Architecture

### High-Level Flow

#### Bulk Embedding Flow
```
embedAllQA Action
    ↓
Query all QA documents (with filters)
    ↓
Process in batches
    ↓
For each QA document:
    - Validate data
    - Check cache for each embedding type
    - Generate embeddings (doc, qa, fact) if needed
    - Update QA document
    - Track statistics
    ↓
Return comprehensive results
```

#### Automatic Embedding Flow
```
QA Document Insert/Update
    ↓
Trigger autoEmbedQA Action
    ↓
Validate QA document data
    ↓
Check cache for each embedding type
    ↓
Generate embeddings (doc, qa, fact) if needed
    ↓
Update QA document with all embeddings
    ↓
Return success/error
```

### Integration Points

1. **Convex Database**: Queries `qa` table, uses existing indexes (by_category, by_question_number, by_section_number)
2. **Embedding Module**: Calls `api.embeddings.embedForTask` with appropriate task types (RETRIEVAL_DOCUMENT, SEMANTIC_SIMILARITY, FACT_VERIFICATION)
3. **Cache Layer**: Uses `api.embeddings.getCachedEmbedding` and `api.embeddings.cacheEmbedding`
4. **QA Mutations**: Updates qa table directly via ctx.db.patch
5. **Actions Module**: Reuses helper functions from existing `actions.ts` (sanitizeContentForEmbedding, getEmbeddingCacheKey)
6. **Vector Indexes**: Supports three vector indexes: by_embedding_doc, by_embedding_qa, by_embedding_fact

## Components and Interfaces

### Main Action: embedAllQA

```typescript
export const embedAllQA = action({
  args: {
    // Filtering options
    categories: v.optional(v.array(v.string())),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
    
    // Processing options
    skipExisting: v.optional(v.boolean()),
    forceReembed: v.optional(v.boolean()),
    embeddingTypes: v.optional(v.array(v.union(
      v.literal("doc"),
      v.literal("qa"),
      v.literal("fact")
    ))),
    
    // Rate limiting options
    batchSize: v.optional(v.number()),
    batchDelayMs: v.optional(v.number()),
    
    // Cache options
    embeddingTtlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Implementation
  }
});
```

### Automatic Embedding Action: autoEmbedQA

```typescript
export const autoEmbedQA = action({
  args: {
    qaId: v.id("qa"),
    embeddingTtlMs: v.optional(v.number()),
    embeddingTypes: v.optional(v.array(v.union(
      v.literal("doc"),
      v.literal("qa"),
      v.literal("fact")
    ))),
  },
  handler: async (ctx, args) => {
    // Implementation
  }
});
```

### Helper Functions

#### 1. QA Document Filtering
```typescript
function filterQADocuments(
  qaDocuments: QADocument[],
  filters: {
    categories?: string[];
    lang?: string;
    skipExisting?: boolean;
    embeddingTypes?: string[];
  }
): QADocument[]
```

Filters QA documents based on:
- Category match (if specified)
- Language match (if specified)
- Existing embeddings for specified types (if skipExisting is true)

#### 2. QA Document Validation
```typescript
function validateQADocument(qaDoc: QADocument): {
  valid: boolean;
  error?: string;
}
```

Validates:
- Question text is non-empty string
- Answer text is non-empty string
- Content text is non-empty string
- Category exists
- Required fields are present

#### 3. Multi-Type Embedding Generation with Cache
```typescript
async function generateOrGetEmbeddings(
  ctx: ActionCtx,
  qaDoc: QADocument,
  embeddingTypes: string[],
  ttlMs: number
): Promise<{
  embedding_doc?: { embedding: number[]; fromCache: boolean };
  embedding_qa?: { embedding: number[]; fromCache: boolean };
  embedding_fact?: { embedding: number[]; fromCache: boolean };
}>
```

Logic:
1. For each embedding type (doc, qa, fact):
   - Compose appropriate text based on type
   - Generate cache key using getEmbeddingCacheKey
   - Check embeddingCache table using api.embeddings.getCachedEmbedding
   - If found and not expired, return cached embedding
   - Otherwise, call `api.embeddings.embedForTask` with appropriate task type
   - Cache the new embedding using api.embeddings.cacheEmbedding
2. Return all embeddings with cache status

#### 4. Batch Processing
```typescript
async function processBatch(
  ctx: ActionCtx,
  batch: QADocument[],
  options: ProcessingOptions
): Promise<BatchResult>
```

Processes a batch of QA documents:
- Validates each QA document
- Generates/retrieves embeddings for specified types (doc, qa, fact)
- Updates QA documents via ctx.db.patch
- Tracks statistics per embedding type
- Handles errors gracefully

#### 5. Progress Logging
```typescript
function logProgress(
  batchIndex: number,
  totalBatches: number,
  processed: number,
  total: number,
  stats: Statistics
): void
```

Logs:
- Current batch number
- Documents processed
- Cache hit rate
- Error count
- Estimated time remaining

## Data Models

### Input Arguments
```typescript
interface EmbedAllQAArgs {
  // Filtering
  categories?: string[];        // Filter by categories
  lang?: string;                // Filter by language
  limit?: number;               // Max documents to process
  
  // Processing
  skipExisting?: boolean;       // Skip docs with embeddings
  forceReembed?: boolean;       // Regenerate all embeddings
  
  // Rate limiting
  batchSize?: number;           // Docs per batch (default: 5)
  batchDelayMs?: number;        // Delay between batches (default: 3000)
  
  // Cache
  embeddingTtlMs?: number;      // Cache TTL (default: 7 days)
}
```

### Return Value
```typescript
interface EmbedAllQAResult {
  // Counts
  totalDocuments: number;       // Total docs in database
  filteredDocuments: number;    // Docs after filtering
  processedDocuments: number;   // Docs successfully processed
  skippedDocuments: number;     // Docs skipped
  failedDocuments: number;      // Docs that failed
  
  // Embeddings
  newEmbeddings: number;        // Newly generated embeddings
  cachedEmbeddings: number;     // Embeddings from cache
  cacheHitRate: number;         // Cache hit percentage
  
  // Updates
  documentsCreated: number;     // New documents inserted
  documentsUpdated: number;     // Existing documents updated
  
  // Errors
  validationErrors: Array<{
    questionNumber?: string;
    question: string;
    error: string;
  }>;
  embeddingErrors: Array<{
    questionNumber?: string;
    question: string;
    error: string;
  }>;
  updateErrors: Array<{
    questionNumber?: string;
    question: string;
    error: string;
  }>;
  
  // Performance
  totalBatches: number;
  processingTimeMs: number;
  averageTimePerDocument: number;
  
  // Configuration
  config: {
    batchSize: number;
    batchDelayMs: number;
    embeddingTtlMs: number;
    filters: {
      categories?: string[];
      lang?: string;
      limit?: number;
    };
  };
}
```

### QA Document Type
```typescript
interface QADocument {
  _id: Id<"qa">;
  question: string;
  answer: string;
  content: string;
  searchable_text?: string;
  category: string;
  lang?: string;
  question_number?: string;
  section_number?: string;
  section_title?: string;
  section_id?: string;
  source_id?: string;
  keywords?: string[];
  question_lower?: string;
  keywords_searchable?: string;
  category_searchable?: string;
  has_sources?: boolean;
  answer_length?: number;
  metadata_created_at?: string;
  metadata_updated_at?: string;
  sources?: Array<{
    type?: string;
    title?: string;
    url?: string;
    location?: string;
    note?: string;
  }>;
  embedding_doc: number[];
  embedding_qa?: number[];
  embedding_fact?: number[];
  createdAt: number;
  updatedAt: number;
}
```

## Error Handling

### Error Categories

1. **Validation Errors**
   - Missing question or answer
   - Empty strings after trimming
   - Invalid data types
   - Action: Skip document, log error, continue

2. **Embedding Generation Errors**
   - API key missing
   - Rate limit exceeded
   - Network errors
   - Invalid response
   - Action: Retry with exponential backoff (3 attempts), then skip

3. **Cache Errors**
   - Cache read failure
   - Cache write failure
   - Action: Log warning, continue without cache

4. **Database Errors**
   - Query failure
   - Mutation failure
   - Action: Retry once, then fail document

5. **Dimension Validation Errors**
   - Embedding dimension mismatch
   - Action: Skip document, log error

### Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: 3;
  baseDelayMs: 1000;
  maxDelayMs: 10000;
  backoffMultiplier: 2;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  errorContext: string
): Promise<T>
```

Exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 1000ms delay
- Attempt 3: 2000ms delay

## Rate Limiting Strategy

### Batch Processing
- Default batch size: 5 documents
- Default delay between batches: 3000ms
- Configurable via action arguments

### API Call Throttling
- Reuse existing `generateEmbedding` function from `lib/ai/gemini`
- Relies on simple rate limiting in that function
- No additional throttling needed at action level

### Cache-First Approach
- Always check cache before API call
- Reduces API calls by 50-80% on re-runs
- Updates access tracking for cache hits

## Testing Strategy

### Unit Tests (Optional)
- Test helper functions in isolation
- Mock Convex context and API calls
- Validate filtering logic
- Validate error handling

### Integration Tests
1. **Small Dataset Test**
   - Process 10 documents
   - Verify all embeddings generated
   - Check cache population

2. **Cache Hit Test**
   - Run action twice on same data
   - Verify second run uses cache
   - Check cache hit rate > 90%

3. **Filtering Test**
   - Test category filter
   - Test language filter
   - Test limit parameter
   - Test skipExisting flag

4. **Error Recovery Test**
   - Inject invalid documents
   - Verify action continues
   - Check error reporting

5. **Rate Limiting Test**
   - Process 50+ documents
   - Verify batch delays
   - Check no rate limit errors

### Manual Testing
1. Run on production-like dataset
2. Monitor Convex dashboard for:
   - Function execution time
   - Database operations
   - Error rates
3. Verify embeddings in database
4. Test vector search with new embeddings

## Performance Considerations

### Optimization Strategies

1. **Parallel Processing Within Batches**
   - Use `Promise.all()` for batch processing
   - Generate embeddings in parallel (respecting batch size)
   - Reduces total processing time

2. **Efficient Database Queries**
   - Use indexes for filtering (by_category, by_question_number)
   - Fetch all documents once at start
   - Avoid repeated queries

3. **Cache Optimization**
   - Check cache before any API call
   - Batch cache updates
   - Use efficient hash function for cache keys

4. **Memory Management**
   - Process in batches to avoid memory issues
   - Don't load all embeddings into memory at once
   - Stream results when possible

### Expected Performance

For 1000 documents:
- With 0% cache hit: ~10-15 minutes (with rate limiting)
- With 50% cache hit: ~5-8 minutes
- With 90% cache hit: ~2-3 minutes

Batch size 5, delay 3000ms:
- 200 batches for 1000 documents
- ~10 minutes in delays alone
- Plus API call time (~1-2s per embedding)

## Security Considerations

1. **API Key Protection**
   - API key stored in environment variable
   - Never logged or returned in results
   - Validated at action start

2. **Input Validation**
   - Validate all input parameters
   - Sanitize strings before embedding
   - Limit array sizes to prevent DoS

3. **Rate Limiting**
   - Respect Gemini API rate limits
   - Prevent abuse with batch delays
   - Monitor for unusual patterns

4. **Data Privacy**
   - Don't log full question/answer text
   - Only log identifiers in errors
   - Cache keys are hashed

## Monitoring and Observability

### Logging Strategy

1. **Start of Action**
   ```
   Starting bulk embedding: {totalDocs} documents, {batches} batches
   Filters: categories={categories}, lang={lang}, limit={limit}
   Config: batchSize={batchSize}, delay={delay}ms
   ```

2. **Batch Progress**
   ```
   Batch {current}/{total}: Processed {processed} docs
   Cache hits: {cacheHits}/{processed} ({hitRate}%)
   Errors: {errors}
   ```

3. **Completion**
   ```
   Bulk embedding complete:
   - Processed: {processed}/{total}
   - New embeddings: {new}
   - Cache hits: {cached} ({hitRate}%)
   - Errors: {errors}
   - Time: {time}ms ({avgTime}ms/doc)
   ```

### Metrics to Track

1. **Success Metrics**
   - Documents processed
   - Cache hit rate
   - Processing time
   - Embeddings generated

2. **Error Metrics**
   - Validation errors
   - Embedding errors
   - Database errors
   - Error rate by category

3. **Performance Metrics**
   - Average time per document
   - Batch processing time
   - API call latency
   - Cache lookup time

## Deployment Considerations

### Environment Variables
```
GOOGLE_API_KEY=<gemini-api-key>
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIM=768
```

### Convex Configuration
- Ensure action timeout is sufficient (default 10 minutes may not be enough)
- Consider increasing to 30 minutes for large datasets
- Monitor function execution limits

### Running the Action

#### Via Convex Dashboard
```
npx convex run actions:embedAllQA
```

#### With Filters
```
npx convex run actions:embedAllQA \
  --categories '["Carbon Markets", "Sustainability"]' \
  --lang vi \
  --limit 100
```

#### Force Re-embed
```
npx convex run actions:embedAllQA \
  --forceReembed true \
  --batchSize 3 \
  --batchDelayMs 5000
```

### Scheduling (Future Enhancement)
- Consider Convex scheduled functions for periodic re-embedding
- Run nightly to catch new documents
- Use skipExisting flag for incremental updates

## Future Enhancements

1. **Progress Streaming**
   - Stream progress updates to client
   - Real-time dashboard for monitoring
   - WebSocket or polling for status

2. **Selective Re-embedding**
   - Re-embed only documents with outdated embeddings
   - Track embedding version/model
   - Automatic migration on model updates

3. **Parallel Execution**
   - Split work across multiple action invocations
   - Process different categories in parallel
   - Coordinate via database flags

4. **Advanced Error Recovery**
   - Automatic retry of failed documents
   - Dead letter queue for persistent failures
   - Alert on high error rates

5. **Performance Optimization**
   - Batch API calls to Gemini (if supported)
   - Optimize cache key generation
   - Compress embeddings for storage

6. **Analytics**
   - Track embedding quality metrics
   - Compare cache hit rates over time
   - Identify problematic documents
