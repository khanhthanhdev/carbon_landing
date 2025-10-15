# Carbon Market Knowledge Base - Implementation Plan

## Project Overview
A knowledge website for carbon markets with hybrid search (vector + full-text), AI-powered Q&A using RAG with Gemini, user-submitted questions, and feedback collection.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router)
- **Backend**: Convex (Database + Functions + Vector Search + Full-Text Search)
- **Data Fetching**: TanStack Query with caching
- **AI/Embeddings**: Google Gemini (gemini-embedding-001 + gemini-2.5-flash-lite)
- **Email**: Resend or SendGrid for notifications
- **Authentication**: Clerk or Convex Auth

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Initialize Project
```bash
npx create-next-app@latest carbon-market-kb
cd carbon-market-kb
npm install convex @tanstack/react-query
npx convex dev
```

### 1.2 Install Dependencies
```bash
# Core dependencies
npm install @tanstack/react-query @google/generative-ai lucide-react

# UI Components (shadcn/ui)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input textarea card dialog toast tabs badge

# Additional utilities
npm install zod react-hook-form @hookform/resolvers date-fns
```

### 1.3 Environment Variables
Create `.env.local`:
```env
CONVEX_DEPLOYMENT=your_deployment_url
NEXT_PUBLIC_CONVEX_URL=your_NEXT_PUBLIC_CONVEX_URL
GOOGLE_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Phase 2: Data Model & Schema

### 2.1 Convex Schema (`convex/schema.ts`)
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Knowledge Base Q&A
  questions: defineTable({
    question: v.string(),
    answer: v.string(),
    sources: v.optional(v.array(v.string())), // Can be empty array or undefined
    category: v.string(), // e.g., "Carbon Credits", "Compliance", "Offsetting"
    embedding: v.array(v.float64()), // Vector for semantic search (768 dims for Gemini)
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    // Vector search index for semantic search
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768, // gemini-embedding-001 produces 768-dim vectors
      filterFields: ["category"]
    })
    // Full-text search index for keyword search
    .searchIndex("search_questions", {
      searchField: "question",
      filterFields: ["category", "createdAt"]
    })
    .searchIndex("search_answers", {
      searchField: "answer",
      filterFields: ["category"]
    })
    .index("by_category", ["category"])
    .index("by_created_at", ["createdAt"]),

  // User Submitted Questions
  userQuestions: defineTable({
    question: v.string(),
    userEmail: v.string(),
    userName: v.optional(v.string()),
    status: v.union(
      v.literal("pending"), 
      v.literal("answered"), 
      v.literal("rejected")
    ),
    answer: v.optional(v.string()),
    sources: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    answeredBy: v.optional(v.id("users")),
    answeredAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_email", ["userEmail"])
    .index("by_created_at", ["createdAt"]),

  // Feedback
  feedback: defineTable({
    rating: v.number(), // 1-5 stars
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    description: v.string(),
    page: v.optional(v.string()), // Which page feedback was submitted from
    createdAt: v.number(),
  })
    .index("by_rating", ["rating"])
    .index("by_created_at", ["createdAt"]),

  // Users (for admin)
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // AI Conversation History
  conversations: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.string(),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      sources: v.optional(v.array(v.object({
        questionId: v.id("questions"),
        question: v.string(),
        relevanceScore: v.number(),
      }))),
      timestamp: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_created_at", ["createdAt"]),

  // Search Cache for optimization
  searchCache: defineTable({
    query: v.string(),
    queryType: v.union(v.literal("vector"), v.literal("fulltext"), v.literal("hybrid")),
    results: v.array(v.id("questions")),
    category: v.optional(v.string()),
    createdAt: v.number(),
    hitCount: v.number(),
    lastAccessedAt: v.number(),
  })
    .index("by_query_type", ["query", "queryType", "category"])
    .index("by_last_accessed", ["lastAccessedAt"]),
});
```

---

## Phase 3: Gemini Integration & Embeddings

### 3.1 Gemini Helper (`convex/gemini.ts`)
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
export function getGeminiClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

// Generate embeddings with RETRIEVAL_DOCUMENT task
export async function generateEmbedding(
  apiKey: string,
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
) {
  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

  const result = await model.embedContent({
    content: { parts: [{ text }] },
    taskType,
  });

  return result.embedding.values;
}

// Generate AI response using Gemini 2.5 Flash Lite
export async function generateAIResponse(
  apiKey: string,
  prompt: string,
  context: string
) {
  const genAI = getGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: `Context:\n${context}\n\nQuestion: ${prompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  });

  return result.response.text();
}
```

### 3.2 Embedding Action (`convex/actions.ts`)
```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateEmbedding, generateAIResponse } from "./gemini";

export const createEmbedding = action({
  args: { 
    text: v.string(),
    taskType: v.optional(v.union(
      v.literal("RETRIEVAL_DOCUMENT"),
      v.literal("RETRIEVAL_QUERY")
    )),
  },
  handler: async (ctx, { text, taskType = "RETRIEVAL_DOCUMENT" }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY not configured");
    }
    return await generateEmbedding(apiKey, text, taskType);
  },
});

export const generateResponse = action({
  args: {
    prompt: v.string(),
    context: v.string(),
  },
  handler: async (ctx, { prompt, context }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY not configured");
    }
    return await generateAIResponse(apiKey, prompt, context);
  },
});
```

### 3.3 Data Import Script (`scripts/importData.ts`)
```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import questionsData from "./questions.json"; // Your 100 Q&As

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface QuestionData {
  question: string;
  answer: string;
  sources?: string[];
  category: string;
}

async function importQuestions() {
  const data: QuestionData[] = questionsData;

  console.log(`Importing ${data.length} questions...`);

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    console.log(`[${i + 1}/${data.length}] Processing: ${item.question.substring(0, 50)}...`);

    try {
      // Generate embedding using Gemini
      const embedding = await client.action(api.actions.createEmbedding, {
        text: `${item.question} ${item.answer}`,
        taskType: "RETRIEVAL_DOCUMENT",
      });

      // Insert into Convex
      await client.mutation(api.mutations.importQuestion, {
        question: item.question,
        answer: item.answer,
        sources: item.sources || [],
        category: item.category,
        embedding,
      });

      console.log(`✓ Imported successfully`);
    } catch (error) {
      console.error(`✗ Failed:`, error);
    }

    // Rate limiting - Gemini free tier has limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("Import complete!");
}

importQuestions();
```

### 3.4 Import Mutation (`convex/mutations.ts`)
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const importQuestion = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    sources: v.array(v.string()),
    category: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("questions", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

---

## Phase 4: Hybrid Search Implementation

### 4.1 Search Queries with Caching (`convex/queries.ts`)
```typescript
import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Helper: Check cache
async function checkSearchCache(
  ctx: any,
  query: string,
  queryType: "vector" | "fulltext" | "hybrid",
  category?: string
) {
  const cached = await ctx.db
    .query("searchCache")
    .withIndex("by_query_type", (q: any) => 
      q.eq("query", query)
       .eq("queryType", queryType)
       .eq("category", category)
    )
    .first();

  if (cached) {
    const isExpired = Date.now() - cached.createdAt > 1000 * 60 * 60; // 1 hour TTL
    
    if (!isExpired) {
      // Update cache stats
      await ctx.db.patch(cached._id, {
        hitCount: cached.hitCount + 1,
        lastAccessedAt: Date.now(),
      });

      // Fetch actual questions
      const questions = await Promise.all(
        cached.results.map((id: any) => ctx.db.get(id))
      );
      
      return questions.filter((q: any) => q !== null);
    }
  }
  
  return null;
}

// Helper: Save to cache
async function saveToCache(
  ctx: any,
  query: string,
  queryType: "vector" | "fulltext" | "hybrid",
  results: any[],
  category?: string
) {
  const resultIds = results.map(r => r._id);
  
  await ctx.db.insert("searchCache", {
    query,
    queryType,
    results: resultIds,
    category,
    createdAt: Date.now(),
    hitCount: 0,
    lastAccessedAt: Date.now(),
  });
}

// Vector Search (Semantic Search)
export const vectorSearch = action({
  args: { 
    query: v.string(), 
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, category, limit = 10 }) => {
    // Check cache first
    const cached = await ctx.runQuery(api.queries.getCachedSearch, {
      query,
      queryType: "vector",
      category,
    });
    
    if (cached) {
      return cached;
    }

    // Generate query embedding with RETRIEVAL_QUERY task
    const embedding = await ctx.runAction(api.actions.createEmbedding, {
      text: query,
      taskType: "RETRIEVAL_QUERY",
    });

    // Vector search
    const results = await ctx.vectorSearch("questions", "by_embedding", {
      vector: embedding,
      limit,
      filter: (q) => category ? q.eq("category", category) : true,
    });

    // Fetch full documents
    const questions = await Promise.all(
      results.map(async (result) => {
        const question = await ctx.runQuery(api.queries.getQuestion, {
          id: result._id,
        });
        return {
          ...question,
          _score: result._score,
        };
      })
    );

    // Cache results
    await ctx.runMutation(api.mutations.saveSearchCache, {
      query,
      queryType: "vector",
      results: questions.map(q => q._id),
      category,
    });

    return questions;
  },
});

// Full-Text Search
export const fullTextSearch = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query: searchQuery, category, limit = 10 }) => {
    // Check cache
    const cached = await checkSearchCache(ctx, searchQuery, "fulltext", category);
    if (cached) return cached;

    // Search in questions
    const questionResults = await ctx.db
      .query("questions")
      .withSearchIndex("search_questions", (q) =>
        q.search("question", searchQuery)
          .filter((q) => category ? q.eq("category", category) : true)
      )
      .take(limit);

    // Search in answers for additional context
    const answerResults = await ctx.db
      .query("questions")
      .withSearchIndex("search_answers", (q) =>
        q.search("answer", searchQuery)
          .filter((q) => category ? q.eq("category", category) : true)
      )
      .take(limit);

    // Combine and deduplicate
    const allResults = [...questionResults, ...answerResults];
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item._id, item])).values()
    ).slice(0, limit);

    // Cache results
    await saveToCache(ctx, searchQuery, "fulltext", uniqueResults, category);

    return uniqueResults;
  },
});

// Hybrid Search (Vector + Full-Text with RRF)
export const hybridSearch = action({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, category, limit = 10 }) => {
    // Check cache
    const cached = await ctx.runQuery(api.queries.getCachedSearch, {
      query,
      queryType: "hybrid",
      category,
    });
    
    if (cached) return cached;

    // Run both searches in parallel
    const [vectorResults, fullTextResults] = await Promise.all([
      ctx.runAction(api.queries.vectorSearch, { query, category, limit: limit * 2 }),
      ctx.runQuery(api.queries.fullTextSearch, { query, category, limit: limit * 2 }),
    ]);

    // Reciprocal Rank Fusion (RRF)
    const k = 60; // RRF constant
    const scoreMap = new Map<string, { doc: any; score: number }>();

    // Score vector results
    vectorResults.forEach((doc: any, index: number) => {
      const score = 1 / (k + index + 1);
      scoreMap.set(doc._id, { doc, score });
    });

    // Add full-text scores
    fullTextResults.forEach((doc: any, index: number) => {
      const score = 1 / (k + index + 1);
      const existing = scoreMap.get(doc._id);
      
      if (existing) {
        existing.score += score;
      } else {
        scoreMap.set(doc._id, { doc, score });
      }
    });

    // Sort by combined score
    const rankedResults = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ doc, score }) => ({ ...doc, _hybridScore: score }));

    // Cache results
    await ctx.runMutation(api.mutations.saveSearchCache, {
      query,
      queryType: "hybrid",
      results: rankedResults.map(r => r._id),
      category,
    });

    return rankedResults;
  },
});

// Helper queries
export const getCachedSearch = query({
  args: {
    query: v.string(),
    queryType: v.union(v.literal("vector"), v.literal("fulltext"), v.literal("hybrid")),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await checkSearchCache(ctx, args.query, args.queryType, args.category);
  },
});

export const getQuestion = query({
  args: { id: v.id("questions") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get all categories
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    const categories = [...new Set(questions.map(q => q.category))];
    return categories.sort();
  },
});
```

### 4.2 Cache Mutations (`convex/mutations.ts`)
```typescript
export const saveSearchCache = mutation({
  args: {
    query: v.string(),
    queryType: v.union(v.literal("vector"), v.literal("fulltext"), v.literal("hybrid")),
    results: v.array(v.id("questions")),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if cache entry already exists
    const existing = await ctx.db
      .query("searchCache")
      .withIndex("by_query_type", (q) =>
        q.eq("query", args.query)
         .eq("queryType", args.queryType)
         .eq("category", args.category)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("searchCache", {
      ...args,
      createdAt: Date.now(),
      hitCount: 0,
      lastAccessedAt: Date.now(),
    });
  },
});

// Periodic cache cleanup (call via cron)
export const cleanupExpiredCache = mutation({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 1000 * 60 * 60 * 24;
    
    const expiredCache = await ctx.db
      .query("searchCache")
      .withIndex("by_last_accessed")
      .filter((q) => q.lt(q.field("lastAccessedAt"), oneDayAgo))
      .collect();

    for (const cache of expiredCache) {
      await ctx.db.delete(cache._id);
    }

    return { deleted: expiredCache.length };
  },
});
```

---

## Phase 5: TanStack Query Hooks with Caching

### 5.1 Convex Provider Setup (`app/providers.tsx`)
```typescript
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ConvexProvider>
  );
}
```

### 5.2 Search Hooks (`hooks/useSearch.ts`)
```typescript
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConvex, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export type SearchType = "hybrid" | "vector" | "fulltext";

export function useSearch(
  query: string,
  searchType: SearchType = "hybrid",
  category?: string
) {
  const convex = useConvex();
  const hybridSearchAction = useAction(api.queries.hybridSearch);
  const vectorSearchAction = useAction(api.queries.vectorSearch);

  return useQuery({
    queryKey: ["search", searchType, query, category],
    queryFn: async () => {
      if (searchType === "hybrid") {
        return await hybridSearchAction({ query, category });
      } else if (searchType === "vector") {
        return await vectorSearchAction({ query, category });
      } else {
        return await convex.query(api.queries.fullTextSearch, { query, category });
      }
    },
    enabled: query.length > 2,
    staleTime: 1000 * 60 * 10, // 10 minutes - search results don't change often
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
}

export function useCategories() {
  const convex = useConvex();

  return useQuery({
    queryKey: ["categories"],
    queryFn: () => convex.query(api.queries.getCategories, {}),
    staleTime: Infinity, // Categories rarely change
  });
}

// Prefetch search results
export function usePrefetchSearch() {
  const queryClient = useQueryClient();
  const convex = useConvex();

  return (query: string, searchType: SearchType = "hybrid", category?: string) => {
    queryClient.prefetchQuery({
      queryKey: ["search", searchType, query, category],
      queryFn: async () => {
        if (searchType === "hybrid") {
          return await convex.action(api.queries.hybridSearch, { query, category });
        } else if (searchType === "vector") {
          return await convex.action(api.queries.vectorSearch, { query, category });
        } else {
          return await convex.query(api.queries.fullTextSearch, { query, category });
        }
      },
    });
  };
}
```

### 5.3 AI Chat Hook (`hooks/useAIChat.ts`)
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export function useAIChat(sessionId: string) {
  const askAIAction = useAction(api.actions.askAI);
  const convex = useConvex();
  const queryClient = useQueryClient();

  // Fetch conversation history
  const { data: conversation } = useQuery({
    queryKey: ["conversation", sessionId],
    queryFn: () => convex.query(api.queries.getConversation, { sessionId }),
    staleTime: 0, // Always fresh for real-time chat
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (question: string) => {
      return await askAIAction({ question, sessionId });
    },
    onSuccess: () => {
      // Invalidate conversation to refetch
      queryClient.invalidateQueries({ queryKey: ["conversation", sessionId] });
    },
  });

  return {
    messages: conversation?.messages || [],
    sendMessage: sendMessage.mutate,
    isLoading: sendMessage.isPending,
    error: sendMessage.error,
  };
}
```

---

## Phase 6: AI RAG Implementation with Gemini

### 6.1 RAG Action (`convex/actions.ts`)
```typescript
export const askAI = action({
  args: {
    question: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, { question, sessionId }) => {
    // 1. Generate query embedding
    const queryEmbedding = await ctx.runAction(api.actions.createEmbedding, {
      text: question,
      taskType: "RETRIEVAL_QUERY",
    });

    // 2. Retrieve relevant context using vector search
    const relevantDocs = await ctx.vectorSearch("questions", "by_embedding", {
      vector: queryEmbedding,
      limit: 5,
    });

    // 3. Fetch full documents
    const contextDocs = await Promise.all(
      relevantDocs.map(async (result) => ({
        ...(await ctx.runQuery(api.queries.getQuestion, { id: result._id })),
        score: result._score,
      }))
    );

    // 4. Build context string
    const contextText = contextDocs
      .map((doc, idx) => {
        const sources = doc.sources?.length 
          ? `\nSources: ${doc.sources.join(", ")}` 
          : "";
        return `[${idx + 1}] Q: ${doc.question}\nA: ${doc.answer}${sources}\nCategory: ${doc.category}`;
      })
      .join("\n\n");

    // 5. Generate AI response using Gemini
    const systemPrompt = `You are an expert assistant on carbon markets. Use the following knowledge base context to answer questions accurately and comprehensively.

IMPORTANT GUIDELINES:
- Always cite which context documents you used (e.g., "According to [1]...")
- If the context doesn't contain enough information, say so clearly
- Provide practical, actionable answers
- When sources are available, mention them
- Be concise but thorough

CONTEXT:
${contextText}`;

    const response = await ctx.runAction(api.actions.generateResponse, {
      prompt: question,
      context: systemPrompt,
    });

    // 6. Save conversation
    await ctx.runMutation(api.mutations.saveConversationMessage, {
      sessionId,
      role: "user",
      content: question,
    });

    await ctx.runMutation(api.mutations.saveConversationMessage, {
      sessionId,
      role: "assistant",
      content: response,
      sources: contextDocs.map(doc => ({
        questionId: doc._id,
        question: doc.question,
        relevanceScore: doc.score,
      })),
    });

    return {
      answer: response,
      sources: contextDocs,
    };
  },
});
```

### 6.2 Conversation Queries & Mutations (`convex/queries.ts` & `convex/mutations.ts`)
```typescript
// In queries.ts
export const getConversation = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
  },
});

// In mutations.ts
export const saveConversationMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    sources: v.optional(v.array(v.object({
      questionId: v.id("questions"),
      question: v.string(),
      relevanceScore: v.number(),
    }))),
  },
  handler: async (ctx, { sessionId, role, content, sources }) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    const message = {
      role,
      content,
      sources,
      timestamp: Date.now(),
    };

    if (conversation) {
      await ctx.db.patch(conversation._id, {
        messages: [...conversation.messages, message],
        updatedAt: Date.now(),
      });
      return conversation._id;
    } else {
      return await ctx.db.insert("conversations", {
        sessionId,
        messages: [message],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
```

---

## Phase 7: Landing Page with Smart Routing

### 7.1 Landing Page (`app/page.tsx`)
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Button } from "@/components/ui/button";
import { Sparkles, Search, Database, Users } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const handleSearch = (query: string, mode: "search" | "ai") => {
    const encodedQuery = encodeURIComponent(query);
    if (mode === "search") {
      router.push(`/search?q=${encodedQuery}`);
    } else {
      router.push(`/ai?q=${encodedQuery}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Carbon Market Knowledge Base
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Your comprehensive resource for understanding carbon markets, 
          credits, and sustainability practices. Search our knowledge base 
          or ask our AI assistant.
        </p>

        {/* Main Search Bar */}
        <div className="max-w-3xl mx-auto">
          <SearchBar onSearch={handleSearch} />
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Search className="w-8 h-8" />}
            title="Smart Search"
            description="Hybrid search combining semantic and keyword matching for the most relevant results"
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="AI Assistant"
            description="Ask questions and get intelligent answers powered by Gemini with RAG"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Community Driven"
            description="Submit questions and help grow our knowledge base together"
          />
        </div>
      </section>

      {/* Feedback Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Share Your Feedback
          </h2>
          <FeedbackForm />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="text-green-600 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
```

### 7.2 Search Bar Component (`components/SearchBar.tsx`)
```typescript
"use client";

import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string, mode: "search" | "ai") => void;
  initialQuery?: string;
  autoFocus?: boolean;
}

export function SearchBar({ 
  onSearch, 
  initialQuery = "", 
  autoFocus = false 
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSearch = (mode: "search" | "ai") => {
    if (query.trim()) {
      onSearch(query.trim(), mode);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch("search");
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search carbon market topics or ask a question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          className="flex-1 h-12 text-lg"
        />
        <Button
          onClick={() => handleSearch("search")}
          size="lg"
          variant="default"
          disabled={!query.trim()}
        >
          <Search className="w-5 h-5 mr-2" />
          Search
        </Button>
        <Button
          onClick={() => handleSearch("ai")}
          size="lg"
          variant="secondary"
          disabled={!query.trim()}
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Ask AI
        </Button>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Use <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> to search, 
        or click "Ask AI" for intelligent answers
      </p>
    </div>
  );
}
```

### 7.3 Feedback Form Component (`components/FeedbackForm.tsx`)
```typescript
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  description: z.string().min(10, "Please provide at least 10 characters"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const convex = useConvex();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: 0 },
  });

  const submitFeedback = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      return await convex.mutation(api.mutations.submitFeedback, {
        ...data,
        rating,
      });
    },
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      reset();
      setRating(0);
    },
    onError: () => {
      toast.error("Failed to submit feedback. Please try again.");
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    submitFeedback.mutate({ ...data, rating });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium mb-2">Rate your experience</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-2">Name (optional)</label>
        <Input {...register("name")} placeholder="Your name" />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium mb-2">Email (optional)</label>
        <Input {...register("email")} type="email" placeholder="your.email@example.com" />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Feedback <span className="text-red-500">*</span>
        </label>
        <Textarea
          {...register("description")}
          placeholder="Tell us about your experience..."
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={submitFeedback.isPending}
      >
        {submitFeedback.isPending ? "Submitting..." : "Submit Feedback"}
      </Button>
    </form>
  );
}
```

### 7.4 Feedback Mutation (`convex/mutations.ts`)
```typescript
export const submitFeedback = mutation({
  args: {
    rating: v.number(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("feedback", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

---

## Phase 8: Search Results Page

### 8.1 Search Page (`app/search/page.tsx`)
```typescript
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { SearchFilters } from "@/components/SearchFilters";
import { useSearch, type SearchType, useCategories } from "@/hooks/useSearch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [searchType, setSearchType] = useState<SearchType>("hybrid");
  const [selectedCategory, setSelectedCategory] = useState<string>();

  const { data: results, isLoading, error } = useSearch(query, searchType, selectedCategory);
  const { data: categories } = useCategories();

  const handleSearch = (newQuery: string, mode: "search" | "ai") => {
    if (mode === "ai") {
      router.push(`/ai?q=${encodeURIComponent(newQuery)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(newQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar 
            onSearch={handleSearch} 
            initialQuery={query}
            autoFocus={false}
          />
        </div>

        {/* Search Type Tabs */}
        <div className="mb-6 flex items-center justify-between">
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
            <TabsList>
              <TabsTrigger value="hybrid">Hybrid Search</TabsTrigger>
              <TabsTrigger value="vector">Semantic</TabsTrigger>
              <TabsTrigger value="fulltext">Keyword</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-sm text-gray-600">
            {results && `${results.length} results found`}
          </div>
        </div>

        {/* Filters and Results */}
        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <aside className="md:col-span-1">
            <SearchFilters
              categories={categories || []}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </aside>

          {/* Results */}
          <main className="md:col-span-3">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-600">Failed to load results</p>
              </div>
            )}

            {results && <SearchResults results={results} query={query} />}
          </main>
        </div>
      </div>
    </div>
  );
}
```

### 8.2 Search Results Component (`components/SearchResults.tsx`)
```typescript
"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface SearchResult {
  _id: string;
  question: string;
  answer: string;
  sources?: string[];
  category: string;
  _score?: number;
  _hybridScore?: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg mb-4">No results found for "{query}"</p>
        <p className="text-gray-500">Try different keywords or submit your question</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <ResultCard key={result._id} result={result} />
      ))}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <Badge variant="secondary">{result.category}</Badge>
        {result._hybridScore && (
          <span className="text-xs text-gray-500">
            Score: {(result._hybridScore * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="text-xl font-semibold mb-3 text-gray-900">
        {result.question}
      </h3>

      {/* Answer Preview/Full */}
      <div className="text-gray-700 mb-4">
        {expanded ? (
          <div className="prose max-w-none">
            {result.answer}
          </div>
        ) : (
          <p className="line-clamp-3">{result.answer}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Show More
            </>
          )}
        </Button>

        {result.sources && result.sources.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sources:</span>
            {result.sources.slice(0, 2).map((source, idx) => (
              <a
                key={idx}
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center"
              >
                Link {idx + 1}
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
```

### 8.3 Search Filters Component (`components/SearchFilters.tsx`)
```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface SearchFiltersProps {
  categories: string[];
  selectedCategory?: string;
  onCategoryChange: (category?: string) => void;
}

export function SearchFilters({
  categories,
  selectedCategory,
  onCategoryChange,
}: SearchFiltersProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filters</h3>
        {selectedCategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCategoryChange(undefined)}
          >
            Clear
          </Button>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Category</h4>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() =>
                onCategoryChange(
                  selectedCategory === category ? undefined : category
                )
              }
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedCategory === category
                  ? "bg-green-100 text-green-800 font-medium"
                  : "hover:bg-gray-100"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
```

---

## Phase 9: AI Chat Page with RAG

### 9.1 AI Chat Page (`app/ai/page.tsx`)
```typescript
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { SearchBar } from "@/components/SearchBar";
import { useAIChat } from "@/hooks/useAIChat";
import { v4 as uuidv4 } from "uuid";

export default function AIPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [sessionId] = useState(() => uuidv4());

  const handleSearch = (query: string, mode: "search" | "ai") => {
    if (mode === "search") {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    } else {
      router.push(`/ai?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <SearchBar 
            onSearch={handleSearch} 
            initialQuery={initialQuery}
            autoFocus={false}
          />
        </div>

        {/* Chat Interface */}
        <ChatInterface 
          sessionId={sessionId} 
          initialQuestion={initialQuery}
        />
      </div>
    </div>
  );
}
```

### 9.2 Chat Interface Component (`components/ChatInterface.tsx`)
```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles, ExternalLink } from "lucide-react";

interface ChatInterfaceProps {
  sessionId: string;
  initialQuestion?: string;
}

export function ChatInterface({ sessionId, initialQuestion }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading } = useAIChat(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasSentInitial, setHasSentInitial] = useState(false);

  // Send initial question if provided
  useEffect(() => {
    if (initialQuestion && !hasSentInitial && messages.length === 0) {
      sendMessage(initialQuestion);
      setHasSentInitial(true);
    }
  }, [initialQuestion, hasSentInitial, messages.length, sendMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="min-h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold">AI Assistant powered by Gemini</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Ask questions about carbon markets and get intelligent answers
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Start a conversation by asking a question about carbon markets
              </p>
            </div>
          )}

          {messages.map((message, idx) => (
            <MessageBubble key={idx} message={message} />
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question..."
              className="resize-none"
              rows={2}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-auto"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> to send, 
            <kbd className="px-1 py-0.5 bg-gray-100 rounded ml-1">Shift + Enter</kbd> for new line
          </p>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? "bg-green-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-300">
            <p className="text-sm font-semibold mb-2">Sources:</p>
            <div className="space-y-2">
              {message.sources.map((source: any, idx: number) => (
                <div
                  key={idx}
                  className="text-sm bg-white rounded p-2 text-gray-700"
                >
                  <p className="font-medium">{source.question}</p>
                  <span className="text-xs text-gray-500">
                    Relevance: {(source.relevanceScore * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <span className="text-xs opacity-70 mt-2 block">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
```

---

## Phase 10: User Question Submission

### 10.1 Submit Question Page (`app/submit/page.tsx`)
```typescript
"use client";

import { SubmitQuestionForm } from "@/components/SubmitQuestionForm";
import { Card } from "@/components/ui/card";
import { MessageSquarePlus } from "lucide-react";

export default function SubmitQuestionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <MessageSquarePlus className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Submit Your Question</h1>
            <p className="text-gray-600">
              Can't find the answer you're looking for? Submit your question and 
              our experts will answer it. You'll receive an email notification 
              when it's answered.
            </p>
          </div>

          <Card className="p-6">
            <SubmitQuestionForm />
          </Card>
        </div>
      </div>
    </div>
  );
}
```

### 10.2 Submit Question Form (`components/SubmitQuestionForm.tsx`)
```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react