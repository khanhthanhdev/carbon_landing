import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  qa: defineTable({
    question: v.string(),
    answer: v.string(),
    content: v.string(),
    searchable_text: v.optional(v.string()),
    section_id: v.optional(v.string()),
    section_number: v.optional(v.string()),
    section_title: v.optional(v.string()),
    question_number: v.optional(v.string()),
    source_id: v.optional(v.string()),
    category: v.string(),
    keywords: v.optional(v.array(v.string())),
    question_lower: v.optional(v.string()),
    keywords_searchable: v.optional(v.string()),
    category_searchable: v.optional(v.string()),
    lang: v.optional(v.string()),
    has_sources: v.optional(v.boolean()),
    answer_length: v.optional(v.number()),
    metadata_created_at: v.optional(v.string()),
    metadata_updated_at: v.optional(v.string()),
    sources: v.optional(
      v.array(
        v.object({
          type: v.optional(v.string()),
          title: v.optional(v.string()),
          url: v.optional(v.string()),
          location: v.optional(v.string()),
          note: v.optional(v.string()),
        }),
      ),
    ),
    embedding_doc: v.array(v.float64()),
    embedding_qa: v.optional(v.array(v.float64())),
    embedding_fact: v.optional(v.array(v.float64())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_question_number", ["question_number"])
    .index("by_section_number", ["section_number"])
    .searchIndex("by_text", {
      searchField: "content",
      filterFields: ["category", "lang"],
    })
    .searchIndex("search_by_keywords", {
      searchField: "keywords_searchable",
      filterFields: ["category", "lang"],
    })
    .vectorIndex("by_embedding_doc", {
      vectorField: "embedding_doc",
      dimensions: 768,
      filterFields: ["category", "lang"],
    })
    .vectorIndex("by_embedding_qa", {
      vectorField: "embedding_qa",
      dimensions: 768,
      filterFields: ["category", "lang"],
    })
    .vectorIndex("by_embedding_fact", {
      vectorField: "embedding_fact",
      dimensions: 768,
      filterFields: ["category", "lang"],
    }),

  questions: defineTable({
    // Core fields
    question: v.string(),
    answer: v.string(),
    searchable_text: v.string(),
    summary: v.optional(v.string()),
    
    // Metadata
    question_number: v.string(),
    section_number: v.string(),
    section_title: v.string(),
    category: v.string(),
    keywords: v.array(v.string()),
    has_sources: v.boolean(),
    answer_length: v.number(),
    
    // Sources
    sources: v.array(v.object({
      type: v.string(),
      title: v.string(),
      url: v.string(),
      location: v.optional(v.string()),
    })),
    
    // Search fields
    question_lower: v.string(),
    keywords_searchable: v.string(),
    category_searchable: v.string(),
    
    // Embedding for vector search
    embedding: v.optional(v.array(v.float64())),
    
    // Timestamps
    created_at: v.string(),
    updated_at: v.optional(v.string()),
    sequence: v.optional(v.number()),
    is_common: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_section", ["section_number"])
    .index("by_category", ["category"])
    .index("by_keywords", ["keywords_searchable"])
    .index("by_question_number", ["question_number"])
    .searchIndex("search_by_text", {
      searchField: "searchable_text",
      filterFields: ["category_searchable", "section_number"],
    })
    .searchIndex("search_by_keywords", {
      searchField: "keywords_searchable",
      filterFields: ["category_searchable"],
    })
    .vectorIndex("byEmbedding", {
      vectorField: "embedding",
      dimensions: 768, // text-embedding-004 default dimensions
      filterFields: ["section_number", "category", "has_sources"],
    }),

  questionRequests: defineTable({
    name: v.string(),
    email: v.string(),
    question: v.string(),
    status: v.union(v.literal("pending"), v.literal("triaged"), v.literal("completed")),
    createdAt: v.number(),
    sourceQuery: v.optional(v.string()),
  }).index("byEmail", ["email"]),

  feedback: defineTable({
    name: v.string(),
    email: v.string(),
    rating: v.number(),
    comment: v.string(),
    locale: v.optional(v.string()),
    createdAt: v.number(),
  }).index("byRating", ["rating"]),

  searchCache: defineTable({
    queryHash: v.string(),
    locale: v.string(),
    questionIds: v.array(v.id("qa")),
    expiresAt: v.number(),
    embedding: v.optional(v.array(v.float64())),
    createdAt: v.number(),
    queryText: v.optional(v.string()),
    filters: v.optional(v.object({
      category: v.optional(v.string()),
      section: v.optional(v.string()),
      locale: v.optional(v.string()),
    })),
    scores: v.optional(v.array(v.float64())),
    lastAccessedAt: v.number(),
    accessCount: v.number(),
  })
    .index("byQueryHash", ["queryHash", "locale"])
    .index("byExpiresAt", ["expiresAt"]),

  embeddingCache: defineTable({
    hash: v.string(),
    provider: v.string(),
    model: v.string(),
    dimensions: v.number(),
    embedding: v.array(v.float64()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    lastAccessedAt: v.number(),
    accessCount: v.number(),
    taskType: v.optional(v.string()),
    text: v.optional(v.string()),
  })
    .index("byHash", ["hash"])
    .index("byExpiresAt", ["expiresAt"])
    .index("byProviderModel", ["provider", "model"]),

  landingContent: defineTable({
    key: v.string(),
    locale: v.string(),
    payload: v.object({
      title: v.string(),
      author: v.optional(v.string()),
      description: v.optional(v.string()),
      coverImage: v.optional(v.string()),
      pages: v.optional(v.number()),
      publisher: v.optional(v.string()),
      year: v.optional(v.number()),
      isbn: v.optional(v.string()),
      purchaseLinks: v.optional(
        v.array(
          v.object({
            retailer: v.string(),
            url: v.string(),
          }),
        ),
      ),
    }),
    updatedAt: v.number(),
  })
    .index("byKey", ["key", "locale"])
    .index("byLocale", ["locale"]),

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
    .index("byLocale", ["locale"]),

  conversations: defineTable({
    sessionId: v.string(),
    userId: v.optional(v.string()),
    locale: v.string(),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
      sources: v.optional(v.array(v.object({
        questionId: v.id("qa"),
        questionNumber: v.string(),
        question: v.string(),
        relevanceScore: v.number(),
        citedSentences: v.optional(v.array(v.string())),
        citationMarkers: v.optional(v.array(v.string())),
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
    .index("byCreatedAt", ["createdAt"]),
});
