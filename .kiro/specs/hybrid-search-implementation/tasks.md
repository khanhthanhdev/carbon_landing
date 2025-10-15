# Implementation Plan

- [x] 1. Enhance Convex schema for search analytics and conversations

  - Add `searchAnalytics` table with indexes for timestamp, query, and locale
  - Enhance `conversations` table schema to include citation metadata in messages
  - Add fields for `citedSentences`, `citationMarkers`, and generation metadata
  - _Requirements: 5.1, 5.2, 11.12_

- [ ] 2. Implement core search utilities and helpers

  - [x] 2.1 Create query hash generation utility

    - Write function to generate SHA-256 hash from query + filters + locale
    - _Requirements: 2.1, 2.6_

  - [x] 2.2 Implement RRF (Reciprocal Rank Fusion) algorithm

    - Write `mergeWithRRF` function with configurable alpha and k parameters
    - Handle overlapping and non-overlapping results
    - Add score normalization and sorting logic
    - _Requirements: 1.3, 1.4, 7.1, 7.2, 7.3_

  - [x] 2.3 Create embedding generation wrapper

    - Implement `generateQueryEmbedding` function calling Gemini with RETRIEVAL_QUERY
    - Add embedding cache check before API call
    - Implement error handling with fallback strategy
    - _Requirements: 1.1, 6.2, 6.3_

- [ ] 3. Implement Convex search queries

  - [x] 3.1 Enhance `vectorSearch` query

    - Update to use `qa` table with `byEmbedding` index
    - Add category and lang filter support
    - Return results with similarity scores
    - _Requirements: 1.2, 1.5, 1.6_

  - [x] 3.2 Enhance `fullTextSearch` query

    - Update to use `search_by_text` index on qa table
    - Add fallback to `search_by_keywords` index if no results
    - Apply category and section filters
    - _Requirements: 1.2, 1.5, 1.6_

  - [x] 3.3 Implement `getCachedSearchResults` query

    - Check cache by queryHash and locale

    - Validate cache expiration
    - Update cache access statistics on hit
    - Delete expired cache entries
    - _Requirements: 2.1, 2.2, 2.3, 2.7_

  - [x] 3.4 Create `getCategories` query

    - Extract unique categories from qa table
    - Return sorted category list
    - Cache with infinite stale time
    - _Requirements: 4.1_

- [ ] 4. Implement Convex search mutations

  - [x] 4.1 Create `cacheSearchResults` mutation

    - Accept query hash, locale, question IDs, scores, and filters
    - Check for existing cache entry and update or insert
    - Set expiration time based on configurable TTL
    - Validate scores array length matches question IDs
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ] 4.2 Implement `logSearchAnalytics` mutation

    - Insert search log with query, filters, performance metrics
    - Include search type, result count, latency, and error info
    - Store IP hash if available for rate limiting analysis
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 4.3 Create `clearExpiredCache` mutation
    - Query expired cache entries by expiresAt index
    - Delete in batches with configurable limit
    - Return count of deleted entries
    - _Requirements: 2.7, 8.1_

- [ ] 5. Implement hybrid search action

  - [x] 5.1 Create `hybridSearch` action orchestrator

    - Accept query, filters, search type, and alpha parameters
    - Generate query hash and check cache first
    - Coordinate vector and full-text searches based on search type
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 5.2 Implement parallel search execution

    - Generate query embedding with error handling
    - Execute vector and full-text searches in parallel using Promise.all
    - Handle individual search failures gracefully
    - _Requirements: 1.2, 6.1, 8.1, 8.2, 8.3_

  - [x] 5.3 Integrate RRF merging in hybrid search

    - Call `mergeWithRRF` with vector and text results
    - Apply configurable alpha weight
    - Limit results to topK after merging
    - Add hybrid scores and reasons to results
    - _Requirements: 1.3, 1.4, 7.1, 7.2, 7.3_

  - [ ] 5.4 Add caching and analytics to hybrid search

    - Cache merged results after successful search
    - Log search analytics with performance metrics
    - Return results with metadata (latency, cache hit, search types used)
    - _Requirements: 2.4, 5.1, 5.2, 6.4_

  - [x] 5.5 Implement error handling and fallbacks

    - Fallback to full-text only if embedding fails
    - Continue with available results if one search fails
    - Return clear error if both searches fail
    - Log all errors with context
    - _Requirements: 1.8, 8.1, 8.2, 8.3, 8.4, 8.7_

- [ ] 6. Implement RAG-based AI chatbot with citations

  - [x] 6.1 Create citation extraction utilities

    - Write `extractCitations` function to parse citation markers from text
    - Support multiple formats: [Source N], [QX.Y.Z], combined
    - Return citation objects with marker, index, and position
    - _Requirements: 11.3, 11.11_

  - [x] 6.2 Implement cited sentence extraction

    - Write `extractCitedSentences` function using fuzzy matching
    - Extract sentences from source answers that match cited content
    - Use word overlap similarity algorithm
    - Return top matching sentences
    - _Requirements: 11.6, 11.11, 12.6_

  - [x] 6.3 Create `askAI` action for RAG

    - Generate query embedding for user question
    - Perform vector search to retrieve top 5 relevant Q&As
    - Build context string with numbered source markers
    - _Requirements: 11.1, 11.2_

  - [x] 6.4 Implement answer generation with Gemini

    - Create system prompt instructing proper citation format
    - Call gemini-2.5-flash-lite with context and question
    - Parse generated answer to extract citations
    - Map citations back to source Q&As
    - _Requirements: 11.2, 11.3, 11.8, 12.1_

  - [x] 6.5 Enrich sources with citation metadata

    - Extract cited sentences for each source
    - Calculate relevance scores from vector search
    - Build source objects with question number, text, and citations
    - _Requirements: 11.5, 11.7, 11.10, 12.2_

  - [x] 6.6 Save conversation with citations

    - Call `saveConversationMessage` mutation for user question
    - Save assistant answer with sources and citation metadata
    - Include generation time and token usage in metadata
    - _Requirements: 11.9, 11.12_

- [ ] 7. Implement conversation management

  - [x] 7.1 Create `getConversation` query

    - Retrieve conversation by sessionId
    - Return messages with sources and metadata
    - _Requirements: 11.9_

  - [x] 7.2 Implement `saveConversationMessage` mutation

    - Accept sessionId, role, content, sources, and metadata
    - Create new conversation if doesn't exist
    - Append message to existing conversation
    - Update conversation updatedAt timestamp
    - _Requirements: 11.12_

- [ ] 8. Create React hooks for search and AI chat

  - [x] 8.1 Implement `useSearch` hook

    - Use TanStack Query with key based on query, type, and filters
    - Call Convex `hybridSearch` action
    - Enable only when query length >= 2
    - Configure stale time (5 min) and cache time (30 min)
    - _Requirements: 3.1, 6.6, 6.7_

  - [x] 8.2 Create `useCategories` hook

    - Use TanStack Query with infinite stale time
    - Call Convex `getCategories` query
    - _Requirements: 4.1, 6.8_

  - [x] 8.3 Implement `useAIChat` hook

    - Manage conversation state with sessionId
    - Fetch conversation history with `getConversation`
    - Provide `sendMessage` mutation function
    - Handle loading and error states
    - _Requirements: 11.9_

  - [ ] 8.4 Create `usePrefetchSearch` hook
    - Prefetch search results for hover/focus events
    - Use TanStack Query prefetch API
    - _Requirements: 6.8_

- [ ] 9. Build search page UI components

  - [x] 9.1 Create SearchPage component

    - Extract query parameters from URL
    - Manage search state (query, type, filters)
    - Coordinate SearchBar, SearchFilters, and SearchResults
    - Update URL when filters change
    - _Requirements: 3.1, 3.2, 4.6_

  - [x] 9.2 Implement SearchBar component

    - Accept initialQuery and onSearch props
    - Implement debounced input (300ms)
    - Add keyboard shortcuts (Enter to search)
    - Show clear button when query exists
    - _Requirements: 3.1, 6.7, 9.3_

  - [x] 9.3 Create SearchFilters component

    - Display category list in sidebar (desktop) or drawer (mobile)
    - Show search type tabs (hybrid/vector/fulltext)
    - Highlight selected filters
    - Add "Clear filters" button when filters active
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 9.4 Build SearchResults component

    - Display results in card format
    - Show loading skeleton during fetch
    - Display empty state with helpful message
    - Show error state with retry button
    - Display result count and search metadata
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 4.8_

  - [x] 9.5 Implement ResultCard component

    - Show question as heading with category badge
    - Display answer preview (3 lines) with expand/collapse
    - Display sources with external link icons
    - Add expand button to show full answer
    - _Requirements: 3.2, 3.5, 7.5, 7.6, 7.7_

- [ ] 10. Enhance AI chat dialog with citations

  - [x] 10.1 Update ChatInterface component

    - Integrate with `useAIChat` hook
    - Display messages with MessageBubble components
    - Show loading indicator during answer generation
    - Auto-scroll to latest message
    - _Requirements: 11.9_

  - [x] 10.2 Create MessageBubble component with citations

    - Display user and assistant messages differently
    - Render inline citations as clickable badges
    - Show source references below assistant messages
    - _Requirements: 11.3, 11.4_

  - [x] 10.3 Implement SourceCitation component


    - Display question number badge and
    - Show question text and cited sentences
    - Add expandable section for full answer
    - Make citations clickable to highlight in answer

    - _Requirements: 11.5, 11.6, 11.7, 11.10, 12.2, 12.3_

  - [x] 10.4 Add citation highlighting in answers




    - Parse citation markers in answer text
    - Render citations as interactive badges
    - Highlight corresponding source when citation clicked
    - _Requirements: 11.3, 11.4_

- [ ] 11. Implement mobile-responsive design

  - [ ] 11.1 Make search page mobile-friendly

    - Use single-column layout for results on mobile
    - Show filters in collapsible drawer
    - Optimize touch targets for mobile
    - _Requirements: 9.1, 9.2, 9.4_

  - [ ] 11.2 Optimize chat interface for mobile
    - Adjust message bubble sizes for mobile screens
    - Make source citations touch-friendly
    - Ensure keyboard doesn't obscure input
    - _Requirements: 9.3, 9.5, 9.7_

- [ ] 12. Add accessibility features

  - [ ] 12.1 Implement keyboard navigation

    - Support Tab navigation through all interactive elements
    - Add Enter key support for search and actions
    - Show clear focus indicators
    - _Requirements: 10.1, 10.6_

  - [ ] 12.2 Add ARIA labels and announcements

    - Add ARIA labels to all form controls
    - Announce result count to screen readers
    - Announce filter changes
    - Announce errors
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.8_

  - [ ] 12.3 Ensure color contrast compliance
    - Verify all text meets WCAG AA contrast ratios
    - Test with color blindness simulators
    - _Requirements: 10.7_

- [ ] 13. Implement performance optimizations

  - [ ] 13.1 Add client-side caching with TanStack Query

    - Configure stale time and cache time for queries
    - Enable request deduplication
    - Implement prefetching for common searches
    - _Requirements: 6.6, 6.8_

  - [ ] 13.2 Optimize embedding cache usage

    - Check embedding cache before Gemini API calls
    - Store embeddings with 24-hour TTL
    - Implement cache warming for common queries
    - _Requirements: 6.2, 6.3_

  - [ ] 13.3 Add search result caching
    - Cache search results for 5 minutes
    - Serve cached results in <100ms
    - Implement cache invalidation strategy
    - _Requirements: 6.4, 6.5_

- [ ] 14. Add error handling and resilience

  - [ ] 14.1 Implement graceful degradation

    - Fallback to full-text search if vector search fails
    - Show partial results if one search succeeds
    - Display offline indicator when network unavailable
    - _Requirements: 8.1, 8.2, 8.3, 8.8_

  - [ ] 14.2 Add retry logic with exponential backoff

    - Implement retry for rate-limited requests
    - Add exponential backoff for API failures
    - Queue requests during rate limiting
    - _Requirements: 8.5_

  - [ ] 14.3 Implement comprehensive error logging
    - Log all search failures with context
    - Track error patterns in analytics
    - Alert on critical error spikes
    - _Requirements: 5.3, 8.6, 8.7_

- [ ] 15. Testing and validation

  - [ ]\* 15.1 Write unit tests for core utilities

    - Test RRF algorithm with various inputs
    - Test query hash generation consistency
    - Test citation extraction and parsing
    - Test cited sentence matching algorithm
    - _Requirements: 1.3, 11.3, 11.11_

  - [ ]\* 15.2 Write integration tests for search flow

    - Test hybrid search with mocked Gemini API
    - Test cache hit and miss scenarios
    - Test fallback mechanisms
    - Test analytics logging
    - _Requirements: 1.1-1.8, 2.1-2.8_

  - [ ]\* 15.3 Write integration tests for RAG chatbot

    - Test askAI action with mocked Gemini
    - Test citation extraction and mapping
    - Test conversation persistence
    - Test source attribution
    - _Requirements: 11.1-11.12_

  - [ ]\* 15.4 Perform E2E testing
    - Test complete search flow from input to results
    - Test filter application and URL updates
    - Test AI chat with citation display
    - Test mobile responsiveness
    - Test accessibility with screen readers
    - _Requirements: 3.1-3.8, 9.1-9.7, 10.1-10.8_

- [ ] 16. Documentation and deployment

  - [ ] 16.1 Update API documentation

    - Document hybridSearch action interface
    - Document askAI action interface
    - Document citation format and parsing
    - Add usage examples
    - _Requirements: All_

  - [ ] 16.2 Create user guide

    - Document search features and filters
    - Explain AI chat and citations
    - Add troubleshooting section
    - _Requirements: All_

  - [ ] 16.3 Deploy and monitor
    - Deploy schema changes to Convex
    - Deploy frontend changes to production
    - Monitor search analytics and error rates
    - Set up alerts for critical issues
    - _Requirements: All_
