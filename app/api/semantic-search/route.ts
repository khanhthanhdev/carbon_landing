import { NextResponse } from "next/server";
import { z } from "zod";
import { executeSemanticSearch } from "@/lib/server/semantic-search";
import { generateText } from "@/lib/ai/gemini";

const SemanticSearchSchema = z.object({
  query: z.string().trim().min(3),
  category: z.string().trim().optional(),
  locale: z.string().trim().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

const SUMMARY_PROMPT_TEMPLATE = `You are an expert assistant helping SME businesses understand carbon markets.
Summarize the key insights relevant to the user's question using the provided context.
Be concise (120 words max) and include actionable next steps when possible.`;

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = SemanticSearchSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { query, category, limit = 5, locale } = parsed.data;
    const { matches } = await executeSemanticSearch({ query, category, limit });

    let summary: string | null = null;

    if (matches.length > 0) {
      const context = matches
        .slice(0, 3)
        .map((match) => `Q: ${match.question}\nA: ${stripHtml(match.answer)}`)
        .join("\n\n");

      summary = await generateText(
        `${SUMMARY_PROMPT_TEMPLATE}\n\nContext:\n${context}\n\nUser question: ${query}`,
        { locale },
      );
    }

    return NextResponse.json({ matches, summary });
  } catch (error) {
    console.error("Semantic search failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
