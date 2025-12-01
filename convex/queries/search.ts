import { query, action, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Vector search moved to actions.ts since it must be an action

/**
 * Internal full-text search query for use within actions
 * 
 * This internal query allows actions to perform full-text search without
 * going through the public API, reducing latency.
 * 
 * @param query - Search query text
 * @param category - Optional category filter
 * @param lang - Optional language filter ("en" | "vi")
 * @param limit - Maximum number of results (default: 20, max: 50)
 * @returns Array of search results with text match scores
 */
export const internalFullTextSearch = internalQuery({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, category, lang, limit }) => {
    // Validate and normalize limit
    const take = Math.min(Math.max(limit ?? 20, 1), 50);

    // Validate query
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();

    // Try primary search using by_text index (searches content field)
    let results = await ctx.db
      .query("qa")
      .withSearchIndex("by_text", (q) => {
        let searchQuery = q.search("content", trimmedQuery);
        
        // Apply category filter if provided
        if (category) {
          searchQuery = searchQuery.eq("category", category);
        }
        
        // Apply language filter if provided
        if (lang) {
          searchQuery = searchQuery.eq("lang", lang);
        }
        
        return searchQuery;
      })
      .take(take);

    // Fallback to keywords search if no results from primary search
    if (results.length === 0) {
      results = await ctx.db
        .query("qa")
        .withSearchIndex("search_by_keywords", (q) => {
          let searchQuery = q.search("keywords_searchable", trimmedQuery);
          
          // Apply category filter if provided
          if (category) {
            searchQuery = searchQuery.eq("category", category);
          }
          
          // Apply language filter if provided
          if (lang) {
            searchQuery = searchQuery.eq("lang", lang);
          }
          
          return searchQuery;
        })
        .take(take);
    }

    // Return results with text match scores
    return results.map((result) => ({
      _id: result._id,
      question: result.question,
      answer: result.answer,
      category: result.category,
      sources: result.sources,
      question_number: result.question_number,
      section_number: result.section_number,
      section_title: result.section_title,
      lang: result.lang,
      textScore: result._score, // Text match score from full-text search
    }));
  },
});

/**
 * Enhanced full-text search query using the qa table with search indexes
 * 
 * Performs keyword-based search using Convex full-text search with fallback
 * to keywords index if no results found. Supports filtering by category and language.
 * 
 * @param query - Search query text
 * @param category - Optional category filter
 * @param lang - Optional language filter ("en" | "vi")
 * @param limit - Maximum number of results (default: 20, max: 50)
 * @returns Array of search results with text match scores
 */
export const fullTextSearch = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, category, lang, limit }) => {
    // Validate and normalize limit
    const take = Math.min(Math.max(limit ?? 20, 1), 50);

    // Validate query
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();

    // Try primary search using by_text index (searches content field)
    let results = await ctx.db
      .query("qa")
      .withSearchIndex("by_text", (q) => {
        let searchQuery = q.search("content", trimmedQuery);
        
        // Apply category filter if provided
        if (category) {
          searchQuery = searchQuery.eq("category", category);
        }
        
        // Apply language filter if provided
        if (lang) {
          searchQuery = searchQuery.eq("lang", lang);
        }
        
        return searchQuery;
      })
      .take(take);

    // Fallback to keywords search if no results from primary search
    if (results.length === 0) {
      results = await ctx.db
        .query("qa")
        .withSearchIndex("search_by_keywords", (q) => {
          let searchQuery = q.search("keywords_searchable", trimmedQuery);
          
          // Apply category filter if provided
          if (category) {
            searchQuery = searchQuery.eq("category", category);
          }
          
          // Apply language filter if provided
          if (lang) {
            searchQuery = searchQuery.eq("lang", lang);
          }
          
          return searchQuery;
        })
        .take(take);
    }

    // Return results with text match scores
    return results.map((result) => ({
      _id: result._id,
      question: result.question,
      answer: result.answer,
      category: result.category,
      sources: result.sources,
      question_number: result.question_number,
      section_number: result.section_number,
      section_title: result.section_title,
      lang: result.lang,
      textScore: result._score, // Text match score from full-text search
    }));
  },
});

/**
 * Get unique categories from the qa table
 * 
 * Extracts all unique category values from the qa table and returns them
 * in a sorted array. This query is designed to be cached with infinite
 * stale time on the client side since categories rarely change.
 * 
 * @returns Sorted array of unique category names
 * 
 * Requirements: 4.1
 */
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all qa records
    const allQAs = await ctx.db.query("qa").collect();
    
    // Extract unique categories using a Set
    const categorySet = new Set<string>();
    
    for (const qa of allQAs) {
      if (qa.category && qa.category.trim().length > 0) {
        categorySet.add(qa.category.trim());
      }
    }
    
    // Convert to array and sort alphabetically
    const categories = Array.from(categorySet).sort((a, b) => 
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    
    return categories;
  },
});

/**
 * Legacy vector search query (kept for backward compatibility)
 * 
 * @deprecated This uses the old withVectorIndex pattern on queries.
 * Vector search must be performed in actions using ctx.vectorSearch().
 * Use api.actions.vectorSearch instead.
 */
export const vectorSearchDoc = query({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { embedding, category, lang, limit }) => {
    const take = Math.min(limit ?? 10, 50);

    return ctx.db
      .query("qa")
      .withVectorIndex("by_embedding_doc", (q) => {
        let cursor = q.nearest("embedding_doc", embedding);
        if (category) {
          cursor = cursor.eq("category", category);
        }
        if (lang) {
          cursor = cursor.eq("lang", lang);
        }
        return cursor;
      })
      .take(take);
  },
});
