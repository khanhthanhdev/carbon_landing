# Implementation Plan

- [x] 1. Add helper functions to convex/actions.ts

  - Create `filterQADocuments` function to filter QA documents by categories, language, and existing embeddings
  - Create `validateQADocument` function to validate question, answer, and content fields are non-empty
  - Reuse existing `sanitizeContentForEmbedding` function to compose text for different embedding types
  - Reuse existing `getEmbeddingCacheKey` function for cache keys
  - Reuse existing `sleep` utility for batch delays
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 7.1, 7.2_

- [ ] 2. Implement embedAllQA bulk action

  - [x] 2.1 Define action with comprehensive argument validation

    - Add args schema with optional filters (categories, lang, limit)
    - Add processing options (skipExisting, forceReembed, embeddingTypes)
    - Add rate limiting options (batchSize, batchDelayMs)
    - Add cache options (embeddingTtlMs)
    - Set default values: batchSize=5, batchDelayMs=3000, embeddingTtlMs=7 days, embeddingTypes=["doc", "qa", "fact"]
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 6.4, 8.1_

  - [x] 2.2 Implement QA document retrieval and filtering

    - Query all QA documents from qa table using ctx.db.query("qa")
    - Apply category filter if provided using filterQADocuments helper
    - Apply language filter if provided
    - Apply skipExisting filter to exclude documents with embeddings for specified types
    - Apply limit to cap number of documents processed
    - Log total documents found and filtered count
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 Implement batch processing loop

    - Calculate total batches based on filtered QA documents and batchSize
    - Create batches by slicing filtered documents array
    - Process each batch with Promise.all for parallel processing within batch
    - Add configurable delay between batches using sleep utility
    - Log progress after each batch with batch number and documents processed
    - _Requirements: 3.1, 3.2, 4.1, 4.2_

  - [x] 2.4 Implement per-document processing logic for multiple embedding types

    - Validate QA document using validateQADocument helper
    - Skip invalid documents and add to validationErrors array
    - Check if document should be skipped based on skipExisting and forceReembed flags
    - For each embedding type (doc, qa, fact):
      - Compose appropriate text: content for doc, question+answer for qa, answer for fact
      - Generate cache key using getEmbeddingCacheKey helper
      - Check embeddingCache table using api.embeddings.getCachedEmbedding
      - If cached and not expired, use cached embedding and increment cacheHits counter
      - If not cached, call api.embeddings.embedForTask with appropriate task type
      - Validate embedding dimensions (768 dimensions)
      - Cache new embedding using api.embeddings.cacheEmbedding with TTL
    - Update QA document using ctx.db.patch with all generated embeddings
    - Track statistics per embedding type: processedDocuments, newEmbeddings, cachedEmbeddings
    - Handle errors gracefully and add to appropriate error arrays
    - _Requirements: 1.2, 1.3, 1.4, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 7.2, 7.3, 7.4, 8.2, 8.3_

  - [x] 2.5 Implement comprehensive error handling

    - Wrap question validation in try-catch and collect validation errors
    - Wrap embedding generation in try-catch and collect embedding errors
    - Wrap database updates in try-catch and collect update errors
    - Continue processing remaining questions when errors occur
    - Log detailed error information including question_number and error message
    - Validate API key exists before processing any questions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.6 Implement result aggregation and return

    - Calculate totalDocuments, filteredDocuments, processedDocuments counts
    - Calculate skippedDocuments and failedDocuments counts
    - Calculate newEmbeddings and cachedEmbeddings counts per embedding type
    - Calculate cacheHitRate percentage for each embedding type
    - Track documentsUpdated from ctx.db.patch results
    - Collect all error arrays: validationErrors, embeddingErrors, updateErrors
    - Calculate processingTimeMs and averageTimePerDocument
    - Return comprehensive result object with all statistics and configuration
    - _Requirements: 1.5, 4.3, 4.4, 4.5, 6.5_

- [ ] 3. Implement autoEmbedQA action for automatic embedding

  - [x] 3.1 Define action with QA document ID argument

    - Add args schema with qaId (v.id("qa"))
    - Add optional embeddingTtlMs parameter
    - Add optional embeddingTypes parameter (default: ["doc", "qa", "fact"])
    - Set default TTL to 7 days
    - _Requirements: 9.1, 9.2_

  - [x] 3.2 Implement QA document retrieval and validation

    - Fetch QA document by ID using ctx.db.get(qaId)
    - Validate document exists, throw error if not found
    - Validate question, answer, and content fields are non-empty
    - Log question_number being processed

    - _Requirements: 9.1, 9.2, 7.1_

  - [x] 3.3 Implement multi-type embedding generation with cache

    - For each embedding type (doc, qa, fact):
      - Compose appropriate text based on type
      - Generate cache key using getEmbeddingCacheKey
      - Check embeddingCache using api.embeddings.getCachedEmbedding
      - If cached, use cached embedding and update access tracking
      - If not cached, call api.embeddings.embedForTask with appropriate task type
      - Validate embedding dimensions (768)
      - Cache new embedding with TTL
    - _Requirements: 9.4, 6.1, 6.2, 6.3, 6.4, 7.2, 7.3_

  - [x] 3.4 Implement QA document update with error handling

    - Update QA document with all embeddings using ctx.db.patch
    - Wrap entire process in try-catch to handle errors gracefully
    - Log error if embedding fails but don't throw (allow QA document insert/update to succeed)
    - Return success status and embedding info for all types
    - _Requirements: 9.3, 9.5, 5.1_

- [ ] 4. Add progress logging throughout actions

  - Log embedAllQA start with total documents, batches, embedding types, and configuration
  - Log batch progress every batch with processed count, cache hits per type, and errors
  - Log every 25 documents processed within batches
  - Log cache hit information when using cached embeddings for each type
  - Log completion summary with all statistics per embedding type
  - Log autoEmbedQA start and completion with question_number
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Add comprehensive JSDoc documentation


  - Document embedAllQA action with description, parameters, return value, and usage examples
  - Document autoEmbedQA action with description and usage
  - Document all helper functions with parameter types and return types
  - Add example usage in comments showing different filter combinations and embedding types
  - Add notes about rate limiting and performance considerations
  - Add notes about the three embedding types and their use cases
  - _Requirements: All requirements_

- [ ]\* 6. Test the implementation

  - [ ]\* 6.1 Test embedAllQA with small dataset

    - Run action with limit=10
    - Verify all three embedding types generated correctly
    - Check database for updated QA documents with all embeddings
    - Verify cache populated with new embeddings for each type
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]\* 6.2 Test cache hit functionality

    - Run embedAllQA twice on same dataset
    - Verify second run shows high cache hit rate (>90%) for all types
    - Verify processing time significantly reduced on second run
    - Check cache access tracking updated
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ]\* 6.3 Test filtering options

    - Test with categories filter for specific category
    - Test with lang filter for specific language
    - Test with limit parameter for capped processing
    - Test with skipExisting flag to skip documents with embeddings
    - Test with embeddingTypes to generate only specific types
    - Verify correct documents filtered in each case
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]\* 6.4 Test error handling

    - Create test QA documents with missing question, answer, or content
    - Run action and verify it continues processing
    - Check validationErrors array contains failed documents
    - Verify other documents processed successfully
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.4_

  - [ ]\* 6.5 Test automatic embedding

    - Insert a new QA document into the qa table
    - Verify autoEmbedQA action is triggered automatically
    - Check QA document has all three embeddings after a few seconds
    - Verify embeddings are cached
    - Update document text and verify embeddings regenerated
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]\* 6.6 Test forceReembed flag
    - Run embedAllQA with forceReembed=true on documents with existing embeddings
    - Verify embeddings regenerated even though they exist
    - Check documentsUpdated count reflects re-embedded documents
    - Verify updatedAt timestamps updated
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]\* 7. Update documentation
  - Add embedAllQA action to docs/embed.md with usage examples
  - Document autoEmbedQA action and automatic embedding behavior
  - Document all parameters and their default values
  - Document the three embedding types (doc, qa, fact) and their use cases
  - Add examples for common use cases (initial import, incremental updates, re-embedding)
  - Document expected performance and rate limiting behavior
  - Add troubleshooting section for common issues
  - _Requirements: All requirements_
