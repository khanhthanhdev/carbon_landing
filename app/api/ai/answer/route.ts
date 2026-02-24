import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "@/lib/ai/gemini";
import { executeSemanticSearch } from "@/lib/server/semantic-search";

const AnswerSchema = z.object({
  question: z.string().trim().min(5),
  locale: z.string().trim().optional(),
});

const ANSWER_PROMPT_TEMPLATE = `You are CarbonLearn, an AI assistant helping Vietnamese SMEs understand carbon markets.
Use the provided context to answer the user's question with specific guidance.
Highlight key terms, suggest concrete actions, and mention relevant regulations if applicable.
If information is unavailable in the context, say so and recommend next steps.`;

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildContext(matches: Array<{ question: string; answer: string }>) {
  return matches
    .map(
      (match, index) =>
        `Context ${index + 1}:\nQuestion: ${match.question}\nAnswer: ${stripHtml(match.answer)}`
    )
    .join("\n\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = AnswerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { question, locale } = parsed.data;

    const { matches } = await executeSemanticSearch({
      query: question,
      limit: 5,
    });
    const topMatches = matches.slice(0, 4).map((match) => ({
      question: match.question,
      answer: match.answer,
    }));

    const context = buildContext(topMatches);

    const answer = await generateText(
      `${ANSWER_PROMPT_TEMPLATE}\n\nUser Question: ${question}\n\nContextual Information:\n${context}`,
      { locale }
    );

    return NextResponse.json({
      answer,
      sources: matches.slice(0, 4).map((match) => ({
        id: match.id,
        question: match.question,
        category: match.category,
        sources: match.sources,
      })),
    });
  } catch (error) {
    console.error("AI answer failed", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
