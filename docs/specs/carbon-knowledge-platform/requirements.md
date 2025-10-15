# Requirements Document

## Introduction

CarbonLearn is a multilingual knowledge platform designed to help Small and Medium Enterprises (SMEs) understand and participate in carbon markets. The platform provides semantic search capabilities, AI-powered assistance, and a comprehensive knowledge base covering carbon trading, emissions reduction, and sustainability practices. This requirements document covers the foundational phases (1-5) that establish the core infrastructure, data management, and search functionality.

## Requirements

### Requirement 1: Platform Infrastructure Setup

**User Story:** As a platform administrator, I want a robust technical foundation built on modern web technologies, so that the platform can handle multiple users and provide fast, reliable access to carbon market information.

#### Acceptance Criteria

1. WHEN the platform is deployed THEN the system SHALL use Next.js 15+ with App Router for the frontend framework
2. WHEN data operations are performed THEN the system SHALL use Convex as the backend database and function platform
3. WHEN AI functionality is needed THEN the system SHALL integrate Google Gemini API for embeddings and text generation
4. WHEN users access the platform THEN the system SHALL support both Vietnamese (default) and English locales using next-intl
5. WHEN the platform is configured THEN the system SHALL include all necessary environment variables for Convex, Google AI, and email services
6. WHEN dependencies are installed THEN the system SHALL include TanStack Query for client-side caching and state management

### Requirement 2: Knowledge Base Data Model

**User Story:** As a content manager, I want a structured database schema that can store Q&A content with semantic search capabilities, so that users can find relevant information quickly and accurately.

#### Acceptance Criteria

1. WHEN Q&A content is stored THEN the system SHALL maintain a questions table with question, answer, source, and vector embedding fields
2. WHEN embeddings are generated THEN the system SHALL store 768-dimensional vectors compatible with Gemini embedding model
3. WHEN search operations occur THEN the system SHALL support vector similarity search using Convex vector indexes
4. WHEN content is categorized THEN the system SHALL allow optional category and tag fields for better organization
5. WHEN caching is implemented THEN the system SHALL include embedding cache and search cache tables for performance optimization
6. WHEN user interactions occur THEN the system SHALL track creation and update timestamps for all content

### Requirement 3: Data Migration and Embedding System

**User Story:** As a content administrator, I want to import existing Q&A content and generate semantic embeddings, so that the knowledge base is populated with searchable content from day one.

#### Acceptance Criteria

1. WHEN existing Q&A data is imported THEN the system SHALL read content from JSON files in the data directory
2. WHEN embeddings are generated THEN the system SHALL use Gemini embedding model with RETRIEVAL_DOCUMENT task type for knowledge base content
3. WHEN API calls are made THEN the system SHALL implement rate limiting to respect Gemini API quotas
4. WHEN embeddings are cached THEN the system SHALL store embeddings to avoid regenerating for identical content
5. WHEN batch processing occurs THEN the system SHALL handle multiple Q&A pairs efficiently with proper error handling
6. WHEN migration completes THEN the system SHALL verify all content has valid embeddings and is searchable

### Requirement 4: Landing Page and User Interface

**User Story:** As a user interested in carbon markets, I want an intuitive landing page with clear search options, so that I can quickly find information or get AI assistance on carbon market topics.

#### Acceptance Criteria

1. WHEN users visit the homepage THEN the system SHALL display a prominent search bar with clear value proposition
2. WHEN users enter search queries THEN the system SHALL provide two distinct options: "Search" for knowledge base lookup and "Ask AI" for conversational assistance
3. WHEN the page loads THEN the system SHALL show a hero section explaining the platform's purpose for SMEs
4. WHEN users scroll THEN the system SHALL display a preview of recent or featured Q&As from the knowledge base
5. WHEN users want to provide feedback THEN the system SHALL include a feedback form with rating and comment capabilities
6. WHEN the interface is accessed THEN the system SHALL be fully responsive and accessible on mobile and desktop devices

### Requirement 5: Semantic Search Functionality

**User Story:** As a user researching carbon markets, I want to search for information using natural language queries, so that I can find relevant answers even when I don't know the exact terminology.

#### Acceptance Criteria

1. WHEN users submit search queries THEN the system SHALL generate query embeddings using Gemini with RETRIEVAL_QUERY task type
2. WHEN vector search is performed THEN the system SHALL return the most semantically similar Q&As ranked by relevance score
3. WHEN search results are displayed THEN the system SHALL show question, answer, source, and relevance information
4. WHEN caching is active THEN the system SHALL implement three-layer caching: client-side (TanStack Query), server-side (Convex), and embedding cache
5. WHEN cache hits occur THEN the system SHALL return results within 200ms for cached queries
6. WHEN search performance is optimized THEN the system SHALL prefetch embeddings for common carbon market terms
7. WHEN users navigate search results THEN the system SHALL provide clear navigation and result count information
8. WHEN search fails THEN the system SHALL display helpful error messages and suggest alternative queries