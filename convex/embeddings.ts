import { GoogleGenAI } from "@google/genai";
import { v } from "convex/values";
import { GeminiHelper } from "../lib/ai/gemini";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { getEmbeddingCacheKey, sleep } from "./shared";

const MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const DIM = Number(process.env.EMBEDDING_DIM || "768");
const DEFAULT_EMBEDDING_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const GEMINI_PROVIDER = "google-gemini";

const TASKS = [
  "RETRIEVAL_DOCUMENT",
  "RETRIEVAL_QUERY",
  "QUESTION_ANSWERING",
  "FACT_VERIFICATION",
] as const;

type TaskType = (typeof TASKS)[number];

let cachedClient: GoogleGenAI | null = null;

function composeDocText(question: string, answer: string) {
  return `${question}\n\n${answer}`.trim();
}

function ensureDim(vec: number[]) {
  if (!Array.isArray(vec) || vec.length !== DIM) {
    throw new Error(
      `Embedding dimension mismatch. Expected ${DIM}, got ${vec?.length || 0}`
    );
  }
}

function getGeminiClient(apiKey: string) {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey, vertexai: false });
  }
  return cachedClient;
}

async function embedText({
  apiKey,
  text,
  task,
  title,
}: {
  apiKey: string;
  text: string;
  task: TaskType;
  title?: string;
}) {
  const cleaned = text.trim();
  if (!cleaned) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const client = getGeminiClient(apiKey);
  const response = await client.models.embedContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: cleaned }],
      },
    ],
    config: {
      taskType: task,
      outputDimensionality: DIM,
      ...(title ? { title } : {}),
    },
  });

  const values = response.embeddings?.[0]?.values ?? [];
  ensureDim(values);
  return values;
}

/**
 * Generate embedding for a specific task type
 */
export const embedForTask = action({
  args: {
    text: v.string(),
    task: v.union(
      v.literal("RETRIEVAL_DOCUMENT"),
      v.literal("RETRIEVAL_QUERY"),
      v.literal("QUESTION_ANSWERING"),
      v.literal("FACT_VERIFICATION")
    ),
  },
  handler: async (_ctx, { text, task }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_API_KEY");
    }
    return embedText({ apiKey, text, task });
  },
});

/**
 * Generate embeddings for all task types for a Q&A document
 */
export const embedQADocumentAll = action({
  args: {
    question: v.string(),
    answer: v.string(),
  },
  handler: async (_ctx, { question, answer }) => {
    const docText = composeDocText(question, answer);
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_API_KEY");
    }
    const tasks: TaskType[] = [
      "RETRIEVAL_DOCUMENT",
      "QUESTION_ANSWERING",
      "FACT_VERIFICATION",
    ];

    const entries = await Promise.all(
      tasks.map(async (task) => {
        const text = task === "QUESTION_ANSWERING" ? answer : docText;
        const values = await embedText({
          apiKey,
          text,
          task,
          title: task === "RETRIEVAL_DOCUMENT" ? question : undefined,
        });
        return [task, values] as const;
      })
    );

    const results: Record<TaskType, number[]> = Object.fromEntries(
      entries
    ) as Record<TaskType, number[]>;

    return {
      embedding_doc: results.RETRIEVAL_DOCUMENT,
      embedding_qa: results.QUESTION_ANSWERING,
      embedding_fact: results.FACT_VERIFICATION,
      composed: docText,
      dim: DIM,
      model: MODEL,
    };
  },
});

/**
 * Generate embeddings for a batch of Q&A documents
 */
export const embedQADocumentsBatch = action({
  args: {
    documents: v.array(
      v.object({
        question: v.string(),
        answer: v.string(),
      })
    ),
  },
  handler: async (_ctx, { documents }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_API_KEY");
    }

    const docTexts = documents.map(({ question, answer }) =>
      composeDocText(question, answer)
    );
    const answerTexts = documents.map(({ answer }) => answer);

    const requestsDoc = docTexts.map((text, i) => ({
      text,
      taskType: "RETRIEVAL_DOCUMENT" as TaskType,
      title: documents[i].question,
    }));
    const requestsQA = answerTexts.map((text) => ({
      text,
      taskType: "QUESTION_ANSWERING" as TaskType,
    }));
    const requestsFact = docTexts.map((text) => ({
      text,
      taskType: "FACT_VERIFICATION" as TaskType,
    }));

    const [embeddingsDoc, embeddingsQA, embeddingsFact] = await Promise.all([
      new GeminiHelper(apiKey).batchEmbedContents(requestsDoc),
      new GeminiHelper(apiKey).batchEmbedContents(requestsQA),
      new GeminiHelper(apiKey).batchEmbedContents(requestsFact),
    ]);

    return documents.map((_doc, i) => ({
      embedding_doc: embeddingsDoc[i],
      embedding_qa: embeddingsQA[i],
      embedding_fact: embeddingsFact[i],
      composed: docTexts[i],
      dim: DIM,
      model: MODEL,
    }));
  },
});

/**
 * Generate query embedding for search
 */
export const embedQuery = action({
  args: {
    query: v.string(),
    task: v.union(
      v.literal("RETRIEVAL_QUERY"),
      v.literal("QUESTION_ANSWERING"),
      v.literal("FACT_VERIFICATION")
    ),
  },
  handler: async (_ctx, { query, task }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_API_KEY");
    }
    return embedText({ apiKey, text: query, task });
  },
});

/**
 * Get cached embedding by hash (read-only)
 */
export const getCachedEmbedding = query({
  args: { hash: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("embeddingCache")
      .withIndex("byHash", (q) => q.eq("hash", args.hash))
      .first();

    if (!record) {
      return null;
    }

    const now = Date.now();

    // Check if embedding has expired
    if (record.expiresAt && record.expiresAt < now) {
      return null;
    }

    return {
      id: record._id,
      provider: record.provider,
      model: record.model,
      dimensions: record.dimensions,
      embedding: record.embedding,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      lastAccessedAt: record.lastAccessedAt,
      accessCount: record.accessCount,
      taskType: record.taskType,
      text: record.text,
    };
  },
});

/**
 * Update access tracking for cached embedding
 */
export const updateAccessTracking = mutation({
  args: {
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("embeddingCache")
      .withIndex("byHash", (q) => q.eq("hash", args.hash))
      .first();

    if (!record) {
      return null;
    }

    const now = Date.now();
    const previousAccessCount = record.accessCount ?? 0;

    await ctx.db.patch(record._id, {
      lastAccessedAt: now,
      accessCount: previousAccessCount + 1,
    });

    return {
      id: record._id,
      accessCount: previousAccessCount + 1,
    };
  },
});

/**
 * Cache embedding with access tracking
 */
export const cacheEmbedding = mutation({
  args: {
    hash: v.string(),
    provider: v.string(),
    model: v.string(),
    dimensions: v.number(),
    embedding: v.array(v.float64()),
    expiresAt: v.optional(v.number()),
    taskType: v.optional(v.string()),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("embeddingCache")
      .withIndex("byHash", (q) => q.eq("hash", args.hash))
      .first();

    const now = Date.now();
    const createdAt = existing?.createdAt ?? now;
    const previousAccessCount = existing?.accessCount ?? 0;

    const payload = {
      provider: args.provider,
      model: args.model,
      dimensions: args.dimensions,
      embedding: args.embedding,
      expiresAt: args.expiresAt,
      createdAt,
      lastAccessedAt: now,
      accessCount: previousAccessCount + 1,
      taskType: args.taskType ?? existing?.taskType,
      text: args.text ?? existing?.text,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return ctx.db.insert("embeddingCache", {
      hash: args.hash,
      ...payload,
    });
  },
});

/**
 * Get cache statistics for monitoring
 */
export const getCacheStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all cache entries
    const allEntries = await ctx.db.query("embeddingCache").collect();

    // Calculate statistics
    const totalEntries = allEntries.length;
    const expiredEntries = allEntries.filter(
      (entry) => entry.expiresAt && entry.expiresAt < now
    ).length;

    const activeEntries = totalEntries - expiredEntries;

    // Calculate total access count
    const totalAccesses = allEntries.reduce(
      (sum, entry) => sum + (entry.accessCount || 0),
      0
    );

    // Calculate average access count for active entries
    const avgAccessCount =
      activeEntries > 0 ? totalAccesses / activeEntries : 0;

    // Group by provider and model
    const providerStats = allEntries.reduce(
      (stats, entry) => {
        const key = `${entry.provider}:${entry.model}`;
        if (!stats[key]) {
          stats[key] = { count: 0, totalAccesses: 0 };
        }
        stats[key].count++;
        stats[key].totalAccesses += entry.accessCount || 0;
        return stats;
      },
      {} as Record<string, { count: number; totalAccesses: number }>
    );

    return {
      totalEntries,
      activeEntries,
      expiredEntries,
      totalAccesses,
      avgAccessCount: Math.round(avgAccessCount * 100) / 100,
      providerStats,
    };
  },
});

/**
 * Clean up expired cache entries
 */
export const cleanupExpiredCache = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    const now = Date.now();

    // Find expired entries
    const expiredEntries = await ctx.db
      .query("embeddingCache")
      .withIndex("byExpiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(batchSize);

    // Delete expired entries
    const deletedIds = [];
    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id);
      deletedIds.push(entry._id);
    }

    return {
      deletedCount: deletedIds.length,
      deletedIds,
    };
  },
});

/**
 * Clean up least recently used cache entries when cache is full
 */
export const cleanupLRUCache = mutation({
  args: {
    maxEntries: v.number(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;

    // Count total entries
    const totalEntries = await ctx.db.query("embeddingCache").collect();

    if (totalEntries.length <= args.maxEntries) {
      return {
        deletedCount: 0,
        message: "Cache size within limits",
      };
    }

    // Calculate how many entries to remove
    const entriesToRemove = Math.min(
      totalEntries.length - args.maxEntries,
      batchSize
    );

    // Sort by last accessed time (oldest first) and access count (least accessed first)
    const sortedEntries = totalEntries
      .sort((a, b) => {
        // First sort by access count (ascending)
        const accessDiff = (a.accessCount || 0) - (b.accessCount || 0);
        if (accessDiff !== 0) {
          return accessDiff;
        }

        // Then by last accessed time (ascending)
        return (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0);
      })
      .slice(0, entriesToRemove);

    // Delete LRU entries
    const deletedIds = [];
    for (const entry of sortedEntries) {
      await ctx.db.delete(entry._id);
      deletedIds.push(entry._id);
    }

    return {
      deletedCount: deletedIds.length,
      deletedIds,
    };
  },
});

/**
 * Optimize cache by removing entries with low access counts and old timestamps
 */
export const optimizeCache = mutation({
  args: {
    minAccessCount: v.optional(v.number()),
    maxAgeMs: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const minAccessCount = args.minAccessCount ?? 2;
    const maxAgeMs = args.maxAgeMs ?? 30 * 24 * 60 * 60 * 1000; // 30 days
    const batchSize = args.batchSize ?? 100;
    const now = Date.now();

    // Find entries to remove based on criteria
    const allEntries = await ctx.db.query("embeddingCache").collect();

    const entriesToRemove = allEntries
      .filter((entry) => {
        const age = now - entry.createdAt;
        const accessCount = entry.accessCount || 0;

        // Remove if old and rarely accessed
        return age > maxAgeMs && accessCount < minAccessCount;
      })
      .slice(0, batchSize);

    // Delete selected entries
    const deletedIds = [];
    for (const entry of entriesToRemove) {
      await ctx.db.delete(entry._id);
      deletedIds.push(entry._id);
    }

    return {
      deletedCount: deletedIds.length,
      deletedIds,
      criteria: {
        minAccessCount,
        maxAgeMs,
        batchSize,
      },
    };
  },
});

export const reembedQA = action({
  args: {
    categories: v.optional(v.array(v.string())),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { categories, lang, limit } = args;
    const docs = await ctx.runQuery(api.queries.qa.listAll, {});

    const filtered = docs.filter((doc) => {
      if (
        categories &&
        categories.length > 0 &&
        !categories.includes(doc.category)
      ) {
        return false;
      }
      if (lang && doc.lang && doc.lang !== lang) {
        return false;
      }
      return true;
    });

    const slice =
      typeof limit === "number" ? filtered.slice(0, limit) : filtered;
    let processed = 0;
    const failures: Array<{ id: string; error: string }> = [];

    for (const doc of slice) {
      try {
        const embedded = await ctx.runAction(
          api.embeddings.embedQADocumentAll,
          {
            question: doc.question,
            answer: doc.answer,
          }
        );

        // Add delay to prevent rate limiting
        await sleep(5000);

        const composedContent = `${doc.question}\n\n${doc.answer}`.trim();

        await ctx.runMutation(api.mutations.qa.upsertQA, {
          id: doc._id,
          question: doc.question,
          answer: doc.answer,
          sources: doc.sources ?? [],
          category: doc.category,
          lang: doc.lang ?? undefined,
          content: composedContent,
          searchable_text: composedContent,
          section_id: doc.section_id,
          section_number: doc.section_number,
          section_title: doc.section_title,
          question_number: doc.question_number,
          source_id: doc.source_id,
          keywords: doc.keywords,
          question_lower: doc.question_lower,
          keywords_searchable: doc.keywords_searchable,
          category_searchable: doc.category_searchable,
          has_sources: doc.has_sources,
          answer_length: doc.answer_length,
          metadata_created_at: doc.metadata_created_at,
          metadata_updated_at: doc.metadata_updated_at,
          embedding_doc: embedded.embedding_doc,
          embedding_qa: embedded.embedding_qa,
          embedding_fact: embedded.embedding_fact,
        });

        processed += 1;
      } catch (error: any) {
        failures.push({
          id: doc._id,
          error: error?.message ?? "Unknown re-embedding error",
        });
      }
    }

    return {
      processed,
      totalMatched: slice.length,
      skipped: slice.length - processed,
      failures,
    };
  },
});

export const autoEmbedQA = action({
  args: {
    qaId: v.id("qa"),
    embeddingTtlMs: v.optional(v.number()),
    embeddingTypes: v.optional(
      v.array(v.union(v.literal("doc"), v.literal("qa"), v.literal("fact")))
    ),
  },
  handler: async (ctx, args) => {
    const ttlMs = args.embeddingTtlMs ?? DEFAULT_EMBEDDING_TTL_MS; // 7 days default
    const embeddingTypes = args.embeddingTypes ?? ["doc", "qa", "fact"];

    // Fetch QA document by ID
    const qaDoc = await ctx.runQuery(api.queries.qa.get, { id: args.qaId });

    // Validate document exists
    if (!qaDoc) {
      throw new Error(`QA document with ID ${args.qaId} not found`);
    }

    // Validate question field is non-empty
    if (
      !qaDoc.question ||
      typeof qaDoc.question !== "string" ||
      qaDoc.question.trim().length === 0
    ) {
      throw new Error(
        `QA document ${args.qaId} has invalid or empty question field`
      );
    }

    // Validate answer field is non-empty
    if (
      !qaDoc.answer ||
      typeof qaDoc.answer !== "string" ||
      qaDoc.answer.trim().length === 0
    ) {
      throw new Error(
        `QA document ${args.qaId} has invalid or empty answer field`
      );
    }

    // Validate content field is non-empty
    if (
      !qaDoc.content ||
      typeof qaDoc.content !== "string" ||
      qaDoc.content.trim().length === 0
    ) {
      throw new Error(
        `QA document ${args.qaId} has invalid or empty content field`
      );
    }

    // Wrap entire process in try-catch to handle errors gracefully
    try {
      // Generate embeddings for each type with cache support
      const embeddings: {
        embedding_doc?: number[];
        embedding_qa?: number[];
        embedding_fact?: number[];
      } = {};

      const cacheStatus: {
        doc?: boolean;
        qa?: boolean;
        fact?: boolean;
      } = {};

      for (const embeddingType of embeddingTypes) {
        try {
          // Compose appropriate text based on embedding type
          let text: string;
          let taskType:
            | "RETRIEVAL_DOCUMENT"
            | "QUESTION_ANSWERING"
            | "FACT_VERIFICATION";
          let _title: string | undefined;

          if (embeddingType === "doc") {
            // Document-level embedding: full content
            text = qaDoc.content;
            taskType = "RETRIEVAL_DOCUMENT";
            _title = qaDoc.question; // Use question as title for document embeddings
          } else if (embeddingType === "qa") {
            // Question-answer pair embedding: question + answer
            text = `${qaDoc.question}\n\n${qaDoc.answer}`;
            taskType = "QUESTION_ANSWERING";
          } else {
            // Factual content embedding: answer only
            text = qaDoc.answer;
            taskType = "FACT_VERIFICATION";
          }

          // Generate cache key using getEmbeddingCacheKey helper
          const cacheKey = `${getEmbeddingCacheKey(
            qaDoc.question,
            qaDoc.answer,
            qaDoc.question_number
          )}::${embeddingType}`;

          // Check embeddingCache using api.embeddings.getCachedEmbedding
          const cached = await ctx.runQuery(api.embeddings.getCachedEmbedding, {
            hash: cacheKey,
          });

          let embedding: number[];

          if (cached && cached.embedding.length > 0) {
            // Use cached embedding
            embedding = cached.embedding;
            cacheStatus[embeddingType] = true;

            // Update access tracking
            await ctx.runMutation(api.embeddings.updateAccessTracking, {
              hash: cacheKey,
            });
          } else {
            // Generate new embedding using api.embeddings.embedForTask
            embedding = await ctx.runAction(api.embeddings.embedForTask, {
              text,
              task: taskType,
            });

            cacheStatus[embeddingType] = false;

            // Add delay to prevent rate limiting
            await sleep(5000);

            // Validate embedding dimensions (768)
            if (embedding.length !== 768) {
              throw new Error(
                `Invalid embedding dimensions for ${embeddingType}: expected 768, got ${embedding.length}`
              );
            }

            // Cache new embedding with TTL
            await ctx.runMutation(api.embeddings.cacheEmbedding, {
              hash: cacheKey,
              provider: GEMINI_PROVIDER,
              model: "gemini-embedding-001",
              dimensions: embedding.length,
              embedding,
              expiresAt: Date.now() + ttlMs,
              taskType,
              text,
            });
          }

          // Store embedding in the appropriate field
          if (embeddingType === "doc") {
            embeddings.embedding_doc = embedding;
          } else if (embeddingType === "qa") {
            embeddings.embedding_qa = embedding;
          } else {
            embeddings.embedding_fact = embedding;
          }
        } catch (error) {
          console.error(
            `Failed to generate ${embeddingType} embedding for QA document ${qaDoc.question_number || args.qaId}:`,
            error
          );
          // Don't throw - continue with other embedding types
        }
      }

      // Update QA document with all embeddings using ctx.db.patch
      const updatePayload: {
        embedding_doc?: number[];
        embedding_qa?: number[];
        embedding_fact?: number[];
      } = {};

      if (embeddings.embedding_doc) {
        updatePayload.embedding_doc = embeddings.embedding_doc;
      }
      if (embeddings.embedding_qa) {
        updatePayload.embedding_qa = embeddings.embedding_qa;
      }
      if (embeddings.embedding_fact) {
        updatePayload.embedding_fact = embeddings.embedding_fact;
      }

      if (Object.keys(updatePayload).length > 0) {
        await ctx.runMutation(api.mutations.qa.patchQA, {
          id: args.qaId,
          ...updatePayload,
        });
      }

      return {
        success: true,
        qaId: args.qaId,
        questionNumber: qaDoc.question_number,
        embeddingTypes,
        embeddings,
        cacheStatus,
        ttlMs,
        embeddingsGenerated: Object.keys(updatePayload).length,
      };
    } catch (error) {
      console.error(
        `Error during automatic embedding for QA document ${qaDoc.question_number || args.qaId}:`,
        error
      );

      return {
        success: false,
        qaId: args.qaId,
        questionNumber: qaDoc.question_number,
        embeddingTypes,
        error: error instanceof Error ? error.message : String(error),
        embeddingsGenerated: 0,
      };
    }
  },
});

// Backward compatibility exports
export const getByHash = getCachedEmbedding;
export const store = cacheEmbedding;
