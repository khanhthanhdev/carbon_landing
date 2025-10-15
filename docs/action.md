1. Audit current repo and scaffold missing folders
Goal: Confirm the Next.js + Convex layout and create standard folders so later steps have deterministic paths.

1) Inspect existing structure
- In terminal, run:
  - tree -L 2 -I "node_modules|.next|.git|.vercel|dist|coverage"

2) Expect or create the following directories/files (adjust for app/ vs pages/ as needed)
- convex/
  - schema.ts
  - actions/
    - embeddings.ts
    - search.ts
  - queries/
    - search.ts
  - mutations/
    - qa.ts
    - analytics.ts
    - rateLimit.ts
  - utils/
    - scoring.ts
    - text.ts
- app/ (or pages/)
  - api/
    - search/route.ts
    - suggest/route.ts
    - answer/route.ts
    - admin/
      - reembed/route.ts
      - reindex/route.ts
  - (app router) search/page.tsx or (pages router) pages/search.tsx
- components/
  - search/
    - SearchInput.tsx
    - SearchFilters.tsx
    - SearchResults.tsx
    - SuggestionList.tsx
    - ResultCard.tsx
    - SourceList.tsx
    - SearchSkeleton.tsx
- lib/
  - ai/
    - google.ts
  - queryClient.ts
  - i18n.ts
  - rateLimit.ts
  - convexServer.ts
  - fetcher.ts
- scripts/
  - import-qa.ts
  - reembed-all.ts
- docs/
  - docs_v2.md
- qa_new.json (place the dataset here)

3) Notes
- If you use pages/ router, place API routes under pages/api/... and pages/search.tsx accordingly.
- If convex/ already has files, we will extend, not replace. Keep existing code and add new modules.
2. Dependencies and environment variables
1) Ensure required deps are installed
- Core (already present): next, react, convex, @tanstack/react-query
- Add:
  - npm i @google/generative-ai p-limit zod fast-sort
  - Optional for language detection (improves VI/EN support):
    - npm i franc cld3-asm
  - Types if needed:
    - npm i -D @types/node

2) Environment variables (.env.local)
- GOOGLE_API_KEY=your_key
- NEXT_PUBLIC_CONVEX_URL=https://... (Convex deployment or local dev URL)
- NEXT_PUBLIC_CONVEX_URL=https://... (server-side usage if needed)

3) Validate Gemini access
- gemini-embedding-001: used for indexing (RETRIEVAL_DOCUMENT) and query (RETRIEVAL_QUERY)
- gemini-2.5-flash-lite: used for answer synthesis and suggestions
3. Convex schema: QA data, vector index, text index, analytics, rate limits
Edit convex/schema.ts. If you already have tables, integrate these definitions and indexes. Dimensions for gemini-embedding-001 are 768.

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  qa: defineTable({
    question: v.string(),
    answer: v.string(),
    content: v.string(), // question + "\n\n" + answer (for FTS)
    sources: v.optional(v.array(v.string())),
    category: v.string(),
    lang: v.optional(v.string()), // "vi" | "en" | undefined
    embedding: v.array(v.float64()), // store 768-d vector
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .searchIndex("by_text", {
      searchField: "content",
      filterFields: ["category", "lang"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768,
      filterFields: ["category", "lang"],
    }),

  search_logs: defineTable({
    query: v.string(),
    lang: v.optional(v.string()),
    topK: v.optional(v.number()),
    category: v.optional(v.string()),
    results: v.number(),
    latencyMs: v.number(),
    usedVector: v.boolean(),
    usedText: v.boolean(),
    error: v.optional(v.string()),
    ipHash: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  rate_limits: defineTable({
    key: v.string(), // e.g., "search:{ipHash}"
    windowStart: v.number(), // epoch ms truncated to window
    count: v.number(),
  }).index("by_key_window", ["key", "windowStart"]),
});
```

- If your project already has these tables/indexes, verify the vectorIndex dimensions = 768 and that by_text searchIndex targets content with filter fields category and lang.
- After editing schema: npx convex dev to apply schema.
4. Gemini client wrappers (server-side)
Create lib/ai/google.ts for Next API routes (Node runtime) and duplicate minimal code in Convex actions where needed, to avoid cross-environment bundling issues.

lib/ai/google.ts:
```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY!;
if (!apiKey) throw new Error("GOOGLE_API_KEY is missing");

const genAI = new GoogleGenerativeAI(apiKey);

export const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

export const flashLite = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

export async function embedDocument(text: string) {
  const res = await embeddingModel.embedContent({
    taskType: "RETRIEVAL_DOCUMENT",
    content: { role: "user", parts: [{ text }] },
  });
  return res.embedding.values; // number[]
}

export async function embedQuery(text: string) {
  const res = await embeddingModel.embedContent({
    taskType: "RETRIEVAL_QUERY",
    content: { role: "user", parts: [{ text }] },
  });
  return res.embedding.values;
}
```

Convex actions will use @google/generative-ai directly to minimize coupling; identical logic will be placed in convex/actions/embeddings.ts.
5. Convex embeddings action: RETRIEVAL_DOCUMENT and RETRIEVAL_QUERY
Create convex/actions/embeddings.ts. This centralizes embedding generation inside Convex so search actions can call it securely.

```ts
// convex/actions/embeddings.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

export const embedDocument = action({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const res = await embedModel.embedContent({
      taskType: "RETRIEVAL_DOCUMENT",
      content: { role: "user", parts: [{ text }] },
    });
    return res.embedding.values as number[];
  },
});

export const embedQuery = action({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const res = await embedModel.embedContent({
      taskType: "RETRIEVAL_QUERY",
      content: { role: "user", parts: [{ text }] },
    });
    return res.embedding.values as number[];
  },
});
```
6. Convex QA mutations and analytics logging
Create convex/mutations/qa.ts:

```ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const upsertQA = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    sources: v.optional(v.array(v.string())),
    category: v.string(),
    lang: v.optional(v.string()),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const content = `${args.question}\n\n${args.answer}`;
    const now = Date.now();
    // Optional: dedupe by (question, category)
    const existing = await ctx.db
      .query("qa")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((doc) => doc.question === args.question)
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        answer: args.answer,
        sources: args.sources,
        lang: args.lang,
        content,
        embedding: args.embedding,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("qa", {
      question: args.question,
      answer: args.answer,
      sources: args.sources,
      category: args.category,
      lang: args.lang,
      content,
      embedding: args.embedding,
      createdAt: now,
      updatedAt: now,
    });
  },
});
```

Create convex/mutations/analytics.ts:

```ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const logSearch = mutation({
  args: {
    query: v.string(),
    lang: v.optional(v.string()),
    topK: v.optional(v.number()),
    category: v.optional(v.string()),
    results: v.number(),
    latencyMs: v.number(),
    usedVector: v.boolean(),
    usedText: v.boolean(),
    error: v.optional(v.string()),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("search_logs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```
7. Convex vector search and full text search query functions
Create convex/queries/search.ts:

```ts
import { query } from "../_generated/server";
import { v } from "convex/values";

export const ftsSearch = query({
  args: {
    q: v.string(),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { q, category, lang, limit }) => {
    const take = Math.min(limit ?? 20, 100);
    const res = await ctx.db
      .query("qa")
      .withSearchIndex("by_text", (qIdx) => {
        qIdx = qIdx.search("content", q);
        if (category) qIdx = qIdx.eq("category", category);
        if (lang) qIdx = qIdx.eq("lang", lang);
        return qIdx;
      })
      .take(take);
    return res;
  },
});

export const vectorSearch = query({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { embedding, category, lang, limit }) => {
    const take = Math.min(limit ?? 20, 100);
    const res = await ctx.db
      .query("qa")
      .withVectorIndex("by_embedding", (qIdx) => {
        qIdx = qIdx.nearest("embedding", embedding);
        if (category) qIdx = qIdx.eq("category", category);
        if (lang) qIdx = qIdx.eq("lang", lang);
        return qIdx;
      })
      .take(take);
    return res;
  },
});
```

Notes:
- FTS uses searchIndex on content.
- Vector search uses nearest in vectorIndex.
- Both support optional filters category and lang.
8. Hybrid search action with ranking, fallback, and bilingual support
Create convex/actions/search.ts. We fuse vector and FTS via Reciprocal Rank Fusion (RRF) with weights, fallback to FTS if embeddings fail, and optionally translate English query to Vietnamese for better FTS recall when dataset is primarily Vietnamese.

```ts
import { action } from "../_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
const flashLite = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

async function getQueryEmbedding(text: string) {
  const res = await embedModel.embedContent({
    taskType: "RETRIEVAL_QUERY",
    content: { role: "user", parts: [{ text }] },
  });
  return res.embedding.values as number[];
}

async function maybeTranslateToViForFTS(query: string, lang?: string) {
  if (lang === "en") {
    const prompt = `Translate this query into Vietnamese concisely for keyword search. Output only the translation:\n${query}`;
    const res = await flashLite.generateContent(prompt);
    return res.response.text().trim();
  }
  return query;
}

export const hybridSearch = action({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    lang: v.optional(v.string()), // "vi"|"en"|undefined; if undefined we won't translate
    topK: v.optional(v.number()),
    alpha: v.optional(v.number()), // weight for vector ranking
  },
  handler: async (ctx, args) => {
    const started = Date.now();
    const topK = Math.min(args.topK ?? 10, 50);
    const alpha = Math.max(0, Math.min(args.alpha ?? 0.6, 1.0));

    let embedding: number[] | null = null;
    let usedVector = false;
    let error: string | undefined;

    try {
      embedding = await getQueryEmbedding(args.query);
      usedVector = true;
    } catch (e: any) {
      error = `embed_error:${e?.message ?? "unknown"}`;
      embedding = null;
      usedVector = false;
    }

    const translated = await maybeTranslateToViForFTS(args.query, args.lang);
    const [fts, vec] = await Promise.all([
      ctx.runQuery("queries/search:ftsSearch", {
        q: translated,
        category: args.category,
        lang: args.lang,
        limit: topK * 3,
      }),
      embedding
        ? ctx.runQuery("queries/search:vectorSearch", {
            embedding,
            category: args.category,
            lang: args.lang,
            limit: topK * 3,
          })
        : Promise.resolve([]),
    ]);

    // Reciprocal Rank Fusion scoring
    const R = 60;
    const map = new Map<string, { doc: any; score: number; reasons: string[] }>();

    const add = (arr: any[], w: number, label: string) => {
      arr.forEach((doc, idx) => {
        const id = doc._id.id ?? doc._id; // support both formats
        const prev = map.get(id) ?? { doc, score: 0, reasons: [] };
        prev.score += w * (1 / (R + idx + 1));
        prev.reasons.push(label);
        map.set(id, prev);
      });
    };

    add(fts, 1 - alpha, "fts");
    if (embedding) add(vec, alpha, "vector");

    const merged = Array.from(map.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((x) => ({
        ...x.doc,
        hybridScore: x.score,
        reasons: x.reasons,
      }));

    await ctx.runMutation("mutations/analytics:logSearch", {
      query: args.query,
      lang: args.lang,
      topK,
      category: args.category,
      results: merged.length,
      latencyMs: Date.now() - started,
      usedVector,
      usedText: true,
      error,
      ipHash: undefined, // set from Next API where IP is available
    });

    return merged;
  },
});
```

Notes:
- alpha controls balance between vector and FTS. Default 0.6 favors semantic matching.
- Optional translation supports English queries against Vietnamese corpus. Skip if not needed.
9. Rate limiting utilities (Convex mutation + Next middleware)
Convex mutation: convex/mutations/rateLimit.ts

```ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import crypto from "crypto";

export const hit = mutation({
  args: {
    keyRaw: v.string(), // e.g., "search:{ip}"
    limit: v.number(), // e.g., 60
    windowMs: v.number(), // e.g., 60_000
  },
  handler: async (ctx, { keyRaw, limit, windowMs }) => {
    const ipHash = crypto.createHash("sha256").update(keyRaw).digest("hex");
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const compoundKey = `search:${ipHash}`;

    const existing = await ctx.db
      .query("rate_limits")
      .withIndex("by_key_window", (q) => q.eq("key", compoundKey).eq("windowStart", windowStart))
      .first();

    if (!existing) {
      await ctx.db.insert("rate_limits", { key: compoundKey, windowStart, count: 1 });
      return { allowed: true, remaining: limit - 1 };
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { allowed: true, remaining: limit - (existing.count + 1) };
  },
});
```

Next helper: lib/rateLimit.ts

```ts
import { NextRequest } from "next/server";
import crypto from "crypto";
import { convex } from "./convexServer";
import { api } from "@/convex/_generated/api";

export async function enforceRateLimit(req: NextRequest, keyPrefix: string, limit = 60, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${keyPrefix}:${ip}`;
  const res = await convex.mutation(api.mutations.rateLimit.hit, { keyRaw: key, limit, windowMs });
  return res;
}

export function ipHashFromReq(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex");
}
```
10. Data ingestion: Import qa_new.json with RETRIEVAL_DOCUMENT embeddings
Place qa_new.json at project root. Expected item shape:
```json
[
  {
    "question": "Câu hỏi ...",
    "answer": "Câu trả lời ...",
    "sources": ["https://..."], // optional
    "category": "policy"
  }
]
```

Script scripts/import-qa.ts
- Reads json
- Computes content = question + "\n\n" + answer
- Generates embedding via gemini-embedding-001 with taskType: RETRIEVAL_DOCUMENT
- Inserts via Convex mutation upsertQA
- Concurrency-limited to respect rate limits

```ts
// scripts/import-qa.ts
import { readFile } from "node:fs/promises";
import pLimit from "p-limit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "convex/server";
import { api } from "@/convex/_generated/api";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function embedDoc(text: string) {
  const res = await embedModel.embedContent({
    taskType: "RETRIEVAL_DOCUMENT",
    content: { role: "user", parts: [{ text }] },
  });
  return res.embedding.values as number[];
}

async function main() {
  const raw = await readFile("qa_new.json", "utf8");
  const items = JSON.parse(raw) as Array<{
    question: string;
    answer: string;
    sources?: string[];
    category: string;
  }>;

  const convex = createClient({ url: process.env.NEXT_PUBLIC_CONVEX_URL! });
  const limit = pLimit(4);

  await Promise.all(
    items.map((item) =>
      limit(async () => {
        const content = `${item.question}\n\n${item.answer}`;
        const embedding = await embedDoc(content);
        const lang = "vi"; // dataset default; adjust if mixed
        await convex.mutation(api.mutations.qa.upsertQA, {
          question: item.question,
          answer: item.answer,
          sources: item.sources,
          category: item.category,
          lang,
          embedding,
        });
      })
    )
  );

  console.log(`Imported ${items.length} QA items`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Run:
- TSX: npx tsx scripts/import-qa.ts
- Or ts-node if preferred.

Note:
- If you prefer ingestion fully inside Convex, create an action to accept batch arrays and call embeddings there. The above approach uses Node and writes via Convex server client.
11. Next API: /api/search (hybrid), /api/suggest (autocomplete), /api/answer (LLM synthesis)
lib/convexServer.ts:
```ts
import { createClient } from "convex/server";
export const convex = createClient({ url: process.env.NEXT_PUBLIC_CONVEX_URL! });
```

app/api/search/route.ts:
```ts
import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { z } from "zod";
import { ipHashFromReq, enforceRateLimit } from "@/lib/rateLimit";

const schema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  lang: z.enum(["vi","en"]).optional(),
  topK: z.number().min(1).max(50).optional(),
  alpha: z.number().min(0).max(1).optional(),
});

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const { allowed } = await enforceRateLimit(req, "search", 60, 60_000);
    if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const body = await req.json();
    const { q, category, lang, topK, alpha } = schema.parse(body);

    const results = await convex.action(api.actions.search.hybridSearch, {
      query: q,
      category,
      lang,
      topK,
      alpha,
    });

    // backfill ipHash
    const ipHash = ipHashFromReq(req);
    await convex.mutation(api.mutations.analytics.logSearch, {
      query: q,
      lang,
      topK,
      category,
      results: results.length,
      latencyMs: Date.now() - started,
      usedVector: true,
      usedText: true,
      ipHash,
    });

    return NextResponse.json({ results, tookMs: Date.now() - started });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
```

app/api/suggest/route.ts (prefix-based suggestions using FTS; uses short limit):
```ts
import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";
import { z } from "zod";

const schema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  lang: z.enum(["vi","en"]).optional(),
  limit: z.number().min(1).max(10).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { q, category, lang, limit } = schema.parse(body);
    // Use FTS for suggestions; user typically types prefixes of question words
    const results = await convex.query(api.queries.search.ftsSearch, {
      q,
      category,
      lang,
      limit: limit ?? 8,
    });
    // Return unique top question strings
    const seen = new Set<string>();
    const suggestions = [];
    for (const r of results) {
      if (!seen.has(r.question)) {
        seen.add(r.question);
        suggestions.push(r.question);
      }
      if (suggestions.length >= (limit ?? 8)) break;
    }
    return NextResponse.json({ suggestions });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
```

app/api/answer/route.ts (LLM synthesis via gemini-2.5-flash-lite):
```ts
import { NextRequest, NextResponse } from "next/server";
import { flashLite } from "@/lib/ai/google";
import { z } from "zod";

const schema = z.object({
  query: z.string().min(1),
  contexts: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    sources: z.array(z.string()).optional(),
    category: z.string(),
  })).min(1),
  lang: z.enum(["vi","en"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, contexts, lang } = schema.parse(body);
    const sources = contexts.flatMap(c => c.sources ?? []);
    const contextText = contexts.map((c, i) => `# Doc ${i+1}\nQ: ${c.question}\nA: ${c.answer}`).join("\n\n");
    const sys = lang === "en"
      ? "Answer concisely in English using only the provided context. Include citations by [Doc N] when relevant."
      : "Trả lời ngắn gọn bằng tiếng Việt chỉ dùng thông tin trong ngữ cảnh. Bao gồm trích dẫn dạng [Doc N] khi phù hợp.";

    const prompt = `${sys}\n\nUser query:\n${query}\n\nContext:\n${contextText}`;
    const resp = await flashLite.generateContent(prompt);
    const text = resp.response.text().trim();
    return NextResponse.json({ answer: text, sources });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
```
12. TanStack Query: client setup and fetch helpers
lib/queryClient.ts:
```ts
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
```

app/providers.tsx (if not already):
```tsx
"use client";
import { QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";
import { useState } from "react";
import { makeQueryClient } from "@/lib/queryClient";

export default function Providers({ children, state }: { children: React.ReactNode; state?: any; }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
```

lib/fetcher.ts:
```ts
export async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```
13. Search UI: page and components with caching and filters
app/search/page.tsx (App Router) or pages/search.tsx (Pages Router). Example with App Router:

```tsx
// app/search/page.tsx
"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { postJson } from "@/lib/fetcher";
import SearchInput from "@/components/search/SearchInput";
import SearchFilters from "@/components/search/SearchFilters";
import SearchResults from "@/components/search/SearchResults";
import SearchSkeleton from "@/components/search/SearchSkeleton";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [lang, setLang] = useState<"vi" | "en" | undefined>("vi");
  const [alpha, setAlpha] = useState(0.6);

  const params = useMemo(() => ({ q, category, lang, topK: 12, alpha }), [q, category, lang, alpha]);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["search", params],
    queryFn: () => postJson<{ results: any[]; tookMs: number }>("/api/search", params),
    enabled: q.trim().length >= 2,
  });

  return (
    <div className="container mx-auto p-4">
      <SearchInput value={q} onChange={setQ} />
      <SearchFilters category={category} onCategoryChange={setCategory} lang={lang} onLangChange={setLang} alpha={alpha} onAlphaChange={setAlpha} />
      {isFetching ? <SearchSkeleton /> : <SearchResults results={data?.results ?? []} error={isError ? String(error) : undefined} tookMs={data?.tookMs} />}
    </div>
  );
}
```

components/search/SearchInput.tsx (with suggestions):
```tsx
"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { postJson } from "@/lib/fetcher";
import SuggestionList from "./SuggestionList";

export default function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void; }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { const t = setTimeout(() => onChange(local), 300); return () => clearTimeout(t); }, [local, onChange]);

  const { data } = useQuery({
    queryKey: ["suggest", local],
    queryFn: () => postJson<{ suggestions: string[] }>("/api/suggest", { q: local }),
    enabled: local.trim().length >= 2,
    staleTime: 60_000,
  });

  return (
    <div className="relative">
      <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Tìm kiếm (VI/EN)..." className="w-full border rounded px-3 py-2" />
      <SuggestionList suggestions={data?.suggestions ?? []} onPick={onChange} />
    </div>
  );
}
```

components/search/SearchFilters.tsx:
```tsx
"use client";
export default function SearchFilters({
  category, onCategoryChange, lang, onLangChange, alpha, onAlphaChange,
}: {
  category?: string;
  onCategoryChange: (v?: string) => void;
  lang?: "vi" | "en";
  onLangChange: (v?: "vi" | "en") => void;
  alpha: number;
  onAlphaChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-3 items-center my-3">
      <select value={category ?? ""} onChange={(e) => onCategoryChange(e.target.value || undefined)}>
        <option value="">All categories</option>
        <option value="policy">Policy</option>
        <option value="standard">Standard</option>
        <option value="methodology">Methodology</option>
      </select>
      <select value={lang ?? ""} onChange={(e) => onLangChange((e.target.value || undefined) as any)}>
        <option value="">Auto/VI</option>
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select>
      <label className="flex items-center gap-2">
        Alpha (vector weight)
        <input type="range" min={0} max={1} step={0.1} value={alpha} onChange={(e) => onAlphaChange(parseFloat(e.target.value))} />
        <span>{alpha.toFixed(1)}</span>
      </label>
    </div>
  );
}
```

components/search/SearchResults.tsx, ResultCard.tsx, SourceList.tsx render the list with categories and sources.
14. Search ranking utilities and normalization
Add convex/utils/scoring.ts (pure helpers if needed on server actions) or lib-level utilities for client highlighting.

You can extend hybrid scoring by:
- Normalizing ranks to [0,1]
- Boosting exact keyword matches found in FTS
- Category prior boosting if user-selected category matches

Example snippet to boost exact keyword matches (in action before sorting):
```ts
function boostForExactMatch(doc: any, query: string) {
  const q = query.toLowerCase();
  const hay = `${doc.question}\n${doc.answer}`.toLowerCase();
  return hay.includes(q) ? 0.05 : 0; // small bonus
}
```

In the merge step:
```ts
prev.score += boostForExactMatch(doc, args.query);
```

Keep alpha primary, with boosts as small tie-breakers.
15. Answer synthesis UI integration
Add an optional "Ask" button on results to synthesize a concise answer using top N results and gemini-2.5-flash-lite.

- On button click:
  - Gather top 3–5 result contexts
  - POST to /api/answer with query, contexts, lang
  - Render answer with simple markdown formatting and display [Doc N] citations
- Cache the synthesized answer per (query, topIds) with TanStack Query for quick back/forward navigation.

This feature helps English users get VI content summarized in English when lang="en".
16. Autocomplete and suggestions UX
- SuggestionList.tsx renders a dropdown list of top question strings returned by /api/suggest.
- On click of suggestion, set it as the query and trigger search.
- Consider keyboard navigation (ArrowUp/ArrowDown/Enter).
- Cache suggestions for 60s to reduce routes calls with TanStack Query staleTime.
17. Admin endpoints and tools: re-embed and re-index
API routes:
- app/api/admin/reembed/route.ts
  - Iterate all qa docs, recompute embeddings via gemini-embedding-001 with RETRIEVAL_DOCUMENT, update embedding field.
- app/api/admin/reindex/route.ts
  - No-op for Convex (indexes are live), but you can trigger background normalization or fix lang values.

Script scripts/reembed-all.ts:
```ts
// Similar to import-qa.ts; fetch all docs via convex, recompute embeddings in batches with p-limit(3), and patch.
```

Protect admin routes via your existing auth (middleware or role check).
18. Analytics dashboard (admin)
- Build app/admin/search/page.tsx:
  - Charts: searches over time, average latency, zero-result queries, top categories.
  - Table of recent searches (query, lang, results, tookMs).
- Convex queries for analytics:
  - by time range using search_logs.by_createdAt
- Add export CSV of search logs for further analysis.
19. Error handling and resilience strategies
- Embedding failures: fallback to FTS-only and log error in analytics.
- Gemini rate limit:
  - Use p-limit concurrency and exponential backoff retries on 429/5xx.
- Next API:
  - Zod validation on inputs, return 400 on invalid payloads.
  - Return 429 on rate limit exceeded.
- Client:
  - Show user-friendly errors, allow retry action, keep previous results visible during refetch.
20. Performance and caching optimizations
- TanStack Query:
  - queries.staleTime = 30s, gcTime = 5m
  - Deduplicate inflight requests (default)
  - Use enabled gates to avoid calls for short queries
- Debounce input 300ms
- Limit hybrid topK to 12 by default
- Filter by category in both vector and FTS paths to reduce candidate sets
- Consider server-side caching of query embeddings (LRU in-memory if using a long-lived server) keyed by query+lang to avoid re-embedding on rapid repeats
- Consider Next route caching headers for suggest (short s-maxage)
21. Testing: unit, integration, and e2e
- Unit:
  - scoring fusion (RRF) correctness
  - language translation helper outputs non-empty VI for EN inputs
- Integration:
  - Import script loads qa_new.json and creates expected documents with non-empty embeddings
  - hybridSearch returns combined results and respects category filter
- E2E (Playwright/Cypress):
  - Typing in search bar shows suggestions
  - Submitting search shows results with sources and categories
  - Rate limit returns 429 after threshold

Add seeded minimal qa_new.json for CI.
22. Documentation: docs/docs_v2.md
Create docs/docs_v2.md with:
- Overview: architecture diagram (text) of Next API ↔ Convex (actions/queries) ↔ Gemini
- Data model: qa fields, indexes (vector 768d, text search)
- Import procedure:
  - env setup
  - npx tsx scripts/import-qa.ts
- Search API contracts:
  - POST /api/search payload and response JSON schemas
  - POST /api/suggest contract
  - POST /api/answer contract
- Ranking: RRF formula, alpha default (0.6), translation behavior for EN queries
- Caching: TanStack config and suggestion caching
- Rate limiting: policy (60/min per IP)
- Admin: re-embed tool usage
- Troubleshooting: common errors (embedding dims, missing GOOGLE_API_KEY)
- Links:
  - https://docs.convex.dev/search/vector-search
  - https://docs.convex.dev/search/text-search
23. Deployment and operations checklist
- Ensure GOOGLE_API_KEY set in production environment
- Confirm Convex deployment URL configured in NEXT_PUBLIC_CONVEX_URL/NEXT_PUBLIC_CONVEX_URL
- Warm-up import on staging, verify indexes working
- Monitor search_logs in first week for zero-result or slow queries; adjust alpha or translation usage accordingly
- Add alerts for API 5xx error spikes