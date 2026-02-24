import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get multiple QA documents by their IDs
 */
export const getQAsByIds = query({
  args: {
    ids: v.array(v.id("qa")),
  },
  handler: async (ctx, { ids }) => {
    const documents = await Promise.all(ids.map((id) => ctx.db.get(id)));

    return documents.filter(
      (doc): doc is NonNullable<typeof doc> => doc !== null
    );
  },
});

/**
 * Get a single QA document by ID
 */
export const getQAById = query({
  args: {
    id: v.id("qa"),
  },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
