import { NextResponse } from "next/server";
import { z } from "zod";
import { convexServerClient } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

const SearchSchema = z.object({
  query: z.string().trim().min(2, "Query must be at least 2 characters"),
  searchType: z.enum(["hybrid", "vector", "fulltext"]).optional().default("hybrid"),
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
          details: parsed.error.flatten() 
        }, 
        { status: 400 }
      );
    }

    const { query, searchType, category, lang, topK, alpha } = parsed.data;

    // Call the Convex hybridSearch action
    const result = await convexServerClient.action(api.actions.hybridSearch, {
      query,
      searchType,
      category,
      lang,
      topK,
      alpha,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Search API error:", error);
    
    // Return appropriate error response with more context
    if (error instanceof Error) {
      // Check if it's a Convex-related error
      if (error.message.includes("Not found") || error.message.includes("404")) {
        return NextResponse.json(
          { 
            error: "Search service temporarily unavailable",
            fallback: true,
            details: "Please try again later or use the question request form below"
          },
          { status: 503 } // Service Unavailable instead of 404
        );
      }
      
      return NextResponse.json(
        { 
          error: error.message,
          fallback: true 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Search service temporarily unavailable",
        fallback: true,
        details: "Please try again later or use the question request form below"
      },
      { status: 503 }
    );
  }
}