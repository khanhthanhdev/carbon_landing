# Requirements Document

## Introduction

This feature adds a comprehensive bulk embedding action to the CarbonLearn platform that can process all Q&A documents in the database and generate embeddings using Google's gemini-embedding-001 model with appropriate task types. The action will be implemented in `convex/actions.ts` and will handle rate limiting, error recovery, progress tracking, and support filtering by category, language, and other criteria.

The platform uses the "qa" table which stores Q&A documents with three types of embeddings: `embedding_doc` (document-level), `embedding_qa` (question-answer pair), and `embedding_fact` (factual content). The data has been successfully imported with embeddings already generated.

## Requirements

### Requirement 1: Bulk Embedding Action for QA Table

**User Story:** As a system administrator, I want to generate embeddings for all Q&A documents in the qa table, so that the semantic search functionality works correctly across the entire knowledge base.

#### Acceptance Criteria

1. WHEN the bulk embedding action is triggered THEN the system SHALL retrieve all Q&A documents from the qa table
2. WHEN processing Q&A documents THEN the system SHALL generate three types of embeddings using gemini-embedding-001 with appropriate task types
3. WHEN generating embeddings THEN the system SHALL compose text from question, answer, and content fields for different embedding types
4. WHEN embeddings are generated THEN the system SHALL store the embedding vectors in the qa table fields: embedding_doc, embedding_qa, and embedding_fact
5. WHEN the action completes THEN the system SHALL return statistics including total processed, successful, failed, and skipped documents

### Requirement 2: Filtering and Selective Processing

**User Story:** As a system administrator, I want to filter which documents get embedded, so that I can process specific subsets of data efficiently.

#### Acceptance Criteria

1. WHEN the action is called with a category filter THEN the system SHALL only process documents matching that category
2. WHEN the action is called with a language filter THEN the system SHALL only process documents matching that language
3. WHEN the action is called with a limit parameter THEN the system SHALL process at most that many documents
4. WHEN the action is called with skipExisting flag THEN the system SHALL skip documents that already have embeddings
5. IF no filters are provided THEN the system SHALL process all documents in the database

### Requirement 3: Rate Limiting and Batch Processing

**User Story:** As a system administrator, I want the embedding process to respect API rate limits, so that the system doesn't get throttled or blocked by the Gemini API.

#### Acceptance Criteria

1. WHEN processing documents THEN the system SHALL process them in configurable batch sizes (default 5)
2. WHEN a batch completes THEN the system SHALL wait for a configurable delay (default 3000ms) before starting the next batch
3. WHEN an API rate limit error occurs THEN the system SHALL implement exponential backoff retry logic
4. WHEN retrying THEN the system SHALL attempt up to 3 retries with increasing delays
5. IF all retries fail THEN the system SHALL log the error and continue with remaining documents

### Requirement 4: Progress Tracking and Logging

**User Story:** As a system administrator, I want to monitor the progress of bulk embedding operations, so that I can understand how long the process will take and identify any issues.

#### Acceptance Criteria

1. WHEN processing batches THEN the system SHALL log progress every batch (e.g., "Processing batch 5/20")
2. WHEN processing documents THEN the system SHALL log every 25 documents processed
3. WHEN errors occur THEN the system SHALL log detailed error information including document ID and error message
4. WHEN the action completes THEN the system SHALL return comprehensive statistics including processing time
5. WHEN using cached embeddings THEN the system SHALL track and report cache hit rate

### Requirement 5: Error Handling and Recovery

**User Story:** As a system administrator, I want the embedding process to handle errors gracefully, so that one failed document doesn't stop the entire process.

#### Acceptance Criteria

1. WHEN a document fails to embed THEN the system SHALL log the error and continue with remaining documents
2. WHEN an error occurs THEN the system SHALL include the document identifier and error details in the error log
3. WHEN the action completes THEN the system SHALL return a list of all failed documents with their error messages
4. WHEN a document has missing or invalid data THEN the system SHALL skip it and log a validation error
5. IF the API key is missing THEN the system SHALL throw an error immediately before processing any documents

### Requirement 6: Embedding Cache Integration

**User Story:** As a system administrator, I want the bulk embedding action to use the existing embedding cache, so that we don't regenerate embeddings unnecessarily and save API costs.

#### Acceptance Criteria

1. WHEN generating an embedding THEN the system SHALL check the embeddingCache table first using a hash key
2. WHEN a cached embedding is found and not expired THEN the system SHALL use it instead of calling the API
3. WHEN using a cached embedding THEN the system SHALL update the access tracking (lastAccessedAt, accessCount)
4. WHEN generating a new embedding THEN the system SHALL cache it with a configurable TTL (default 7 days)
5. WHEN the action completes THEN the system SHALL report cache hit statistics

### Requirement 7: Validation and Data Integrity

**User Story:** As a system administrator, I want the embedding process to validate data before and after processing, so that only valid embeddings are stored in the database.

#### Acceptance Criteria

1. WHEN processing a document THEN the system SHALL validate that question and answer fields are non-empty
2. WHEN an embedding is generated THEN the system SHALL validate it has exactly 768 dimensions
3. WHEN storing embeddings THEN the system SHALL validate all three embedding types (doc, qa, fact) have correct dimensions
4. IF validation fails THEN the system SHALL log the error and skip that document
5. WHEN the action completes THEN the system SHALL report validation failure statistics

### Requirement 8: Idempotency and Re-embedding

**User Story:** As a system administrator, I want to safely re-run the embedding action, so that I can update embeddings when the model or data changes.

#### Acceptance Criteria

1. WHEN the action is called with forceReembed flag THEN the system SHALL regenerate embeddings even if they exist
2. WHEN updating existing embeddings THEN the system SHALL preserve all other question fields
3. WHEN a question is updated THEN the system SHALL update the updated_at timestamp
4. WHEN the action completes THEN the system SHALL report how many questions were updated vs newly created
5. IF skipExisting is true THEN the system SHALL not modify questions that already have embeddings

### Requirement 9: Automatic Embedding on New QA Documents

**User Story:** As a system administrator, I want new Q&A documents to be automatically embedded when they are added, so that semantic search works immediately without manual intervention.

#### Acceptance Criteria

1. WHEN a new Q&A document is inserted into the qa table THEN the system SHALL automatically trigger embedding generation for all three embedding types
2. WHEN a Q&A document is updated THEN the system SHALL regenerate the embeddings if question, answer, or content text changed
3. WHEN automatic embedding fails THEN the system SHALL log the error but allow the Q&A document insert/update to succeed
4. WHEN embedding is generated THEN the system SHALL use the same cache mechanism as bulk embedding
5. WHEN automatic embedding completes THEN the system SHALL update the qa record with all three embedding vectors (embedding_doc, embedding_qa, embedding_fact)
