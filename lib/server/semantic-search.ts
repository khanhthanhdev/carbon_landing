import { createHash } from "crypto";
import { convexServerClient } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import { generateEmbedding } from "@/lib/ai/gemini";

export interface SemanticSearchMatch {
  id: string;
  question: string;
  answer: string;
  category: string;
  sources: Array<{
    title: string;
    url: string;
    type: string;
    location: string;
  }>;
  tags: string[];
  isCommon: boolean;
  sequence?: number | null;
  score: number;
}

export interface SemanticSearchResult {
  matches: SemanticSearchMatch[];
  embedding: number[];
}

interface SemanticSearchOptions {
  query: string;
  category?: string;
  limit?: number;
}

const GEMINI_PROVIDER = "google-gemini";

function hashQuery(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function executeSemanticSearch({ query, category, limit }: SemanticSearchOptions): Promise<SemanticSearchResult> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return { matches: [], embedding: [] };
  }

  const embeddingHash = hashQuery(`${normalizedQuery}|${category ?? "*"}`);

  let embeddingRecord = await convexServerClient.query(api.embeddings.getByHash, {
    hash: embeddingHash,
  });

  let embedding = embeddingRecord?.embedding ?? [];

  if (embedding.length === 0) {
    embedding = await generateEmbedding(normalizedQuery, { usage: "query", dimensions: 768 });
    await convexServerClient.mutation(api.embeddings.store, {
      hash: embeddingHash,
      provider: GEMINI_PROVIDER,
      model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
      dimensions: embedding.length,
      embedding,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
      taskType: "RETRIEVAL_QUERY",
      text: normalizedQuery,
    });
  }

  const matches = await convexServerClient.action((api as any).search.semantic, {
    embedding,
    limit,
    category,
  });

  return {
    matches,
    embedding,
  };
}
