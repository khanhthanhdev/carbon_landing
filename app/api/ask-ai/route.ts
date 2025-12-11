import { NextResponse } from "next/server";
import { z } from "zod";
import { convexServerClient } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

const AskAISchema = z.object({
  question: z.string().trim().min(1, "Question cannot be empty"),
  sessionId: z.string().trim().min(1, "Session ID is required"),
  locale: z.string().trim().optional().default("vi"),
  maxSources: z.number().int().min(1).max(10).optional().default(5),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = AskAISchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid AI request parameters",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const { question, sessionId, locale, maxSources } = parsed.data;

    // Call the Convex askAI action
    const result = await convexServerClient.action(api.rag.askAI, {
      question,
      sessionId,
      locale,
      maxSources,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Ask AI API error:", error);

    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}