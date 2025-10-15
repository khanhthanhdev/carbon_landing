import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    rating: v.number(),
    comment: v.string(),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();

    return ctx.db.insert("feedback", {
      name: args.name,
      email: args.email,
      rating: args.rating,
      comment: args.comment,
      locale: args.locale,
      createdAt,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const feedbackEntries = await ctx.db.query("feedback").collect();
    return feedbackEntries.map((entry) => ({
      id: entry._id,
      ...entry,
    }));
  },
});
