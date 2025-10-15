# Requirements Document

## Introduction

This feature implements a comprehensive hybrid search system for the Carbon Market Knowledge Base that combines vector-based semantic search with full-text keyword search. The system will allow users to search through Q&A content using natural language queries and receive relevant results ranked using Reciprocal Rank Fusion (RRF). The search will support filtering by category, caching for performance, and provide a responsive user interface with real-time results.

The current system has basic search infrastructure with vector indexes and full-text search indexes in Convex, but lacks the hybrid search implementation, proper result ranking, caching strategy, and a complete user interface for search results.

## Requirements

### Requirement 1: Hybrid Search Backend Implementation

**User Story:** As a developer, I want to implement a hybrid search system that combines vector and full-text search, so that users get the most relevant results regardless of whether they use exact keywords or semantic queries.

#### Acceptance Criteria

1. WHEN a search query is submitted THEN the system SHALL generate a query embedding using Google Gemini with taskType "RETRIEVAL_QUERY"
2. WHEN embeddings are generated THEN the system SHALL perform both vector search and full-text search in parallel
3. WHEN both search results are returned THEN the system SHALL merge results using Reciprocal Rank Fusion (RRF) with configurable k constant (default 60)
4. WHEN merging results THEN the system SHALL support configurable alpha weight (0-1) to balance vector vs full-text importance (default 0.6 for vector)
5. IF category filter is provided THEN the system SHALL apply it to both vector and full-text searches
6. IF language filter is provided THEN the system SHALL apply it to both search indexes
7. WHEN search completes THEN the system SHALL return results with hybrid scores and source attribution
8. IF embedding generation fails THEN the system SHALL fallback to full-text search only and log the error

### Requirement 2: Search Caching System

**User Story:** As a system administrator, I want search results to be cached efficiently, so that repeated queries are served quickly and API costs are minimized.

#### Acceptance Criteria

1. WHEN a search is performed THEN the system SHALL check for cached results using query hash and locale
2. IF cached results exist AND cache is not expired THEN the system SHALL return cached results without re-executing search
3. WHEN cache is hit THEN the system SHALL update cache access statistics
4. WHEN new search results are generated THEN the system SHALL cache them with configurable TTL (default 5 minutes)
5. WHEN caching results THEN the system SHALL store query text, embedding, filters, scores, and question IDs
6. WHEN cache entry already exists THEN the system SHALL update it instead of creating duplicate
7. IF cache is expired THEN the system SHALL delete the entry and execute fresh search
8. WHEN system runs cleanup THEN the system SHALL remove expired cache entries in batches

### Requirement 3: Search Results Page UI

**User Story:** As a user, I want to see search results in a clean, organized interface with filtering options, so that I can quickly find the information I need.

#### Acceptance Criteria

1. WHEN user navigates to search page THEN the system SHALL display search bar pre-filled with query parameter
2. WHEN search results load THEN the system SHALL display them in card format with question, answer preview, category, and sources
3. WHEN results are loading THEN the system SHALL show loading skeleton UI
4. IF no results found THEN the system SHALL display helpful message suggesting alternative actions
5. WHEN user clicks on result card THEN the system SHALL expand to show full answer
6. WHEN results are displayed THEN the system SHALL show result count and search type indicator
7. WHEN user changes search type (hybrid/vector/fulltext) THEN the system SHALL re-execute search with new type
8. IF search fails THEN the system SHALL display error message with retry option

### Requirement 4: Search Filters and Controls

**User Story:** As a user, I want to filter search results by category and adjust search parameters, so that I can narrow down results to specific topics.

#### Acceptance Criteria

1. WHEN search page loads THEN the system SHALL display available categories in sidebar filter
2. WHEN user selects category filter THEN the system SHALL re-execute search with category constraint
3. WHEN category filter is active THEN the system SHALL highlight selected category
4. WHEN user clears category filter THEN the system SHALL show all results again
5. WHEN user switches between search types (tabs) THEN the system SHALL maintain current filters
6. WHEN filters change THEN the system SHALL update URL query parameters for shareability
7. IF user has active filters THEN the system SHALL show "Clear filters" button
8. WHEN search completes THEN the system SHALL display search metadata (time taken, result count)

### Requirement 5: Search Analytics and Logging

**User Story:** As a product manager, I want to track search queries and performance metrics, so that I can understand user behavior and optimize the search experience.

#### Acceptance Criteria

1. WHEN search is executed THEN the system SHALL log query text, locale, filters, and timestamp
2. WHEN search completes THEN the system SHALL log result count, latency, and search types used
3. IF search fails THEN the system SHALL log error details and query context
4. WHEN logging search THEN the system SHALL include whether vector search was used
5. WHEN logging search THEN the system SHALL include whether full-text search was used
6. IF available THEN the system SHALL log IP hash for rate limiting analysis
7. WHEN analytics are stored THEN the system SHALL use efficient indexing for time-based queries
8. WHEN system needs cleanup THEN the system SHALL provide mutation to archive old analytics

### Requirement 6: Search Performance Optimization

**User Story:** As a user, I want search results to load quickly, so that I can find information without waiting.

#### Acceptance Criteria

1. WHEN search is initiated THEN the system SHALL execute vector and full-text searches in parallel
2. WHEN generating embeddings THEN the system SHALL check embedding cache first
3. IF embedding is cached THEN the system SHALL reuse it instead of calling Gemini API
4. WHEN search results are cached THEN the system SHALL serve them in under 100ms
5. WHEN search is uncached THEN the system SHALL complete in under 2 seconds for typical queries
6. WHEN multiple searches occur THEN the system SHALL use TanStack Query for client-side deduplication
7. WHEN user types in search bar THEN the system SHALL debounce input to avoid excessive queries
8. WHEN search page loads THEN the system SHALL prefetch common categories for instant filtering

### Requirement 7: Search Result Quality

**User Story:** As a user, I want search results to be relevant and well-ranked, so that the most useful information appears first.

#### Acceptance Criteria

1. WHEN results are ranked THEN the system SHALL use RRF to combine vector and full-text scores
2. WHEN vector search is weighted higher (alpha > 0.5) THEN semantic matches SHALL rank higher
3. WHEN full-text search is weighted higher (alpha < 0.5) THEN keyword matches SHALL rank higher
4. WHEN results have equal RRF scores THEN the system SHALL use secondary sorting by sequence number
5. WHEN displaying results THEN the system SHALL show relevance score as percentage
6. WHEN result has sources THEN the system SHALL display them with external link icons
7. WHEN answer is long THEN the system SHALL show preview with "Show more" expansion
8. WHEN user expands answer THEN the system SHALL render full content with proper formatting

### Requirement 8: Search Error Handling and Resilience

**User Story:** As a user, I want the search to work reliably even when some components fail, so that I can always find information.

#### Acceptance Criteria

1. IF Gemini API is unavailable THEN the system SHALL fallback to full-text search only
2. IF vector search fails THEN the system SHALL continue with full-text results
3. IF full-text search fails THEN the system SHALL continue with vector results
4. IF both searches fail THEN the system SHALL display clear error message with retry button
5. WHEN API rate limit is hit THEN the system SHALL queue request with exponential backoff
6. IF cache read fails THEN the system SHALL execute fresh search without blocking
7. IF cache write fails THEN the system SHALL log error but return results successfully
8. WHEN network error occurs THEN the system SHALL show offline indicator and cached results if available

### Requirement 9: Mobile-Responsive Search Interface

**User Story:** As a mobile user, I want the search interface to work well on my device, so that I can search on the go.

#### Acceptance Criteria

1. WHEN viewing on mobile THEN the system SHALL display single-column layout for results
2. WHEN viewing on mobile THEN the system SHALL show filters in collapsible drawer
3. WHEN typing on mobile THEN the system SHALL show appropriate keyboard (search type)
4. WHEN results load on mobile THEN the system SHALL use touch-friendly card sizes
5. WHEN scrolling on mobile THEN the system SHALL maintain search bar visibility
6. WHEN switching tabs on mobile THEN the system SHALL use swipe gestures
7. WHEN viewing result on mobile THEN the system SHALL optimize text size for readability
8. WHEN loading on mobile THEN the system SHALL prioritize above-the-fold content

### Requirement 10: Search Accessibility

**User Story:** As a user with accessibility needs, I want the search interface to be fully accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. WHEN using keyboard THEN the system SHALL support full navigation without mouse
2. WHEN search input is focused THEN the system SHALL announce search suggestions to screen readers
3. WHEN results load THEN the system SHALL announce result count to screen readers
4. WHEN filters change THEN the system SHALL announce filter status to screen readers
5. WHEN using screen reader THEN the system SHALL provide proper ARIA labels for all controls
6. WHEN keyboard navigating THEN the system SHALL show clear focus indicators
7. WHEN color is used THEN the system SHALL meet WCAG AA contrast requirements
8. WHEN errors occur THEN the system SHALL announce them to screen readers

### Requirement 11: RAG-Based AI Chatbot with Source Citations

**User Story:** As a user, I want to ask questions to an AI assistant and receive answers with clear citations showing which sources were used, so that I can verify the information and explore related content.

#### Acceptance Criteria

1. WHEN user asks a question THEN the system SHALL use vector search to retrieve top 5 relevant Q&As as context
2. WHEN generating answer THEN the system SHALL use Google Gemini gemini-2.5-flash-lite with RAG pattern
3. WHEN answer is generated THEN the system SHALL include inline citations in format [Source N] or [QX.Y.Z]
4. WHEN displaying answer THEN the system SHALL show clickable source references below the message
5. WHEN user clicks source reference THEN the system SHALL expand to show the full source Q&A
6. WHEN source is cited THEN the system SHALL highlight the specific sentences that were referenced
7. WHEN multiple sources are used THEN the system SHALL list all sources with relevance scores
8. IF context doesn't contain answer THEN the system SHALL clearly state information is not available
9. WHEN conversation continues THEN the system SHALL maintain context from previous messages
10. WHEN displaying sources THEN the system SHALL show question number, question text, and relevance score
11. WHEN answer contains quotes THEN the system SHALL map them to exact sentences in source answers
12. WHEN saving conversation THEN the system SHALL store question, answer, sources, and citation mappings

### Requirement 12: Citation Quality and Accuracy

**User Story:** As a user, I want citations to be accurate and helpful, so that I can trust the AI's answers and find more information easily.

#### Acceptance Criteria

1. WHEN citation is added THEN the system SHALL verify the source exists in retrieved context
2. WHEN displaying citation THEN the system SHALL show question number for easy reference
3. WHEN multiple sources support a claim THEN the system SHALL cite all relevant sources
4. WHEN quoting directly THEN the system SHALL use quotation marks and precise citation
5. WHEN paraphrasing THEN the system SHALL still provide source attribution
6. WHEN source is partially relevant THEN the system SHALL extract only cited sentences
7. WHEN displaying sources THEN the system SHALL order by relevance score
8. IF citation cannot be verified THEN the system SHALL log warning and show generic reference
