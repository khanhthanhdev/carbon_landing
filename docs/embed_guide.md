# Gemini Embedding Integration

This guide covers the new Gemini embedding workflow across Convex actions, schema definitions, and local scripts. Use it as the reference when importing fresh Q&A content or refreshing existing vectors.

## Convex Actions

- `convex/embeddings.ts` exposes reusable embedding helpers backed by Google Gemini.
  - `embedForTask` returns a single embedding for any Gemini task type.
  - `embedQADocumentAll` generates document, QA, and fact-check embeddings for a question/answer pair and enforces the configured dimensionality.
  - `embedQuery` produces query embeddings ready for vector search experiments.
  - All helpers honour `GEMINI_EMBEDDING_MODEL` (defaults to `gemini-embedding-001`) and `EMBEDDING_DIM` (defaults to `768`).
- The actions share a cached `GoogleGenAI` client, validate text input, and throw when embeddings come back with an unexpected dimensionality.

## QA Mutations and Queries

- `convex/mutations/qa.ts` implements `upsertQA` which:
  - Inserts new documents with embeddings, timestamps, and optional language/source metadata.
  - Updates existing records in-place (matching on `category` + `question`) while refreshing embeddings.
- `convex/queries/qa.ts` exposes `listAll` for scripts that need raw QA records.
- `convex/queries/search.ts` adds `vectorSearchDoc` to probe the `embedding_doc` vector index with optional category/lang filters.

## Schema Changes

`convex/schema.ts` now includes a dedicated `qa` table:

```ts
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
  .searchIndex("by_text", { searchField: "content", filterFields: ["category", "lang"] })
  .vectorIndex("by_embedding_doc", { vectorField: "embedding_doc", dimensions: 768, filterFields: ["category", "lang"] })
  .vectorIndex("by_embedding_qa", { vectorField: "embedding_qa", dimensions: 768, filterFields: ["category", "lang"] })
  .vectorIndex("by_embedding_fact", { vectorField: "embedding_fact", dimensions: 768, filterFields: ["category", "lang"] });
```

After editing the schema run `npx convex dev` (or `pnpm convex dev`) once to regenerate `_generated` types.

## Environment Variables

Add the following to `.env.local` (see the repo example for defaults):

- `GOOGLE_API_KEY` – Gemini API key used by Convex actions.
- `NEXT_PUBLIC_CONVEX_URL` – HTTP endpoint for the Convex deployment (scripts use this).
- `GEMINI_EMBEDDING_MODEL` – defaults to `gemini-embedding-001`.
- `EMBEDDING_DIM` – defaults to `768` and must match schema vector dimensions.
- Optional script knobs:
  - `EMBED_CONCURRENCY` (default `3`) limits parallel embed requests.
  - `DEFAULT_LANG` (default `vi`) used during imports.
  - `QA_IMPORT_PATH` (default `qa_new.json`) for alternate data sources.

Ensure `NEXT_PUBLIC_CONVEX_URL` continues to point at the same deployment so the rest of the app can access the new data.

## Import Script

`scripts/import-qa-embeddings.ts` ingests a JSON array of QA items, embeds them through Convex, and upserts records:

```bash
npx tsx scripts/import-qa-embeddings.ts
```

Expected input fields per item:

- `question` (string, required)
- `answer` (string, required)
- `category` (string, optional; defaults to `general`)
- `lang` (string, optional; defaults to `DEFAULT_LANG`)
- `sources` (array of strings or single string, optional)

The script:

- Validates `GOOGLE_API_KEY`/`NEXT_PUBLIC_CONVEX_URL`.
- Streams items with `p-limit` concurrency control.
- Uses `embeddings.embedQADocumentAll` to generate three embeddings per item.
- Calls `mutations.qa.upsertQA` to persist data and embeddings.
- Logs progress every 25 documents and collects any failures for review.

## Re-embedding Script

`scripts/reembed-all.ts` recalculates embeddings for existing QA documents:

```bash
npx tsx scripts/reembed-all.ts
# Optional filters
npx tsx scripts/reembed-all.ts --category=carbon,policy --lang=vi --limit=100
```

Key behaviours:

- Fetches all QA docs via `queries.qa.listAll`.
- Optional CLI filters:
  - `--category` / `--categories` – comma-separated categories.
  - `--lang` – restrict by language.
  - `--limit` – cap the number of documents processed.
- Generates fresh embeddings through the same Convex action and writes them back with `upsertQA`.
- Shares the concurrency limiter and error reporting style with the import script.

## Validation Checklist

1. Confirm Convex schema is up to date (`npx convex dev`).
2. Import or re-embed data, watching the CLI for success counts.
3. In the Convex dashboard, spot-check a QA document:
   - `embedding_doc` length equals `EMBEDDING_DIM`.
   - Optional embeddings (`embedding_qa`, `embedding_fact`) are present as needed.
4. Use `queries.search.vectorSearchDoc` from the Convex console to validate vector search results:
   ```ts
   await convex.query(api.queries.search.vectorSearchDoc, {
     embedding: await convex.action(api.embeddings.embedQuery, {
       query: "Sample carbon policy question",
       task: "RETRIEVAL_QUERY",
     }),
     limit: 5,
   });
   ```
5. Keep the old keyword search index (`by_text`) available for fallbacks.

## Troubleshooting

- **Missing embeddings** – verify `GOOGLE_API_KEY` and `GEMINI_EMBEDDING_MODEL` are set, and that the Convex action logs show successful responses.
- **Dimension mismatch errors** – ensure the upstream model matches `EMBEDDING_DIM` and that vector indexes use the same dimension.
- **Rate limiting** – lower `EMBED_CONCURRENCY` or retry failed items; Gemini limits apply per API key.
- **Convex auth issues** – re-check `NEXT_PUBLIC_CONVEX_URL` and that the deployment allows the authenticated admin key being used locally.
