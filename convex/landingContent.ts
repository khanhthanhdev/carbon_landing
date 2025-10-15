import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const BOOK_KEY = "recommendedBook";

export const getRecommendedBook = query({
  args: {
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const locale = args.locale ?? "vi";
    let record = await ctx.db
      .query("landingContent")
      .withIndex("byKey", (q) => q.eq("key", BOOK_KEY).eq("locale", locale))
      .first();

    if (!record && locale !== "vi") {
      record = await ctx.db
        .query("landingContent")
        .withIndex("byKey", (q) => q.eq("key", BOOK_KEY).eq("locale", "vi"))
        .first();
    }

    if (!record) {
      return null;
    }

    return {
      id: record._id,
      ...record.payload,
      locale: record.locale,
      updatedAt: record.updatedAt,
    };
  },
});

export const setRecommendedBook = mutation({
  args: {
    locale: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    pages: v.optional(v.number()),
    publisher: v.optional(v.string()),
    year: v.optional(v.number()),
    isbn: v.optional(v.string()),
    purchaseLinks: v.optional(
      v.array(
        v.object({
          retailer: v.string(),
          url: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("landingContent")
      .withIndex("byKey", (q) => q.eq("key", BOOK_KEY).eq("locale", args.locale))
      .first();

    const payload = {
      title: args.title,
      author: args.author,
      description: args.description,
      coverImage: args.coverImage,
      pages: args.pages,
      publisher: args.publisher,
      year: args.year,
      isbn: args.isbn,
      purchaseLinks: args.purchaseLinks,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        payload,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("landingContent", {
      key: BOOK_KEY,
      locale: args.locale,
      payload,
      updatedAt: now,
    });
  },
});
