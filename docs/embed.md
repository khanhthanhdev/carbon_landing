1. Create convex or update convex with embeddings module and scripts layout
Target file and scripts based on your current repo:
- convex/embeddings.ts  server-side Convex actions for Gemini embeddings
- convex/mutations/qa.ts  upsert mutation to store embeddings per item
- scripts/import-qa-embeddings.ts  one-off importer that embeds and inserts qa_new.json
- scripts/reembed-all.ts  re-embed existing QA docs for selected task types

Ensure qa_new.json is at the repo root or update the script path accordingly.
2. Env and model configuration for Gemini embeddings
- .env.local
  - GOOGLE_API_KEY=your_key
  - NEXT_PUBLIC_CONVEX_URL=your_NEXT_PUBLIC_CONVEX_URL
  - GEMINI_EMBEDDING_MODEL=gemini-embedding-001
  - EMBEDDING_DIM=768

Notes:
- We default to gemini-embedding-001 as you requested. You can override via GEMINI_EMBEDDING_MODEL if needed.
- Current expected embedding dimension is 768. Keep schema vectorIndex dimensions in sync with EMBEDDING_DIM.
3. Update Convex schema to store multiple embedding variants and indexes
Edit convex/schema.ts to add per-task embeddings and vector indexes. Keep your existing fields, add the following if missing:
```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  qa: defineTable({
    question: v.string(),
    answer: v.string(),
    content: v.string(),
    sources: v.optional(v.array(v.string())),
    category: v.string(),
    lang: v.optional(v.string()),
    embedding_doc: v.array(v.float64()),
    embedding_qa: v.optional(v.array(v.float64())),
    embedding_fact: v.optional(v.array(v.float64())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .searchIndex("by_text", {
      searchField: "content",
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
});
```

Notes:
- Primary retrieval should use embedding_doc with task RETRIEVAL_DOCUMENT for indexing and RETRIEVAL_QUERY for user queries.
- embedding_qa and embedding_fact are optional knobs for experimentation or alternative retrieval styles.
- After schema changes, run: npx convex dev
4. Implement Convex embeddings actions in convex/embeddings.ts
Create convex/embeddings.ts with reusable actions for each requested task type.

```ts
// convex/embeddings.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const DIM = Number(process.env.EMBEDDING_DIM || "768");

const TASKS = [
  "RETRIEVAL_DOCUMENT",
  "RETRIEVAL_QUERY",
  "QUESTION_ANSWERING",
  "FACT_VERIFICATION",
] as const;

type TaskType = typeof TASKS[number];

function composeDocText(question: string, answer: string) {
  return `${question}\n\n${answer}`.trim();
}

function ensureDim(vec: number[]) {
  if (!Array.isArray(vec) || vec.length !== DIM) {
    throw new Error(`Embedding dimension mismatch. Expected ${DIM}, got ${vec?.length || 0}`);
  }
}

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const res = await model.embedContent({
      taskType: task,
      content: { role: "user", parts: [{ text }] },
    });

    const values = res.embedding.values as number[];
    ensureDim(values);
    return values;
  },
});

export const embedQADocumentAll = action({
  args: {
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, { question, answer }) => {
    const docText = composeDocText(question, answer);
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const tasks: TaskType[] = [
      "RETRIEVAL_DOCUMENT",
      "QUESTION_ANSWERING",
      "FACT_VERIFICATION",
    ];

    const results: Record<string, number[]> = {};
    for (const t of tasks) {
      const text = t === "QUESTION_ANSWERING" ? answer : docText;
      const res = await model.embedContent({
        taskType: t,
        content: { role: "user", parts: [{ text }] },
      });
      const values = res.embedding.values as number[];
      ensureDim(values);
      results[t] = values;
    }

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const res = await model.embedContent({
      taskType: task,
      content: { role: "user", parts: [{ text: query }] },
    });
    const values = res.embedding.values as number[];
    ensureDim(values);
    return values;
  },
});
```

Notes:
- For indexing, embedQADocumentAll composes question and answer for documents, uses answer-only for QUESTION_ANSWERING, and the composed text for FACT_VERIFICATION.
- embedQuery defaults allow alternative tasks for experimentation, but for production retrieval you will typically use task RETRIEVAL_QUERY.
5. Add or update QA upsert mutation to persist embeddings
Create convex/mutations/qa.ts if missing, or extend it to store the three embeddings.
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
    embedding_doc: v.array(v.float64()),
    embedding_qa: v.optional(v.array(v.float64())),
    embedding_fact: v.optional(v.array(v.float64())),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("qa")
      .withIndex("by_category", q => q.eq("category", args.category))
      .filter(doc => doc.question === args.question)
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        answer: args.answer,
        sources: args.sources,
        lang: args.lang,
        content: args.content,
        embedding_doc: args.embedding_doc,
        embedding_qa: args.embedding_qa,
        embedding_fact: args.embedding_fact,
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
      content: args.content,
      embedding_doc: args.embedding_doc,
      embedding_qa: args.embedding_qa,
      embedding_fact: args.embedding_fact,
      createdAt: now,
      updatedAt: now,
    });
  },
});
```
6. One-off importer to embed and insert qa_new.json
Create scripts/import-qa-embeddings.ts that reads qa_new.json, calls Convex actions to embed, and writes documents with embeddings. Limit concurrency to respect rate limits.

```ts
// scripts/import-qa-embeddings.ts
import "dotenv/config";
import { readFile } from "node:fs/promises";
import pLimit from "p-limit";
import { createClient } from "convex/server";
import { api } from "../convex/_generated/api";

const CONCURRENCY = Number(process.env.EMBED_CONCURRENCY || "3");
const DEFAULT_LANG = process.env.DEFAULT_LANG || "vi";

async function main() {
  const raw = await readFile("qa_new.json", "utf8");
  const items = JSON.parse(raw);

  const convex = createClient({ url: process.env.NEXT_PUBLIC_CONVEX_URL });
  const limit = pLimit(CONCURRENCY);

  let done = 0;
  await Promise.all(
    items.map(item =>
      limit(async () => {
        const question = String(item.question || "").trim();
        const answer = String(item.answer || "").trim();
        const category = String(item.category || "general").trim();
        const sources = Array.isArray(item.sources) ? item.sources.map(String) : undefined;

        if (!question || !answer) return;

        const embedded = await convex.action(api.embeddings.embedQADocumentAll, {
          question,
          answer,
        });

        await convex.mutation(api.mutations.qa.upsertQA, {
          question,
          answer,
          sources,
          category,
          lang: DEFAULT_LANG,
          content: embedded.composed,
          embedding_doc: embedded.embedding_doc,
          embedding_qa: embedded.embedding_qa,
          embedding_fact: embedded.embedding_fact,
        });

        done += 1;
        if (done % 25 === 0) console.log(`Imported ${done}/${items.length}`);
      })
    )
  );

  console.log(`Done. Imported ${done} items`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

Run
- npx tsx scripts/import-qa-embeddings.ts
- Ensure env GOOGLE_API_KEY, CONVEX_URL, and NEXT_PUBLIC_CONVEX_URL are set
- The script understands the `data/qa_new.json` layout (`sections[] -> questions[]`) and preserves:
  - `metadata` fields (`question_number`, `section_number`, `section_title`, `category`, `keywords`, `has_sources`, `answer_length`, `created_at`, `updated_at?`, `lang?`)
  - `search_fields` (`question_lower`, `keywords_searchable`, `category_searchable`)
  - `searchable_text`, `sources[]` (objects with `type/title/url/location/note`)
- Import workflow:
  1. Parses/normalises the sectioned JSON into Convex-ready payloads.
  2. Generates Gemini embeddings with retry/backoff.
  3. Calls `mutations.qa.upsertQA`, keeping metadata intact.
  4. Logs progress every 25 documents and captures failures.
- If running outside Convex is not possible (e.g. restricted network), call the server-side helper instead:
  ```bash
  npx convex run actions.importQAWithEmbeddings --items @qa_new.json
  ```
  Add `--skipExisting` to avoid updating existing records; the action performs embedding generation directly inside Convex.
7. Re-embed script to refresh embeddings for existing docs
Create scripts/reembed-all.ts to iterate existing QA docs and recompute embeddings using convex/embeddings.ts. Use filters to re-embed a subset by category if needed.

```ts
// scripts/reembed-all.ts
import "dotenv/config";
import pLimit from "p-limit";
import { createClient } from "convex/server";
import { api } from "../convex/_generated/api";

const CONCURRENCY = Number(process.env.EMBED_CONCURRENCY || "3");

async function main() {
  const convex = createClient({ url: process.env.NEXT_PUBLIC_CONVEX_URL });

  const all = await convex.query(api.queries.qa.listAll, {}); // implement a simple listAll if not present
  const limit = pLimit(CONCURRENCY);

  let done = 0;
  await Promise.all(
    all.map(doc =>
      limit(async () => {
        const embedded = await convex.action(api.embeddings.embedQADocumentAll, {
          question: doc.question,
          answer: doc.answer,
        });

        await convex.mutation(api.mutations.qa.upsertQA, {
          question: doc.question,
          answer: doc.answer,
          sources: doc.sources,
          category: doc.category,
          lang: doc.lang,
          content: embedded.composed,
          embedding_doc: embedded.embedding_doc,
          embedding_qa: embedded.embedding_qa,
          embedding_fact: embedded.embedding_fact,
        });

        done += 1;
        if (done % 25 === 0) console.log(`Re-embedded ${done}/${all.length}`);
      })
    )
  );

  console.log(`Re-embedded ${done} items`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

If you do not have a queries.qa.listAll, add a minimal query:
```ts
// convex/queries/qa.ts
import { query } from "../_generated/server";
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("qa").collect();
  },
});
```

When client-side scripts are blocked from reaching Convex, you can trigger the re-embedding routine directly in your deployment:
```bash
npx convex run actions.reembedQA --categories carbon,policy --lang vi --limit 100
```
The action filters by category/lang (arguments optional) and refreshes embeddings entirely within Convex infrastructure.
8. Basic vector search query using the new embedding_doc index
Add a minimal query to validate embeddings via Convex vector search.

```ts
// convex/queries/search.ts
import { query } from "../_generated/server";
import { v } from "convex/values";

export const vectorSearchDoc = query({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { embedding, category, lang, limit }) => {
    const take = Math.min(limit || 10, 50);
    const res = await ctx.db
      .query("qa")
      .withVectorIndex("by_embedding_doc", q => {
        let idx = q.nearest("embedding_doc", embedding);
        if (category) idx = idx.eq("category", category);
        if (lang) idx = idx.eq("lang", lang);
        return idx;
      })
      .take(take);
    return res;
  },
});
```

At query time, use convex.action api.embeddings.embedQuery with task RETRIEVAL_QUERY to generate the query embedding.
9. Validation checklist after import
- Confirm counts
  - Query qa table size in Convex dashboard equals qa_new.json length
- Confirm embedding dimensions
  - Spot check a doc in dashboard, ensure embedding_doc length equals 768
- Confirm vector index works
  - Pick a sample query, compute query embedding via api.embeddings.embedQuery task RETRIEVAL_QUERY, call queries.search.vectorSearchDoc and verify meaningful results
- Confirm by_text searchIndex still functional for keyword search
10. Error handling, retries, and rate limiting considerations
- Import and re-embed scripts
  - Use p-limit to cap concurrency, default 3 to 4
  - Wrap action calls in try or catch and log failures with item index and category; continue with remaining items
  - Optionally add simple exponential backoff on transient errors
- Convex actions
  - Validate GOOGLE_API_KEY presence
  - Validate embedding dimension using ensureDim
  - Throw informative errors with model name and task type
11. Docs update and examples for docs or docs_v2.md
Document the embedding flow for future contributors:
- Models and tasks used
  - Model: gemini-embedding-001
  - Tasks: RETRIEVAL_DOCUMENT for indexing, RETRIEVAL_QUERY for queries, plus QUESTION_ANSWERING and FACT_VERIFICATION stored for experimentation
- Schema fields and vector indexes added
- How to run import and re-embed scripts
  - npx tsx scripts/import-qa-embeddings.ts
  - npx tsx scripts/reembed-all.ts
- Sample code to get a query embedding and run vector search with Convex
