import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { convexServerClient } from "@/lib/convex-server";

const SearchSchema = z.object({
  query: z.string().trim().min(2, "Query must be at least 2 characters"),
  searchType: z.enum(["vector", "fulltext"]).optional().default("fulltext"),
  category: z.string().trim().optional(),
  lang: z.string().trim().optional(),
  topK: z.number().int().min(1).max(50).optional().default(10),
  alpha: z.number().min(0).max(1).optional().default(0.6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SearchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { query, searchType, category, lang, topK, alpha } = parsed.data;

    // Helper: call Convex action with timeout + retries for transient failures.
    //
    // Rationale: In production we occasionally see network hiccups or Convex
    // service timeouts (ETIMEDOUT / fetch failed). Rather than exposing a hard
    // 500 to the user, we retry a few times with exponential backoff and a
    // per-attempt timeout. If all attempts fail we return a 503 so the client
    // can show a friendly fallback message (and avoid aggressive retries).
    const callConvexActionWithRetry = async (
      action: any,
      params: Record<string, unknown>,
      options: {
        attempts?: number;
        timeoutMs?: number;
        baseDelayMs?: number;
      } = {}
    ) => {
      const attempts = options.attempts ?? 3;
      const timeoutMs = options.timeoutMs ?? 5000; // per-attempt timeout
      const baseDelayMs = options.baseDelayMs ?? 300;

      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          // Wrap the convex call with a timeout race so we can fail fast on hung requests
          const convexPromise = convexServerClient.action(action, params);
          const result = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              reject(new Error("Convex action timed out"));
            }, timeoutMs);

            convexPromise
              .then((r: unknown) => {
                clearTimeout(timer);
                resolve(r);
              })
              .catch((e: unknown) => {
                clearTimeout(timer);
                reject(e);
              });
          });

          return result;
        } catch (err: unknown) {
          // Determine if error is transient (network timeout / fetch failed / ETIMEDOUT)
          const message = err instanceof Error ? err.message : String(err);
          const transient =
            message.includes("timed out") ||
            message.includes("fetch failed") ||
            message.includes("ETIMEDOUT") ||
            message.includes("ECONNRESET") ||
            message.includes("network") ||
            err instanceof AggregateError;

          // If last attempt or not transient, rethrow immediately
          if (attempt === attempts || !transient) {
            throw err;
          }

          // exponential backoff before retrying
          const delay = baseDelayMs * 2 ** (attempt - 1);
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) => setTimeout(res, delay));
        }
      }

      // Shouldn't reach here, but throw as safeguard
      throw new Error("Failed to call Convex action after retries");
    };

    // Call the Convex hybridSearch action with retries and timeout.
    let result;
    try {
      // Use `any` cast on `api` to avoid generated type mismatches while preserving runtime reference
      result = await callConvexActionWithRetry(
        (api as any).actions.hybridSearch,
        {
          query,
          searchType,
          category,
          lang,
          topK,
          alpha,
        },
        { attempts: 3, timeoutMs: 8000, baseDelayMs: 300 }
      );
    } catch (err: unknown) {
      console.error("Convex action failed after retries:", err);
      // Return a friendly service-unavailable response so client can fallback
      return NextResponse.json(
        {
          error: "Search service temporarily unavailable",
          fallback: true,
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Search API error:", error);

    // Return appropriate error response with more context
    if (error instanceof Error) {
      // Check if it's a Convex-related error
      if (
        error.message.includes("Not found") ||
        error.message.includes("404")
      ) {
        return NextResponse.json(
          {
            error: "Search service temporarily unavailable",
            fallback: true,
            details:
              "Please try again later or use the question request form below",
          },
          { status: 503 } // Service Unavailable instead of 404
        );
      }

      return NextResponse.json(
        {
          error: error.message,
          fallback: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Search service temporarily unavailable",
        fallback: true,
        details:
          "Please try again later or use the question request form below",
      },
      { status: 503 }
    );
  }
}
