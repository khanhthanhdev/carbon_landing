# Design Document

## Overview

The hybrid search system combines vector-based semantic search with full-text keyword search to provide users with the most relevant results. Additionally, it includes a Retrieval Augmented Generation (RAG) chatbot that uses search results as context to generate intelligent answers with precise source citations.

The architecture leverages existing Convex infrastructure (vector indexes, full-text search indexes) and Google Gemini for embeddings and answer generation, integrating with the Next.js frontend using TanStack Query for efficient data fetching and caching.

The system uses a three-tier architecture:
1. **Frontend Layer**: Next.js pages and React components with TanStack Query
2. **Backend Layer**: Convex actions, queries, and mutations
3. **AI Layer**: Google Gemini for embeddings, RAG-based answer generation with citations

## Architecture

### High-Level Flow

#### Search Flow
```
User Input → Search Page → TanStack Query → Convex Action (hybridSearch)
                                                    ↓
                                    Check Cache → Cache Hit? → Return Cached Results
                                                    ↓ No
                                    Generate Query Embedding (Gemini)
                                                    ↓
                            Parallel Execution: Vector Search + Full-Text Search
                                                    ↓
                                    Merge Results (RRF Algorithm)
                                                    ↓
                                    Cache Results → Return to Client
                                                    ↓
                                    Log Analytics
```

#### RAG Chatbot Flow
```
User Question → AI Chat Dialog → Convex Action (askAI)
                                        ↓
                        Generate Query Embedding (Gemini)
                                        ↓
                        Vector Search (Top 5 relevant Q&As)
                                        ↓
                        Build Context with Source Markers
                                        ↓
                        Generate Answer with Gemini (gemini-2.5-flash-lite)
                                        ↓
                        Parse Citations from Answer
                                        ↓
                        Return Answer + Source References
                                        ↓
                        Save Conversation History
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  SearchPage (/[locale]/search)                              │
│    ├── SearchBar (input + controls)                         │
│    ├── SearchFilters (category, type selector)              │
│    ├── SearchResults (result cards)                         │
│    └── SearchSkeleton (loading state)                       │
│                                                              │
│  AI Chat Dialog (existing: ai-assistant-dialog.tsx)         │
│    ├── ChatInterface (message list)                         │
│    ├── MessageBubble (with citations)                       │
│    ├── SourceCitation (clickable references)                │
│    └── ChatInput (question input)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓ TanStack Query
┌─────────────────────────────────────────────────────────────┐
│                  Custom Hooks (React)                        │
├─────────────────────────────────────────────────────────────┤
│  useSearch(query, type, filters)                            │
│  useCategories()                                             │
│  usePrefetchSearch()                                         │
│  useAIChat(sessionId)                                        │
│  useAskAI(question)                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓ Convex Client
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Convex)                           │
├─────────────────────────────────────────────────────────────┤
│  Actions:                                                    │
│    ├── hybridSearch (main search orchestrator)              │
│    ├── askAI (RAG-based answer generation)                  │
│    └── generateEmbedding (query embedding)                  │
│                                                              │
│  Queries:                                                    │
│    ├── vectorSearch (semantic search)                       │
│    ├── fullTextSearch (keyword search)                      │
│    ├── getCachedSearchResults                               │
│    ├── getCategories                                         │
│    └── getConversation (chat history)                       │
│                                                              │
│  Mutations:                                                  │
│    ├── cacheSearchResults                                   │
│    ├── logSearchAnalytics                                   │
│    ├── clearExpiredCache                                    │
│    └── saveConversationMessage                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
├─────────────────────────────────────────────────────────────┤
│  Google Gemini API                                           │
│    ├── gemini-embedding-001 (query embeddings)              │
│    ├── gemini-2.5-flash-lite (answer generation)            │
│    └── Embedding cache (convex embeddingCache table)        │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Convex Actions

#### `hybridSearch` Action

**Purpose**: Main orchestrator for hybrid search combining vector and full-text search.

**Input Interface**:
```typescript
{
  query: string;              // User search query
  category?: string;          // Optional category filter
  lang?: string;              // Optional language filter ("vi" | "en")
  topK?: number;              // Number of results (default: 10, max: 50)
  alpha?: number;             // Vector weight 0-1 (default: 0.6)
  searchType?: "hybrid" | "vector" | "fulltext"; // Search mode
}
```

**Output Interface**:
```typescript
{
  results: Array<{
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
    hybridScore: number;      // Combined RRF score
    vectorScore?: number;     // Original vector similarity
    textScore?: number;       // Original text search score
    reasons: string[];        // ["vector", "fts"] - which searches matched
  }>;
  metadata: {
    totalResults: number;
    searchType: string;
    usedCache: boolean;
    latencyMs: number;
    usedVector: boolean;
    usedFullText: boolean;
  };
}
```

**Algorithm**:
1. Generate query hash from (query + filters + locale)
2. Check cache using `getCachedSearchResults`
3. If cache hit and not expired, return cached results
4. Generate query embedding using Gemini with taskType "RETRIEVAL_QUERY"
5. Execute vector and full-text searches in parallel
6. Apply RRF merging algorithm
7. Cache results using `cacheSearchResults`
8. Log analytics using `logSearchAnalytics`
9. Return merged results with metadata

#### `askAI` Action (RAG with Citations)

**Purpose**: Generate intelligent answers using RAG with precise source citations.

**Input Interface**:
```typescript
{
  question: string;           // User's question
  sessionId: string;          // Conversation session ID
  locale?: string;            // Language preference
  maxSources?: number;        // Max context sources (default: 5)
}
```

**Output Interface**:
```typescript
{
  answer: string;             // Generated answer with inline citations
  sources: Array<{
    id: string;               // Question ID
    questionNumber: string;   // e.g., "Q1.2.3"
    question: string;
    answer: string;
    category: string;
    relevanceScore: number;   // Vector similarity score
    citedSentences?: string[]; // Specific sentences cited
  }>;
  conversationId: string;
  metadata: {
    sourcesUsed: number;
    generationTimeMs: number;
    tokensUsed?: number;
  };
}
```

**Algorithm**:
1. Generate query embedding for the question
2. Perform vector search to retrieve top N relevant Q&As (default: 5)
3. Build context string with numbered source markers:
   ```
   [Source 1 - Q1.2.3]
   Question: What is carbon credit?
   Answer: A carbon credit represents...
   
   [Source 2 - Q2.1.5]
   Question: How are carbon credits traded?
   Answer: Carbon credits are traded through...
   ```
4. Create system prompt instructing Gemini to:
   - Answer based only on provided context
   - Use inline citations like [Source 1] or [Q1.2.3]
   - Quote specific sentences when referencing sources
   - Admit when information is not in context
5. Call Gemini gemini-2.5-flash-lite with context + question
6. Parse generated answer to extract citation markers
7. Map citations back to source Q&As
8. Extract cited sentences from source answers
9. Save conversation message with question, answer, and sources
10. Return answer with enriched source metadata

**Citation Format in Answer**:
```
Carbon credits are tradable certificates representing one ton of CO2 
equivalent emissions reduced or removed [Source 1, Q1.2.3]. They can 
be traded on voluntary or compliance markets [Source 2, Q2.1.5]. 
According to the Paris Agreement, "countries must establish transparent 
systems for tracking carbon credits" [Source 3, Q3.4.1].
```

**System Prompt Template**:
```
You are an expert assistant on carbon markets and sustainability. 
Answer the user's question using ONLY the information provided in the 
context below. 

IMPORTANT CITATION RULES:
1. Always cite your sources using [Source N] or [QX.Y.Z] format
2. When quoting directly, use quotation marks and cite the source
3. If the context doesn't contain enough information, clearly state this
4. Provide specific, actionable answers
5. Cite multiple sources when combining information

CONTEXT:
{context_with_numbered_sources}

USER QUESTION:
{user_question}

Provide a comprehensive answer with proper citations.
```

### 2. Convex Queries

#### `vectorSearch` Query

**Purpose**: Perform semantic search using vector embeddings.

**Input Interface**:
```typescript
{
  embedding: number[];        // 768-dimensional query embedding
  category?: string;
  lang?: string;
  limit?: number;             // Default: 20
}
```

**Implementation**:
- Uses `questions` table with `byEmbedding` vector index
- Filters by category and lang if provided
- Returns documents with similarity scores

#### `fullTextSearch` Query

**Purpose**: Perform keyword-based search using Convex full-text search.

**Input Interface**:
```typescript
{
  query: string;
  category?: string;
  lang?: string;
  limit?: number;             // Default: 20
}
```

**Implementation**:
- Uses `questions` table with `search_by_text` search index
- Falls back to `search_by_keywords` if no results
- Filters by category_searchable and section_number
- Returns documents with text match scores

#### `getCachedSearchResults` Query

**Purpose**: Retrieve cached search results if available and not expired.

**Input Interface**:
```typescript
{
  queryHash: string;
  locale: string;
}
```

**Output**: Cached search record or null if not found/expired

### 3. Convex Mutations

#### `cacheSearchResults` Mutation

**Purpose**: Store search results in cache for future use.

**Input Interface**:
```typescript
{
  queryHash: string;
  locale: string;
  questionIds: Id<"questions">[];
  queryText?: string;
  scores?: number[];
  embedding?: number[];
  filters?: {
    category?: string;
    section?: string;
    locale?: string;
  };
  ttlMs?: number;             // Default: 300000 (5 minutes)
}
```

**Logic**:
- Check if cache entry exists for queryHash + locale
- If exists, update with new data and extend expiration
- If not exists, create new cache entry
- Set expiresAt = now + ttlMs

#### `logSearchAnalytics` Mutation

**Purpose**: Log search query and performance metrics.

**Input Interface**:
```typescript
{
  query: string;
  locale: string;
  category?: string;
  searchType: string;
  resultCount: number;
  latencyMs: number;
  usedVector: boolean;
  usedFullText: boolean;
  usedCache: boolean;
  error?: string;
  ipHash?: string;
}
```

**Storage**: Creates new document in `searchAnalytics` table (to be added to schema)

### 4. Frontend Components

#### `SearchPage` Component

**Location**: `app/[locale]/search/page.tsx`

**Responsibilities**:
- Extract query parameters from URL
- Manage search state (query, filters, search type)
- Coordinate between SearchBar, SearchFilters, and SearchResults
- Handle URL updates when filters change

**State Management**:
```typescript
{
  query: string;
  searchType: "hybrid" | "vector" | "fulltext";
  selectedCategory?: string;
  alpha: number;              // For advanced users
}
```

#### `SearchBar` Component

**Location**: `components/search/SearchBar.tsx`

**Props**:
```typescript
{
  initialQuery?: string;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
}
```

**Features**:
- Debounced input (300ms)
- Search suggestions (future enhancement)
- Keyboard shortcuts (Enter to search)
- Clear button when query exists

#### `SearchFilters` Component

**Location**: `components/search/SearchFilters.tsx`

**Props**:
```typescript
{
  categories: string[];
  selectedCategory?: string;
  onCategoryChange: (category?: string) => void;
  searchType: "hybrid" | "vector" | "fulltext";
  onSearchTypeChange: (type: string) => void;
}
```

**Layout**:
- Sidebar on desktop (sticky)
- Collapsible drawer on mobile
- Category list with counts
- Search type tabs/radio buttons
- Clear filters button

#### `SearchResults` Component

**Location**: `components/search/SearchResults.tsx`

**Props**:
```typescript
{
  results: SearchResult[];
  query: string;
  isLoading: boolean;
  error?: Error;
  metadata?: SearchMetadata;
}
```

**Features**:
- Result cards with expand/collapse
- Source links with external icon
- Category badges
- Relevance score display
- Empty state with suggestions
- Error state with retry

#### `ResultCard` Component

**Location**: `components/search/ResultCard.tsx`

**Props**:
```typescript
{
  result: SearchResult;
  expanded?: boolean;
  onToggle?: () => void;
}
```

**Layout**:
- Question as heading
- Category badge + score
- Answer preview (3 lines) or full answer
- Sources section (if available)
- Expand/collapse button

### 5. Custom Hooks

#### `useSearch` Hook

**Location**: `hooks/useSearch.ts`

**Interface**:
```typescript
function useSearch(
  query: string,
  searchType: SearchType,
  filters?: SearchFilters
): {
  data?: SearchResponse;
  isLoading: boolean;
  error?: Error;
  refetch: () => void;
}
```

**Implementation**:
- Uses TanStack Query with key: `["search", searchType, query, filters]`
- Calls Convex `hybridSearch` action
- Enabled only when query.length >= 2
- Stale time: 5 minutes
- Cache time: 30 minutes

#### `useCategories` Hook

**Location**: `hooks/useSearch.ts`

**Interface**:
```typescript
function useCategories(): {
  data?: string[];
  isLoading: boolean;
}
```

**Implementation**:
- Uses TanStack Query with key: `["categories"]`
- Calls Convex query to get unique categories
- Stale time: Infinity (categories rarely change)

## Data Models

### Search Cache Schema (existing in `searchCache` table)

```typescript
{
  queryHash: string;          // SHA-256 hash of query + filters
  locale: string;
  questionIds: Id<"questions">[];
  scores?: number[];          // Hybrid scores for each result
  embedding?: number[];       // Cached query embedding
  queryText?: string;         // Original query for debugging
  filters?: {
    category?: string;
    section?: string;
    locale?: string;
  };
  createdAt: number;
  expiresAt: number;
}
```

**Indexes**:
- `byQueryHash`: [queryHash, locale]
- `byExpiresAt`: [expiresAt]

### Search Analytics Schema (new table to add)

```typescript
searchAnalytics: defineTable({
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
  timestamp: v.number(),
})
  .index("byTimestamp", ["timestamp"])
  .index("byQuery", ["query"])
  .index("byLocale", ["locale"])
```

### Conversation Schema (enhance existing `conversations` table)

```typescript
conversations: defineTable({
  sessionId: v.string(),
  userId: v.optional(v.string()),
  locale: v.string(),
  messages: v.array(v.object({
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
    sources: v.optional(v.array(v.object({
      questionId: v.id("questions"),
      questionNumber: v.string(),
      question: v.string(),
      relevanceScore: v.number(),
      citedSentences: v.optional(v.array(v.string())),
      citationMarkers: v.optional(v.array(v.string())), // e.g., ["[Source 1]", "[Q1.2.3]"]
    }))),
    metadata: v.optional(v.object({
      sourcesUsed: v.number(),
      generationTimeMs: v.number(),
      tokensUsed: v.optional(v.number()),
    })),
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("bySessionId", ["sessionId"])
  .index("byUserId", ["userId"])
  .index("byCreatedAt", ["createdAt"])
```

## Citation Parsing and Extraction

### Citation Marker Patterns

The system recognizes multiple citation formats:

1. **Numbered Source**: `[Source 1]`, `[Source 2]`
2. **Question Number**: `[Q1.2.3]`, `[Q2.1.5]`
3. **Combined**: `[Source 1, Q1.2.3]`

### Citation Extraction Algorithm

```typescript
interface Citation {
  marker: string;           // Original citation text
  sourceIndex?: number;     // Index in sources array (0-based)
  questionNumber?: string;  // Question number if specified
  position: {
    start: number;          // Character position in answer
    end: number;
  };
}

function extractCitations(answer: string): Citation[] {
  const citations: Citation[] = [];
  
  // Regex patterns for different citation formats
  const patterns = [
    /\[Source (\d+)\]/g,
    /\[Q([\d.]+)\]/g,
    /\[Source (\d+),\s*Q([\d.]+)\]/g,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(answer)) !== null) {
      citations.push({
        marker: match[0],
        sourceIndex: match[1] ? parseInt(match[1]) - 1 : undefined,
        questionNumber: match[2] || undefined,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }
  });
  
  return citations.sort((a, b) => a.position.start - b.position.start);
}
```

### Cited Sentence Extraction

When a citation is found, extract the surrounding sentence(s) from the source:

```typescript
function extractCitedSentences(
  answer: string,
  citation: Citation,
  sourceAnswer: string
): string[] {
  // Get the sentence containing the citation
  const sentenceStart = answer.lastIndexOf('.', citation.position.start) + 1;
  const sentenceEnd = answer.indexOf('.', citation.position.end);
  const citingSentence = answer
    .substring(sentenceStart, sentenceEnd + 1)
    .trim()
    .replace(/\[Source \d+\]/g, '')
    .replace(/\[Q[\d.]+\]/g, '');
  
  // Find matching sentences in source answer
  const sourceSentences = sourceAnswer.split(/[.!?]+/).map(s => s.trim());
  const matchedSentences: string[] = [];
  
  // Use fuzzy matching to find relevant sentences
  sourceSentences.forEach(sentence => {
    if (sentence.length < 10) return;
    
    // Calculate similarity (simple word overlap)
    const citingWords = new Set(citingSentence.toLowerCase().split(/\s+/));
    const sourceWords = sentence.toLowerCase().split(/\s+/);
    const overlap = sourceWords.filter(w => citingWords.has(w)).length;
    const similarity = overlap / Math.max(citingWords.size, sourceWords.length);
    
    if (similarity > 0.3) {
      matchedSentences.push(sentence);
    }
  });
  
  return matchedSentences.slice(0, 2); // Return top 2 matches
}
```

### Source Attribution UI

Display sources with citations in the chat interface:

```typescript
interface SourceWithCitations {
  questionNumber: string;
  question: string;
  relevanceScore: number;
  citationMarkers: string[];      // ["[Source 1]", "[Q1.2.3]"]
  citedSentences: string[];       // Actual sentences referenced
  fullAnswer: string;             // Complete answer for reference
}

// UI Component
function SourceCitation({ source }: { source: SourceWithCitations }) {
  return (
    <div className="border-l-4 border-green-500 pl-4 my-2">
      <div className="flex items-center gap-2 mb-1">
        <Badge>{source.questionNumber}</Badge>
        <span className="text-xs text-gray-500">
          Relevance: {(source.relevanceScore * 100).toFixed(0)}%
        </span>
      </div>
      
      <p className="font-medium text-sm mb-2">{source.question}</p>
      
      {source.citedSentences.length > 0 && (
        <div className="bg-gray-50 p-2 rounded text-sm">
          <p className="text-xs text-gray-600 mb-1">Cited excerpts:</p>
          {source.citedSentences.map((sentence, idx) => (
            <p key={idx} className="italic">"{sentence}"</p>
          ))}
        </div>
      )}
      
      <details className="mt-2">
        <summary className="text-xs text-blue-600 cursor-pointer">
          View full answer
        </summary>
        <p className="text-sm mt-2 text-gray-700">{source.fullAnswer}</p>
      </details>
    </div>
  );
}
```

## Reciprocal Rank Fusion (RRF) Algorithm

### Formula

For each document `d`:
```
RRF_score(d) = α × (1 / (k + rank_vector(d))) + (1 - α) × (1 / (k + rank_text(d)))
```

Where:
- `α` (alpha): Weight for vector search (0-1, default 0.6)
- `k`: Constant to prevent division by zero (default 60)
- `rank_vector(d)`: Position of document in vector search results (0-indexed)
- `rank_text(d)`: Position of document in text search results (0-indexed)

### Implementation

```typescript
function mergeWithRRF(
  vectorResults: SearchResult[],
  textResults: SearchResult[],
  alpha: number = 0.6,
  k: number = 60
): SearchResult[] {
  const scoreMap = new Map<string, {
    doc: SearchResult;
    score: number;
    reasons: string[];
  }>();

  // Score vector results
  vectorResults.forEach((doc, index) => {
    const score = alpha * (1 / (k + index));
    scoreMap.set(doc._id, {
      doc,
      score,
      reasons: ["vector"],
    });
  });

  // Add text search scores
  textResults.forEach((doc, index) => {
    const score = (1 - alpha) * (1 / (k + index));
    const existing = scoreMap.get(doc._id);
    
    if (existing) {
      existing.score += score;
      existing.reasons.push("fts");
    } else {
      scoreMap.set(doc._id, {
        doc,
        score,
        reasons: ["fts"],
      });
    }
  });

  // Sort by combined score
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ doc, score, reasons }) => ({
      ...doc,
      hybridScore: score,
      reasons,
    }));
}
```

## Error Handling

### Error Types and Responses

1. **Embedding Generation Failure**
   - Fallback: Use full-text search only
   - Log: Error details + query
   - User message: "Using keyword search (semantic search unavailable)"

2. **Vector Search Failure**
   - Fallback: Use full-text results only
   - Log: Error + query
   - User message: Continue normally (transparent fallback)

3. **Full-Text Search Failure**
   - Fallback: Use vector results only
   - Log: Error + query
   - User message: Continue normally

4. **Both Searches Fail**
   - Response: Error state with retry button
   - Log: Critical error
   - User message: "Search temporarily unavailable. Please try again."

5. **Cache Read/Write Failure**
   - Fallback: Continue without cache
   - Log: Warning
   - User impact: Slightly slower, no data loss

6. **Rate Limit Exceeded**
   - Response: 429 status with retry-after header
   - Fallback: Use cached results if available
   - User message: "Too many requests. Please wait a moment."

### Error Handling Flow

```typescript
try {
  // Try to generate embedding
  embedding = await generateEmbedding(query);
  usedVector = true;
} catch (error) {
  console.error("Embedding failed:", error);
  embedding = null;
  usedVector = false;
  // Continue with full-text only
}

try {
  const [vectorResults, textResults] = await Promise.all([
    embedding ? vectorSearch(embedding, filters) : [],
    fullTextSearch(query, filters),
  ]);
  
  results = mergeWithRRF(vectorResults, textResults, alpha);
} catch (error) {
  // Log and return error response
  await logSearchAnalytics({ ...params, error: error.message });
  throw new ConvexError("Search failed");
}
```

## Testing Strategy

### Unit Tests

1. **RRF Algorithm Tests**
   - Test score calculation with various alpha values
   - Test with overlapping results
   - Test with non-overlapping results
   - Test edge cases (empty arrays, single result)

2. **Query Hash Generation**
   - Test consistent hashing for same inputs
   - Test different hashes for different inputs
   - Test with various filter combinations

3. **Cache TTL Logic**
   - Test expiration calculation
   - Test cache hit/miss logic
   - Test cache update vs insert logic

### Integration Tests

1. **Hybrid Search Flow**
   - Test full search with mocked Gemini API
   - Test cache hit scenario
   - Test cache miss scenario
   - Test with various filters

2. **Fallback Scenarios**
   - Test embedding failure fallback
   - Test vector search failure fallback
   - Test full-text search failure fallback

3. **Analytics Logging**
   - Test successful search logging
   - Test failed search logging
   - Test cache hit logging

### End-to-End Tests

1. **Search Page Flow**
   - User enters query → sees results
   - User applies category filter → sees filtered results
   - User switches search type → sees re-ranked results
   - User expands result card → sees full answer

2. **Performance Tests**
   - Measure search latency (target: <2s uncached, <100ms cached)
   - Test with concurrent users
   - Test cache effectiveness

3. **Accessibility Tests**
   - Keyboard navigation through results
   - Screen reader announcements
   - Focus management
   - ARIA labels validation

## Performance Optimization

### Caching Strategy

1. **Query-Level Caching**
   - Cache key: SHA-256(query + filters + locale)
   - TTL: 5 minutes (configurable)
   - Invalidation: Automatic on expiration

2. **Embedding Caching**
   - Reuse existing `embeddingCache` table
   - Cache key: SHA-256(query text)
   - TTL: 24 hours
   - Reduces Gemini API calls

3. **Client-Side Caching**
   - TanStack Query cache
   - Stale time: 5 minutes
   - GC time: 30 minutes
   - Deduplication of inflight requests

### Query Optimization

1. **Parallel Execution**
   - Run vector and full-text searches concurrently
   - Use Promise.all() for parallel execution

2. **Result Limiting**
   - Fetch 2-3x topK from each search
   - Merge and trim to topK after RRF
   - Reduces over-fetching

3. **Index Utilization**
   - Vector index: `byEmbedding` with category/lang filters
   - Text index: `search_by_text` with category/section filters
   - Ensure indexes are properly configured

### Frontend Optimization

1. **Debouncing**
   - 300ms debounce on search input
   - Prevents excessive API calls

2. **Prefetching**
   - Prefetch categories on page load
   - Prefetch common searches

3. **Lazy Loading**
   - Load result details on expand
   - Virtualize long result lists (future)

4. **Code Splitting**
   - Lazy load search page components
   - Reduce initial bundle size

## Security Considerations

1. **Input Validation**
   - Sanitize search queries (max length, no SQL injection)
   - Validate filter values against allowed categories
   - Rate limit search requests per IP

2. **Cache Security**
   - Hash IP addresses before storing
   - Don't cache sensitive user data
   - Implement cache size limits

3. **API Key Protection**
   - Store Gemini API key in environment variables
   - Never expose in client-side code
   - Rotate keys periodically

4. **Error Messages**
   - Don't expose internal errors to users
   - Log detailed errors server-side
   - Show generic messages client-side

## Monitoring and Observability

### Metrics to Track

1. **Search Performance**
   - Average search latency
   - Cache hit rate
   - Embedding generation time
   - Vector search time
   - Full-text search time

2. **Search Quality**
   - Zero-result queries
   - Most common queries
   - Category distribution
   - Search type usage

3. **System Health**
   - Gemini API error rate
   - Cache size and growth
   - Database query performance
   - Client-side error rate

### Logging Strategy

1. **Structured Logging**
   - Use consistent log format
   - Include correlation IDs
   - Log levels: ERROR, WARN, INFO, DEBUG

2. **Search Analytics**
   - Store in `searchAnalytics` table
   - Queryable by time range
   - Exportable for analysis

3. **Error Tracking**
   - Log all search failures
   - Include query context
   - Track error patterns

## Deployment Considerations

1. **Environment Variables**
   - `GOOGLE_API_KEY`: Gemini API key
   - `NEXT_PUBLIC_CONVEX_URL`: Convex deployment URL
   - `SEARCH_CACHE_TTL_MS`: Cache TTL (default: 300000)
   - `SEARCH_MAX_RESULTS`: Max results per search (default: 50)

2. **Database Migrations**
   - Add `searchAnalytics` table to schema
   - Ensure vector indexes are built
   - Verify search indexes are configured

3. **Gradual Rollout**
   - Deploy backend changes first
   - Test with internal users
   - Monitor error rates
   - Roll out to all users

4. **Rollback Plan**
   - Keep old search endpoint available
   - Feature flag for hybrid search
   - Quick rollback to full-text only if needed
