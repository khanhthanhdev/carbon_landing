import { NextResponse } from "next/server";
import { z } from "zod";
import { convexServerClient } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

const QuestionRequestSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  question: z.string().trim().min(10),
  sourceQuery: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = QuestionRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email, question, sourceQuery } = parsed.data;

    await convexServerClient.mutation(api.questionRequests.create, {
      name,
      email,
      question,
      sourceQuery,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to submit question request", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
