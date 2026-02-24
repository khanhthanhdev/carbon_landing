import { createHash } from "crypto";
import { api } from "@/convex/_generated/api";
import { generateEmbedding } from "@/lib/ai/gemini";
import { convexServerClient } from "@/lib/convex-server";

export interface SemanticSearchMatch {
  answer: string;
  category: string;
  id: string;
  isCommon: boolean;
  question: string;
  score: number;
  sequence?: number | null;
  sources: Array<{
    title: string;
    url: string;
    type: string;
    location: string;
  }>;
  tags: string[];
}

export interface SemanticSearchResult {
  embedding: number[];
  matches: SemanticSearchMatch[];
}

interface SemanticSearchOptions {
  category?: string;
  limit?: number;
  query: string;
}

const GEMINI_PROVIDER = "google-gemini";

function hashQuery(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function executeSemanticSearch({
  query,
  category,
  limit,
}: SemanticSearchOptions): Promise<SemanticSearchResult> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return { matches: [], embedding: [] };
  }

  const embeddingHash = hashQuery(`${normalizedQuery}|${category ?? "*"}`);

  const embeddingRecord = await convexServerClient.query(
    api.embeddings.getByHash,
    {
      hash: embeddingHash,
    }
  );

  let embedding = embeddingRecord?.embedding ?? [];

  if (embedding.length === 0) {
    embedding = await generateEmbedding(normalizedQuery, {
      usage: "query",
      dimensions: 768,
    });
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

  const matches = await convexServerClient.action(
    (api as any).search.semantic,
    {
      embedding,
      limit,
      category,
    }
  );

  return {
    matches,
    embedding,
  };
}
