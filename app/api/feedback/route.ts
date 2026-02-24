import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { convexServerClient } from "@/lib/convex-server";

const FeedbackSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5),
  locale: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = FeedbackSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, rating, comment, locale } = parsed.data;

    await convexServerClient.mutation(api.feedback.submit, {
      name,
      email,
      rating,
      comment,
      locale,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to submit feedback", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
