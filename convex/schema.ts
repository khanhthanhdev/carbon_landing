import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  qa: defineTable({
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    content: v.optional(v.string()),
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
    sources: v.optional(v.array(v.any())),
    embedding_doc: v.optional(v.array(v.float64())),
    embedding_qa: v.optional(v.array(v.float64())),
    embedding_fact: v.optional(v.array(v.float64())),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
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
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    searchable_text: v.optional(v.string()),
    summary: v.optional(v.string()),
    
    // Metadata
    question_number: v.optional(v.string()),
    section_number: v.optional(v.string()),
    section_title: v.optional(v.string()),
    category: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    has_sources: v.optional(v.boolean()),
    answer_length: v.optional(v.number()),
    
    // Sources
    sources: v.optional(v.array(v.any())),
    
    // Search fields
    question_lower: v.optional(v.string()),
    keywords_searchable: v.optional(v.string()),
    category_searchable: v.optional(v.string()),
    
    // Embedding for vector search
    embedding: v.optional(v.array(v.float64())),
    
    // Timestamps
    created_at: v.optional(v.string()),
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
    // Detailed ratings - each section has sub-questions (1-5 scale)
    // 1️⃣ Nội dung thông tin
    contentAccuracy: v.optional(v.number()), // Thông tin có chính xác, dễ hiểu không?
    contentRelevance: v.optional(v.number()), // Có phù hợp với thực tế doanh nghiệp Việt Nam?
    contentFreshness: v.optional(v.number()), // Có được cập nhật thường xuyên không?
    // 2️⃣ Dễ sử dụng
    interfaceSimplicity: v.optional(v.number()), // Giao diện có đơn giản, dễ tìm kiếm thông tin không?
    languageSupport: v.optional(v.number()), // Có hỗ trợ tiếng Việt rõ ràng, dễ đọc không?
    // 3️⃣ Công cụ và tính năng hỗ trợ
    toolsAvailability: v.optional(v.number()), // Có tính năng tra cứu nhanh, đặt câu hỏi?
    // 4️⃣ Kết nối và chia sẻ
    networkingCapability: v.optional(v.number()), // Có thể kết nối, học hỏi từ doanh nghiệp khác?
    knowledgeSharing: v.optional(v.number()), // Có cơ chế cập nhật câu hỏi và câu trả lời?
    // 5️⃣ Giá trị và tác động
    understandingImprovement: v.optional(v.number()), // Giúp hiểu rõ hơn về thị trường carbon?
    practicalApplication: v.optional(v.number()), // Áp dụng được vào hoạt động thực tế?
    // 6️⃣ Sự hài lòng chung
    overallSatisfaction: v.optional(v.number()),
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
    filters: v.optional(v.any()),
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
    key: v.optional(v.string()),
    locale: v.optional(v.string()),
    payload: v.optional(v.any()),
    updatedAt: v.optional(v.number()),
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
    sessionId: v.optional(v.string()),
    userId: v.optional(v.string()),
    locale: v.optional(v.string()),
    messages: v.optional(v.array(v.any())),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("bySessionId", ["sessionId"])
    .index("byUserId", ["userId"])
    .index("byCreatedAt", ["createdAt"]),

  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    image: v.optional(v.string()),
    role: v.optional(v.string()), // "admin" or "user"
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_username", ["username"]),
});
