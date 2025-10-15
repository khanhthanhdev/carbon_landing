# Carbon Market Knowledge Base - Implementation Plan

## Project Overview
A knowledge website for carbon markets with semantic search, AI-powered Q&A using RAG, user-submitted questions, and feedback collection.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router)
- **Backend**: Convex (Database + Functions + Vector Search)
- **Data Fetching**: TanStack Query (React Query) with caching
- **AI/Embeddings**: Google Gemini (gemini-embedding-001, gemini-2.5-flash-lite)
- **Email**: Resend or SendGrid for notifications
- **Authentication**: Clerk or Convex Auth

---

## Phase 1: Project Setup & Infrastructure



### 1.2 Install Dependencies
```bash
# Core dependencies
npm install @tanstack/react-query @tanstack/react-query-devtools lucide-react

# Google Generative AI SDK
npm install @google/genai

# UI Components (shadcn/ui)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input textarea card dialog toast

# Additional utilities
npm install zod react-hook-form @hookform/resolvers date-fns
```

### 1.3 Environment Variables
Create `.env.local`:
```
CONVEX_DEPLOYMENT=your_deployment_url
NEXT_PUBLIC_CONVEX_URL=your_NEXT_PUBLIC_CONVEX_URL
GOOGLE_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_key
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
    source: v.string(),
    embedding: v.array(v.float64()), // Vector for semantic search (768 dimensions for gemini-embedding-001)
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768, // gemini-embedding-001 produces 768-dimensional embeddings
      filterFields: ["category"]
    })
    .searchIndex("search_questions", {
      searchField: "question",
      filterFields: ["category"]
    }),

  // Embedding Cache - to avoid regenerating embeddings for same queries
  embeddingCache: defineTable({
    text: v.string(),
    embedding: v.array(v.float64()),
    taskType: v.string(), // RETRIEVAL_QUERY or RETRIEVAL_DOCUMENT
    createdAt: v.number(),
    lastAccessedAt: v.number(),
    accessCount: v.number(),
  })
    .index("by_text_and_task", ["text", "taskType"])
    .index("by_last_accessed", ["lastAccessedAt"]),

  // Search Results Cache - cache semantic search results
  searchCache: defineTable({
    queryHash: v.string(), // Hash of the query
    queryText: v.string(),
    results: v.array(v.id("questions")),
    scores: v.array(v.float64()),
    createdAt: v.number(),
    expiresAt: v.number(), // TTL for cache invalidation
  }).index("by_query_hash", ["queryHash"])
    .index("by_expires", ["expiresAt"]),

  // User Submitted Questions
  userQuestions: defineTable({
    question: v.string(),
    userEmail: v.string(),
    userName: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("answered"), v.literal("rejected")),
    answer: v.optional(v.string()),
    source: v.optional(v.string()),
    answeredBy: v.optional(v.id("users")),
    answeredAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_email", ["userEmail"]),

  // Feedback
  feedback: defineTable({
    rating: v.number(), // 1-5 stars
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    description: v.string(),
    createdAt: v.number(),
  }).index("by_rating", ["rating"]),

  // Users (for admin)
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // AI Conversation History with caching
  conversations: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.string(),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
      cached: v.optional(v.boolean()), // Flag if response was cached
    })),
    createdAt: v.number(),
    lastUpdatedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // AI Response Cache - cache AI responses for similar questions
  aiResponseCache: defineTable({
    questionHash: v.string(),
    question: v.string(),
    answer: v.string(),
    sources: v.array(v.id("questions")),
    createdAt: v.number(),
    expiresAt: v.number(),
    hitCount: v.number(),
  }).index("by_question_hash", ["questionHash"])
    .index("by_expires", ["expiresAt"]),
});
```

---

## Phase 3: Data Migration & Embeddings with Gemini

### 3.1 Gemini Helper (`convex/lib/gemini.ts`)
```typescript
import { GoogleGenAI } from "@google/genai";

export class GeminiHelper {
  private genAI: GoogleGenAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI(apiKey);
  }

  async generateEmbedding(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      taskType: taskType,
    });
    
    return result.embedding.values;
  }

  async generateResponse(prompt: string, context: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

Retrieve information from texts
Key Point: To get embeddings that you can use for information retrieval, use the RETRIEVAL_DOCUMENT task type to embed your documents and the RETRIEVAL_QUERY task type to embed user queries.
When you build a search or retrieval system, you work with two types of text:

Corpus: The collection of documents that you want to search over.
Query: The text that a user provides to search for information within the corpus.
To get the best performance, you must use different task types to generate embeddings for your corpus and your queries.

First, generate embeddings for your entire collection of documents. This is the content that will be retrieved by user queries. When embedding these documents, use the RETRIEVAL_DOCUMENT task type. You typically perform this step once to index your entire corpus and then store the resulting embeddings in a vector database.

Next, when a user submits a search, you generate an embedding for their query text in real time. For this, you should use a task type that matches the user's intent. Your system will then use this query embedding to find the most similar document embeddings in your vector database.

The following task types are used for queries:

RETRIEVAL_QUERY: Use this for a standard search query where you want to find relevant documents. The model looks for document embeddings that are semantically close to the query embedding.
QUESTION_ANSWERING: Use this when all queries are expected to be proper questions, such as "Why is the sky blue?" or "How do I tie my shoelaces?".
FACT_VERIFICATION: Use this when you want to retrieve a document from your corpus that proves or disproves a statement. For example, the query "apples grow underground" might retrieve an article about apples that would ultimately disprove the statement.
Consider the following real-world scenario where retrieval queries would be useful:

For an ecommerce platform, you want to use embeddings to enable users to search for products using both text queries and images, providing a more intuitive and engaging shopping experience.
For an educational platform, you want to build a question-answering system that can answer students' questions based on textbook content or educational resources, providing personalized learning experiences and helping students understand complex concepts.
```

### 3.2 Convex Action for Embedding with Cache (`convex/actions.ts`)
```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { GeminiHelper } from "./lib/gemini";

export const generateEmbedding = action({
  args: { 
    text: v.string(),
    taskType: v.union(v.literal("RETRIEVAL_DOCUMENT"), v.literal("RETRIEVAL_QUERY")),
  },
  handler: async (ctx, { text, taskType }) => {
    // Check cache first
    const cached = await ctx.runQuery(api.queries.getCachedEmbedding, { text, taskType });
    
    if (cached) {
      // Update access stats
      await ctx.runMutation(api.mutations.updateEmbeddingCacheStats, { 
        cacheId: cached._id 
      });
      return cached.embedding;
    }
    
    // Generate new embedding
    const gemini = new GeminiHelper(process.env.GOOGLE_API_KEY!);
    const embedding = await gemini.generateEmbedding(text, taskType);
    
    // Cache the embedding
    await ctx.runMutation(api.mutations.cacheEmbedding, {
      text,
      embedding,
      taskType,
    });
    
    return embedding;
  },
});
```

### 3.3 Cache Queries and Mutations (`convex/queries.ts` & `convex/mutations.ts`)
```typescript
// queries.ts
export const getCachedEmbedding = query({
  args: { 
    text: v.string(),
    taskType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("embeddingCache")
      .withIndex("by_text_and_task", (q) => 
        q.eq("text", args.text).eq("taskType", args.taskType)
      )
      .first();
  },
});

// mutations.ts
export const cacheEmbedding = mutation({
  args: {
    text: v.string(),
    embedding: v.array(v.float64()),
    taskType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("embeddingCache", {
      ...args,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
    });
  },
});

export const updateEmbeddingCacheStats = mutation({
  args: { cacheId: v.id("embeddingCache") },
  handler: async (ctx, { cacheId }) => {
    const cache = await ctx.db.get(cacheId);
    if (cache) {
      await ctx.db.patch(cacheId, {
        lastAccessedAt: Date.now(),
        accessCount: cache.accessCount + 1,
      });
    }
  },
});
```

### 3.4 Import Function with Gemini Embeddings
```typescript
export const importQuestion = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    source: v.string(),
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

### 3.5 Migration Script (`scripts/importData.mjs`)
```bash
pnpm run migrate
```

- Reads `data/carbon-qa.json`, generates Gemini embeddings for each answer (using `GOOGLE_API_KEY`/`GEMINI_API_KEY`)
- Calls Convex mutations to replace the `questions` table and seed landing content
- Requires `NEXT_PUBLIC_CONVEX_URL` to point at the deployment where the data should live

---

## Phase 4: Landing Page

### 4.1 Landing Page Structure (`app/page.tsx`)
```tsx
- Hero Section with value proposition
- Search Bar (prominent)
  - Input field
  - Two buttons: "Search" | "Ask AI"
- Features overview
- Recent Q&As preview
- Feedback Form
- Footer
```

### 4.2 Search Bar Component (`components/SearchBar.tsx`)
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleAskAI = () => {
    if (query.trim()) {
      router.push(`/ai?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Ask anything about carbon markets..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
      </div>
      <div className="flex gap-2 justify-center">
        <Button onClick={handleSearch} variant="default">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
        <Button onClick={handleAskAI} variant="secondary">
          <Sparkles className="w-4 h-4 mr-2" />
          Ask AI
        </Button>
      </div>
    </div>
  );
}
```

### 4.3 Feedback Form Component (`components/FeedbackForm.tsx`)
```typescript
// Star rating (1-5)
// Name (optional)
// Email (optional)
// Description (required)
// Submit to Convex mutation
```

---

## Phase 5: Search Functionality with Multi-Layer Caching

### 5.1 Search Page (`app/search/page.tsx`)
```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { SearchBar } from '@/components/SearchBar';
import { QuestionCard } from '@/components/QuestionCard';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const { data: results, isLoading, error } = useSemanticSearch(query);

  return (
    <div className="container mx-auto py-8">
      <SearchBar initialQuery={query} />
      
      {isLoading && <div>Searching...</div>}
      {error && <div>Error: {error.message}</div>}
      
      {results && (
        <div className="mt-8 space-y-4">
          <h2 className="text-2xl font-bold">
            Found {results.length} results
          </h2>
          <div className="grid gap-4">
            {results.map((result) => (
              <QuestionCard key={result._id} {...result} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 5.2 Semantic Search with Cache (`convex/queries.ts`)
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import crypto from "crypto";

export const semanticSearch = query({
  args: { 
    query: v.string(), 
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, limit = 10 }) => {
    // Generate hash for cache lookup
    const queryHash = crypto
      .createHash('sha256')
      .update(query + limit.toString())
      .digest('hex');
    
    // Check cache first (5-minute TTL)
    const cached = await ctx.db
      .query("searchCache")
      .withIndex("by_query_hash", (q) => q.eq("queryHash", queryHash))
      .first();
    
    const now = Date.now();
    
    if (cached && cached.expiresAt > now) {
      // Return cached results
      const results = await Promise.all(
        cached.results.map(async (id, index) => {
          const doc = await ctx.db.get(id);
          return doc ? { ...doc, _score: cached.scores[index] } : null;
        })
      );
      return results.filter(Boolean);
    }
    
    // Cache miss - need to perform vector search via action
    // This will be handled by the action below
    return null;
  },
});
```

### 5.3 Semantic Search Action (`convex/actions.ts`)
```typescript
export const performSemanticSearch = action({
  args: { 
    query: v.string(), 
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, limit = 10 }) => {
    // Generate hash for cache
    const crypto = await import("crypto");
    const queryHash = crypto
      .createHash('sha256')
      .update(query + limit.toString())
      .digest('hex');
    
    // Check if we have cached results first
    const cached = await ctx.runQuery(api.queries.getCachedSearchResults, {
      queryHash,
    });
    
    if (cached) {
      return cached;
    }
    
    // 1. Generate embedding for query with RETRIEVAL_QUERY task type
    const embedding = await ctx.runAction(api.actions.generateEmbedding, { 
      text: query,
      taskType: "RETRIEVAL_QUERY",
    });
    
    // 2. Vector search in Convex
    const results = await ctx.vectorSearch("questions", "by_embedding", {
      vector: embedding,
      limit,
    });
    
    // 3. Fetch full documents
    const fullResults = await Promise.all(
      results.map(async (result) => {
        const doc = await ctx.runQuery(api.queries.getQuestion, { 
          id: result._id 
        });
        return {
          ...doc,
          _score: result._score,
        };
      })
    );
    
    // 4. Cache the results (5-minute TTL)
    await ctx.runMutation(api.mutations.cacheSearchResults, {
      queryHash,
      queryText: query,
      results: results.map(r => r._id),
      scores: results.map(r => r._score),
      ttlMinutes: 5,
    });
    
    return fullResults;
  },
});
```

### 5.4 Cache Mutations (`convex/mutations.ts`)
```typescript
export const cacheSearchResults = mutation({
  args: {
    queryHash: v.string(),
    queryText: v.string(),
    results: v.array(v.id("questions")),
    scores: v.array(v.float64()),
    ttlMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const expiresAt = Date.now() + args.ttlMinutes * 60 * 1000;
    
    return await ctx.db.insert("searchCache", {
      queryHash: args.queryHash,
      queryText: args.queryText,
      results: args.results,
      scores: args.scores,
      createdAt: Date.now(),
      expiresAt,
    });
  },
});

export const getCachedSearchResults = query({
  args: { queryHash: v.string() },
  handler: async (ctx, { queryHash }) => {
    const cached = await ctx.db
      .query("searchCache")
      .withIndex("by_query_hash", (q) => q.eq("queryHash", queryHash))
      .first();
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }
    
    return null;
  },
});
```

### 5.5 TanStack Query Hook with Caching (`hooks/useSemanticSearch.ts`)
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useSemanticSearch(query: string) {
  const convex = useConvex();
  
  return useQuery({
    queryKey: ['semantic-search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      // Try query cache first (Convex-level cache)
      const cachedResults = await convex.query(api.queries.semanticSearch, { 
        query: query.trim() 
      });
      
      if (cachedResults) {
        return cachedResults;
      }
      
      // Perform full search with embedding generation
      return await convex.action(api.actions.performSemanticSearch, {
        query: query.trim(),
      });
    },
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - TanStack Query cache
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
```

---

## Phase 6: AI Chat with RAG and Response Caching

### 6.1 AI Chat Page (`app/ai/page.tsx`)
```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/ChatInterface';

export default function AIPage() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get('q') || '';
  
  return (
    <div className="container mx-auto py-8">
      <ChatInterface initialQuestion={initialQuestion} />
    </div>
  );
}
```

### 6.2 RAG Implementation with Multi-Level Caching (`convex/actions.ts`)
```typescript
export const askAI = action({
  args: { 
    question: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, { question, sessionId }) => {
    // Generate hash for response cache
    const crypto = await import("crypto");
    const questionHash = crypto
      .createHash('sha256')
      .update(question.toLowerCase().trim())
      .digest('hex');
    
    // 1. Check if we have a cached response (10-minute TTL)
    const cachedResponse = await ctx.runQuery(api.queries.getCachedAIResponse, {
      questionHash,
    });
    
    if (cachedResponse) {
      // Update hit count
      await ctx.runMutation(api.mutations.updateAIResponseCacheHit, {
        cacheId: cachedResponse._id,
      });
      
      // Save to conversation with cache flag
      await ctx.runMutation(api.mutations.saveMessage, {
        sessionId,
        role: "user",
        content: question,
      });
      
      await ctx.runMutation(api.mutations.saveMessage, {
        sessionId,
        role: "assistant",
        content: cachedResponse.answer,
        cached: true,
      });
      
      // Fetch source details
      const sources = await Promise.all(
        cachedResponse.sources.map(id => 
          ctx.runQuery(api.queries.getQuestion, { id })
        )
      );
      
      return { 
        answer: cachedResponse.answer, 
        sources,
        fromCache: true,
      };
    }
    
    // 2. Generate embedding for question (RETRIEVAL_QUERY)
    const embedding = await ctx.runAction(api.actions.generateEmbedding, { 
      text: question,
      taskType: "RETRIEVAL_QUERY",
    });
    
    // 3. Retrieve top 5 relevant Q&As from vector DB
    const searchResults = await ctx.vectorSearch("questions", "by_embedding", {
      vector: embedding,
      limit: 5,
    });
    
    const contextDocs = await Promise.all(
      searchResults.map(r => ctx.runQuery(api.queries.getQuestion, { id: r._id }))
    );
    
    const contextText = contextDocs
      .map((doc, i) => 
        `[${i + 1}] Question: ${doc.question}\nAnswer: ${doc.answer}\nSource: ${doc.source}`
      )
      .join("\n\n");
    
    // 4. Call Gemini with context
    const gemini = new GeminiHelper(process.env.GOOGLE_API_KEY!);
    
    const prompt = `You are a carbon market expert assistant. Answer the user's question using the following knowledge base context. Always cite sources using [1], [2], etc. when available. If the context doesn't contain relevant information, say so honestly.

Context:
${contextText}

User Question: ${question}

Provide a clear, accurate answer:`;

    const answer = await gemini.generateResponse(prompt, contextText);
    
    // 5. Cache the response (10-minute TTL)
    await ctx.runMutation(api.mutations.cacheAIResponse, {
      questionHash,
      question,
      answer,
      sources: searchResults.map(r => r._id),
      ttlMinutes: 10,
    });
    
    // 6. Save conversation
    await ctx.runMutation(api.mutations.saveMessage, {
      sessionId,
      role: "user",
      content: question,
    });
    
    await ctx.runMutation(api.mutations.saveMessage, {
      sessionId,
      role: "assistant",
      content: answer,
      cached: false,
    });
    
    return { 
      answer, 
      sources: contextDocs,
      fromCache: false,
    };
  },
});
```

### 6.3 AI Response Cache Queries and Mutations
```typescript
// queries.ts
export const getCachedAIResponse = query({
  args: { questionHash: v.string() },
  handler: async (ctx, { questionHash }) => {
    const cached = await ctx.db
      .query("aiResponseCache")
      .withIndex("by_question_hash", (q) => q.eq("questionHash", questionHash))
      .first();
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }
    
    return null;
  },
});

// mutations.ts
export const cacheAIResponse = mutation({
  args: {
    questionHash: v.string(),
    question: v.string(),
    answer: v.string(),
    sources: v.array(v.id("questions")),
    ttlMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const expiresAt = Date.now() + args.ttlMinutes * 60 * 1000;
    
    return await ctx.db.insert("aiResponseCache", {
      questionHash: args.questionHash,
      question: args.question,
      answer: args.answer,
      sources: args.sources,
      createdAt: Date.now(),
      expiresAt,
      hitCount: 0,
    });
  },
});

export const updateAIResponseCacheHit = mutation({
  args: { cacheId: v.id("aiResponseCache") },
  handler: async (ctx, { cacheId }) => {
    const cache = await ctx.db.get(cacheId);
    if (cache) {
      await ctx.db.patch(cacheId, {
        hitCount: cache.hitCount + 1,
      });
    }
  },
});
```

### 6.4 TanStack Query Hook for AI Chat (`hooks/useAIChat.ts`)
```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useAIChat(sessionId: string) {
  const convex = useConvex();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (question: string) => {
      return await convex.action(api.actions.askAI, {
        question,
        sessionId,
      });
    },
    onSuccess: (data) => {
      // Invalidate conversation cache if needed
      queryClient.invalidateQueries({ 
        queryKey: ['conversation', sessionId] 
      });
    },
    // Cache successful responses in TanStack Query
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
```

### 6.5 Chat UI Component (`components/ChatInterface.tsx`)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  cached?: boolean;
}

export function ChatInterface({ initialQuestion }: { initialQuestion?: string }) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const { mutate: sendMessage, isPending } = useAIChat(sessionId);
  
  useEffect(() => {
    if (initialQuestion) {
      handleSend(initialQuestion);
    }
  }, []);
  
  const handleSend = (question?: string) => {
    const messageToSend = question || input;
    if (!messageToSend.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setInput('');
    
    sendMessage(messageToSend, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.answer,
          cached: data.fromCache,
        }]);
      },
    });
  };
  
  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}>
              {msg.content}
              {msg.cached && (
                <span className="text-xs opacity-70 ml-2">(cached)</span>
              )}
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">Thinking...</div>
          </div>
        )}
      </div>
      
      <div className="border-t p-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a follow-up question..."
          disabled={isPending}
        />
        <Button onClick={() => handleSend()} disabled={isPending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

## Phase 7: User Question Submission

### 7.1 Submit Question Form (`components/SubmitQuestionForm.tsx`)
```tsx
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

export function SubmitQuestionForm() {
  const [question, setQuestion] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const convex = useConvex();
  
  const { mutate: submitQuestion, isPending } = useMutation({
    mutationFn: async () => {
      return await convex.mutation(api.mutations.submitQuestion, {
        question,
        userEmail: email,
        userName: name || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Question submitted!",
        description: "We'll notify you via email when it's answered.",
      });
      setQuestion('');
      setName('');
      setEmail('');
    },
  });
  
  return (
    <div className="space-y-4">
      <Textarea
        placeholder="What would you like to know about carbon markets?"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={4}
      />
      <Input
        placeholder="Your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button 
        onClick={() => submitQuestion()} 
        disabled={isPending || !question.trim() || !email.trim()}
      >
        Submit Question
      </Button>
    </div>
  );
}
```

### 7.2 Mutation (`convex/mutations.ts`)
```typescript
export const submitQuestion = mutation({
  args: {
    question: v.string(),
    userEmail: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Insert user question
    const questionId = await ctx.db.insert("userQuestions", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
    
    // Notify admin (schedule email)
    await ctx.scheduler.runAfter(0, api.actions.notifyAdminNewQuestion, {
      questionId,
    });
    
    return questionId;
  },
});
```

---

## Phase 8: Admin Dashboard

### 8.1 Admin Page (`app/admin/page.tsx`)
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionReviewCard } from '@/components/QuestionReviewCard';

export default function AdminPage() {
  const convex = useConvex();
  
  const { data: pendingQuestions } = useQuery({
    queryKey: ['admin-questions', 'pending'],
    queryFn: () => convex.query(api.queries.getUserQuestionsByStatus, { 
      status: "pending" 
    }),
    refetchInterval: 10000, // Poll every 10 seconds
  });
  
  const { data: answeredQuestions } = useQuery({
    queryKey: ['admin-questions', 'answered'],
    queryFn: () => convex.query(api.queries.getUserQuestionsByStatus, { 
      status: "answered" 
    }),
    staleTime: 60000, // 1 minute
  });
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingQuestions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="answered">
            Answered ({answeredQuestions?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingQuestions?.map((q) => (
            <QuestionReviewCard key={q._id} question={q} />
          ))}
        </TabsContent>
        
        <TabsContent value="answered" className="space-y-4">
          {answeredQuestions?.map((q) => (
            <QuestionReviewCard key={q._id} question={q} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 8.2 Question Review Component (`components/QuestionReviewCard.tsx`)
```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export function QuestionReviewCard({ question }: any) {
  const [answer, setAnswer] = useState('');
  const [source, setSource] = useState('');
  const convex = useConvex();
  const queryClient = useQueryClient();
  
  const { mutate: answerQuestion, isPending } = useMutation({
    mutationFn: async () => {
      return await convex.action(api.actions.answerUserQuestion, {
        questionId: question._id,
        answer,
        source,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      setAnswer('');
      setSource('');
    },
  });
  
  if (question.status === 'answered') {
    return (
      <Card className="p-4">
        <div className="space-y-2">
          <p className="font-semibold">{question.question}</p>
          <p className="text-sm text-gray-600">{question.userEmail}</p>
          <div className="bg-green-50 p-3 rounded">
            <p className="text-sm font-medium">Answer:</p>
            <p>{question.answer}</p>
            <p className="text-xs text-gray-500 mt-2">Source: {question.source}</p>
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <p className="font-semibold">{question.question}</p>
          <p className="text-sm text-gray-600">
            From: {question.userName || 'Anonymous'} ({question.userEmail})
          </p>
          <p className="text-xs text-gray-400">
            {new Date(question.createdAt).toLocaleString()}
          </p>
        </div>
        
        <Textarea
          placeholder="Write your answer..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
        />
        
        <Input
          placeholder="Source URL or reference"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        
        <div className="flex gap-2">
          <Button 
            onClick={() => answerQuestion()}
            disabled={isPending || !answer.trim() || !source.trim()}
          >
            Answer & Publish
          </Button>
          <Button variant="outline" disabled={isPending}>
            Reject
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

### 8.3 Admin Mutations and Actions (`convex/actions.ts`)
```typescript
export const answerUserQuestion = action({
  args: {
    questionId: v.id("userQuestions"),
    answer: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.runQuery(api.queries.getUserQuestion, { 
      id: args.questionId 
    });
    
    if (!question) throw new Error("Question not found");
    
    // 1. Generate embedding for the new Q&A pair (RETRIEVAL_DOCUMENT)
    const embedding = await ctx.runAction(api.actions.generateEmbedding, {
      text: question.question,
      taskType: "RETRIEVAL_DOCUMENT",
    });
    
    // 2. Add to knowledge base
    await ctx.runMutation(api.mutations.importQuestion, {
      question: question.question,
      answer: args.answer,
      source: args.source,
      embedding,
    });
    
    // 3. Update user question status
    await ctx.runMutation(api.mutations.updateUserQuestionStatus, {
      questionId: args.questionId,
      status: "answered",
      answer: args.answer,
      source: args.source,
    });
    
    // 4. Invalidate caches (since we added new knowledge)
    await ctx.runMutation(api.mutations.clearExpiredCaches);
    
    // 5. Send email notification to user
    await ctx.runAction(api.actions.sendAnswerEmail, {
      email: question.userEmail,
      question: question.question,
      answer: args.answer,
    });
    
    return { success: true };
  },
});
```

---

## Phase 9: Email Notifications

### 9.1 Email Actions (`convex/actions.ts`)
```typescript
import { Resend } from 'resend';

export const sendAnswerEmail = action({
  args: {
    email: v.string(),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, { email, question, answer }) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'Carbon Market KB <noreply@yourdomain.com>',
      to: email,
      subject: 'Your carbon market question has been answered!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Your Question Has Been Answered</h2>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Question:</p>
            <p style="margin: 10px 0 0 0; font-weight: 600;">${question}</p>
          </div>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #059669; font-size: 14px;">Answer:</p>
            <p style="margin: 10px 0 0 0; line-height: 1.6;">${answer}</p>
          </div>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/search?q=${encodeURIComponent(question)}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View on Website
          </a>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This answer has been added to our knowledge base and will help other users too!
          </p>
        </div>
      `,
    });
  },
});

export const notifyAdminNewQuestion = action({
  args: {
    questionId: v.id("userQuestions"),
  },
  handler: async (ctx, { questionId }) => {
    const question = await ctx.runQuery(api.queries.getUserQuestion, { 
      id: questionId 
    });
    
    if (!question) return;
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'Carbon Market KB <noreply@yourdomain.com>',
      to: process.env.ADMIN_EMAIL!,
      subject: 'New question submitted',
      html: `
        <h2>New Question Submitted</h2>
        <p><strong>Question:</strong> ${question.question}</p>
        <p><strong>From:</strong> ${question.userName || 'Anonymous'} (${question.userEmail})</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">Review in Dashboard</a>
      `,
    });
  },
});
```

---

## Phase 10: Cache Management & Optimization

### 10.1 Cache Cleanup Cron Job (`convex/crons.ts`)
```typescript
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Clear expired caches every hour
crons.interval(
  "clear-expired-caches",
  { hours: 1 },
  api.mutations.clearExpiredCaches,
);

// Clean up old embedding cache entries (keep only frequently accessed)
crons.interval(
  "cleanup-embedding-cache",
  { days: 1 },
  api.mutations.cleanupEmbeddingCache,
);

// Generate cache statistics
crons.interval(
  "generate-cache-stats",
  { hours: 6 },
  api.mutations.generateCacheStats,
);

export default crons;
```

### 10.2 Cache Management Mutations (`convex/mutations.ts`)
```typescript
export const clearExpiredCaches = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Clear expired search caches
    const expiredSearchCaches = await ctx.db
      .query("searchCache")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();
    
    for (const cache of expiredSearchCaches) {
      await ctx.db.delete(cache._id);
    }
    
    // Clear expired AI response caches
    const expiredAICaches = await ctx.db
      .query("aiResponseCache")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();
    
    for (const cache of expiredAICaches) {
      await ctx.db.delete(cache._id);
    }
    
    return {
      searchCachesCleared: expiredSearchCaches.length,
      aiCachesCleared: expiredAICaches.length,
    };
  },
});

export const cleanupEmbeddingCache = mutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    // Delete embeddings not accessed in 30 days with low access count
    const oldCaches = await ctx.db
      .query("embeddingCache")
      .withIndex("by_last_accessed", (q) => q.lt("lastAccessedAt", thirtyDaysAgo))
      .collect();
    
    let deleted = 0;
    for (const cache of oldCaches) {
      if (cache.accessCount < 5) {
        await ctx.db.delete(cache._id);
        deleted++;
      }
    }
    
    return { deleted };
  },
});

export const generateCacheStats = mutation({
  args: {},
  handler: async (ctx) => {
    const [searchCaches, aiCaches, embeddingCaches] = await Promise.all([
      ctx.db.query("searchCache").collect(),
      ctx.db.query("aiResponseCache").collect(),
      ctx.db.query("embeddingCache").collect(),
    ]);
    
    const stats = {
      searchCacheSize: searchCaches.length,
      aiCacheSize: aiCaches.length,
      embeddingCacheSize: embeddingCaches.length,
      totalAICacheHits: aiCaches.reduce((sum, c) => sum + c.hitCount, 0),
      totalEmbeddingAccess: embeddingCaches.reduce((sum, c) => sum + c.accessCount, 0),
    };
    
    console.log("Cache Statistics:", stats);
    return stats;
  },
});
```

### 10.3 TanStack Query Provider Setup (`app/providers.tsx`)
```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useState } from 'react';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes default
        gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 1,
      },
    },
  }));

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

---

## Phase 11: Performance Optimization

### 11.1 Prefetching Common Queries (`hooks/usePrefetchCommonQueries.ts`)
```typescript
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function usePrefetchCommonQueries() {
  const queryClient = useQueryClient();
  const convex = useConvex();
  
  useEffect(() => {
    // Prefetch frequently asked questions
    const commonQueries = [
      'carbon credits',
      'carbon offset',
      'voluntary carbon market',
      'compliance carbon market',
    ];
    
    commonQueries.forEach(query => {
      queryClient.prefetchQuery({
        queryKey: ['semantic-search', query],
        queryFn: () => convex.action(api.actions.performSemanticSearch, { 
          query 
        }),
        staleTime: 10 * 60 * 1000, // 10 minutes
      });
    });
  }, [queryClient, convex]);
}
```

### 11.2 Batch Embedding Generation (`convex/actions.ts`)
```typescript
export const batchGenerateEmbeddings = action({
  args: {
    texts: v.array(v.string()),
    taskType: v.union(v.literal("RETRIEVAL_DOCUMENT"), v.literal("RETRIEVAL_QUERY")),
  },
  handler: async (ctx, { texts, taskType }) => {
    const gemini = new GeminiHelper(process.env.GOOGLE_API_KEY!);
    
    // Generate embeddings in parallel with rate limiting
    const embeddings = await Promise.all(
      texts.map(async (text, index) => {
        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        // Check cache first
        const cached = await ctx.runQuery(api.queries.getCachedEmbedding, {
          text,
          taskType,
        });
        
        if (cached) {
          return cached.embedding;
        }
        
        // Generate new
        const embedding = await gemini.generateEmbedding(text, taskType);
        
        // Cache it
        await ctx.runMutation(api.mutations.cacheEmbedding, {
          text,
          embedding,
          taskType,
        });
        
        return embedding;
      })
    );
    
    return embeddings;
  },
});
```

### 11.3 Lazy Loading and Code Splitting
```typescript
// app/ai/page.tsx
import dynamic from 'next/dynamic';

const ChatInterface = dynamic(() => 
  import('@/components/ChatInterface').then(mod => ({ default: mod.ChatInterface })),
  { 
    loading: () => <div>Loading chat...</div>,
    ssr: false 
  }
);

export default function AIPage() {
  // ... rest of the code
}
```

---

## Phase 12: Analytics & Monitoring

### 12.1 Analytics Schema Addition
```typescript
// Add to schema.ts
analytics: defineTable({
  eventType: v.union(
    v.literal("search"),
    v.literal("ai_query"),
    v.literal("question_submit"),
    v.literal("feedback_submit")
  ),
  query: v.optional(v.string()),
  userId: v.optional(v.string()),
  sessionId: v.string(),
  metadata: v.optional(v.any()),
  cacheHit: v.optional(v.boolean()),
  responseTime: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_event_type", ["eventType"])
  .index("by_created_at", ["createdAt"]),
```

### 12.2 Analytics Tracking (`convex/mutations.ts`)
```typescript
export const trackEvent = mutation({
  args: {
    eventType: v.string(),
    query: v.optional(v.string()),
    sessionId: v.string(),
    cacheHit: v.optional(v.boolean()),
    responseTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analytics", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

### 12.3 Admin Analytics Dashboard
```typescript
export const getAnalyticsSummary = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const events = await ctx.db
      .query("analytics")
      .withIndex("by_created_at", (q) => 
        q.gte("createdAt", startDate).lte("createdAt", endDate)
      )
      .collect();
    
    const summary = {
      totalSearches: events.filter(e => e.eventType === "search").length,
      totalAIQueries: events.filter(e => e.eventType === "ai_query").length,
      cacheHitRate: events.filter(e => e.cacheHit).length / events.length,
      avgResponseTime: events
        .filter(e => e.responseTime)
        .reduce((sum, e) => sum + (e.responseTime || 0), 0) / events.length,
      popularQueries: {} // Implement query frequency analysis
    };
    
    return summary;
  },
});
```

---

## Implementation Timeline (Updated)

**Week 1: Foundation**
- Days 1-2: Project setup, Gemini integration, caching infrastructure
- Days 3-4: Schema design, migrations, batch embedding generation
- Day 5: Landing page with search bar routing

**Week 2: Core Features**
- Days 1-2: Semantic search with multi-layer caching
- Days 3-4: AI RAG chat with response caching
- Day 5: Question submission system

**Week 3: Admin & Growth**
- Days 1-2: Admin dashboard and review system
- Day 3: Email notifications
- Days 4-5: Cache optimization and analytics

**Week 4: Polish & Deploy**
- Days 1-2: Performance optimization, prefetching
- Day 3: UI/UX refinements, responsive design
- Days 4-5: Testing, deployment, monitoring setup

---

## Key Optimization Strategies

### 1. **Three-Layer Caching**
   - **Layer 1**: TanStack Query (client-side, 5-10 min)
   - **Layer 2**: Convex DB cache tables (server-side, 5-30 min)
   - **Layer 3**: Gemini embeddings cache (persistent, based on access patterns)

### 2. **Cache Invalidation Strategy**
   - Search cache: 5-minute TTL
   - AI response cache: 10-minute TTL
   - Embedding cache: Access-based (30 days + low access count)
   - Manual invalidation when new Q&As added

### 3. **Performance Metrics to Monitor**
   - Cache hit rates (target: >70%)
   - Average response times
   - Gemini API call frequency
   - Database query performance

### 4. **Cost Optimization**
   - Batch embedding generation during migration
   - Aggressive caching to reduce Gemini API calls
   - Use cheaper gemini-2.0-flash-exp for responses
   - Monitor and alert on API usage spikes

---

## Environment Variables Reference

```env
# Convex
CONVEX_DEPLOYMENT=your_deployment_url
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Google AI
GOOGLE_API_KEY=your_gemini_api_key

# Email
RESEND_API_KEY=re_your_key
ADMIN_EMAIL=admin@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

---

## File Structure (Complete)

```
carbon-market-kb/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing page
│   ├── providers.tsx                # Query & Convex providers
│   ├── search/
│   │   └── page.tsx                # Search results
│   ├── ai/
│   │   └── page.tsx                # AI chat interface
│   ├── admin/
│   │   ├── page.tsx                # Admin dashboard
│   │   └── analytics/
│   │       └── page.tsx            # Analytics dashboard
│   └── submit-question/
│       └── page.tsx                # Submit question form
├── components/
│   ├── ui/                         # shadcn components
│   ├── SearchBar.tsx               # Main search component
│   ├── FeedbackForm.tsx            # Landing page feedback
│   ├── ChatInterface.tsx           # AI chat UI
│   ├── QuestionCard.tsx            # Search result card
│   ├── QuestionReviewCard.tsx      # Admin review card
│   └── SubmitQuestionForm.tsx      # User submission form
├── convex/
│   ├── _generated/
│   ├── schema.ts                   # Database schema
│   ├── queries.ts                  # Read operations
│   ├── mutations.ts                # Write operations
│   ├── actions.ts                  # External API calls
│   ├── crons.ts                    # Scheduled jobs
│   ├── http.ts                     # HTTP endpoints (optional)
│   └── lib/
│       └── gemini.ts               # Gemini helper class
├── hooks/
│   ├── useSemanticSearch.ts        # Search hook with cache
│   ├── useAIChat.ts                # AI chat hook
│   └── usePrefetchCommonQueries.ts # Prefetch optimization
├── lib/
│   ├── utils.ts                    # Utility functions
│   └── constants.ts                # App constants
├── scripts/
│   └── importData.mjs              # Initial data import (Gemini + Convex)
└── public/
    └── ...                         # Static assets
```

---

## Gemini API Optimization Tips

### 1. **Embedding Best Practices**
```typescript
// Use appropriate task types
RETRIEVAL_DOCUMENT  // For indexing (your 100 Q&As)
RETRIEVAL_QUERY     // For user queries

// Batch when possible
const embeddings = await batchGenerateEmbeddings(texts, taskType);

// Cache aggressively
// Check cache before every API call
```

### 2. **Response Generation Optimization**
```typescript
// Use gemini-2.0-flash-exp for faster, cheaper responses
model: "gemini-2.0-flash-exp"

// Set appropriate limits
generationConfig: {
  temperature: 0.7,        // Balance creativity/accuracy
  maxOutputTokens: 2048,   // Limit response length
  topP: 0.95,
  topK: 40,
}

// Implement streaming for better UX (future enhancement)
```

### 3. **Rate Limiting**
```typescript
// Implement rate limiting to avoid API quota issues
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add delays between batch operations
for (let i = 0; i < items.length; i++) {
  await processItem(items[i]);
  if (i < items.length - 1) {
    await delay(100); // 100ms between calls
  }
}
```

---

## Testing Strategy

### 1. **Unit Tests**
```typescript
// Test cache logic
describe('Embedding Cache', () => {
  it('should return cached embedding', async () => {
    // Test cache hit
  });
  
  it('should generate new embedding on cache miss', async () => {
    // Test cache miss
  });
});
```
