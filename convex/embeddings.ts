import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { action } from "./_generated/server";

const MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const DIM = Number(process.env.EMBEDDING_DIM || "768");

const TASKS = [
  "RETRIEVAL_DOCUMENT",
  "RETRIEVAL_QUERY",
  "QUESTION_ANSWERING",
  "FACT_VERIFICATION",
] as const;

type TaskType = typeof TASKS[number];

let cachedClient: GoogleGenAI | null = null;

function composeDocText(question: string, answer: string) {
  return `${question}\n\n${answer}`.trim();
}

function ensureDim(vec: number[]) {
  if (!Array.isArray(vec) || vec.length !== DIM) {
    throw new Error(`Embedding dimension mismatch. Expected ${DIM}, got ${vec?.length || 0}`);
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
  handler: async (ctx, { text, task }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
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
  handler: async (ctx, { question, answer }) => {
    const docText = composeDocText(question, answer);
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
    const tasks: TaskType[] = ["RETRIEVAL_DOCUMENT", "QUESTION_ANSWERING", "FACT_VERIFICATION"];

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
      }),
    );

    const results: Record<TaskType, number[]> = Object.fromEntries(entries) as Record<
      TaskType,
      number[]
    >;

    return {
      embedding_doc: results["RETRIEVAL_DOCUMENT"],
      embedding_qa: results["QUESTION_ANSWERING"],
      embedding_fact: results["FACT_VERIFICATION"],
      composed: docText,
      dim: DIM,
      model: MODEL,
    };
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
  handler: async (ctx, { query, task }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
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
    const expiredEntries = allEntries.filter(entry =>
      entry.expiresAt && entry.expiresAt < now
    ).length;

    const activeEntries = totalEntries - expiredEntries;

    // Calculate total access count
    const totalAccesses = allEntries.reduce((sum, entry) =>
      sum + (entry.accessCount || 0), 0
    );

    // Calculate average access count for active entries
    const avgAccessCount = activeEntries > 0
      ? totalAccesses / activeEntries
      : 0;

    // Group by provider and model
    const providerStats = allEntries.reduce((stats, entry) => {
      const key = `${entry.provider}:${entry.model}`;
      if (!stats[key]) {
        stats[key] = { count: 0, totalAccesses: 0 };
      }
      stats[key].count++;
      stats[key].totalAccesses += entry.accessCount || 0;
      return stats;
    }, {} as Record<string, { count: number; totalAccesses: number }>);

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
        if (accessDiff !== 0) return accessDiff;

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
      .filter(entry => {
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

// Backward compatibility exports
export const getByHash = getCachedEmbedding;
export const store = cacheEmbedding;
