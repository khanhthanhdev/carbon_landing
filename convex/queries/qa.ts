import { paginationOptsValidator } from "convex/server";
import { query } from "../_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("qa").collect();
  },
});

export const get = query({
  args: { id: v.id("qa") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    lang: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.search?.trim();
    const lang = args.lang?.trim();
    const category = args.category?.trim();

    const baseQuery = (() => {
      if (searchTerm) {
        return ctx.db.query("qa").withSearchIndex("by_text", (q) => {
          let queryBuilder = q.search("content", searchTerm);
          if (category) {
            queryBuilder = queryBuilder.eq("category", category);
          }
          if (lang) {
            queryBuilder = queryBuilder.eq("lang", lang);
          }
          return queryBuilder;
        });
      }

      if (category) {
        let queryBuilder = ctx.db
          .query("qa")
          .withIndex("by_category", (q) => q.eq("category", category));
        if (lang) {
          queryBuilder = queryBuilder.filter((q) => q.eq(q.field("lang"), lang));
        }
        return queryBuilder;
      }

      let queryBuilder = ctx.db.query("qa");
      if (lang) {
        queryBuilder = queryBuilder.filter((q) => q.eq(q.field("lang"), lang));
      }
      return queryBuilder;
    })();

    const result = await baseQuery.paginate(args.paginationOpts);

    const sortedPage = [...result.page].sort(
      (a, b) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime),
    );

    return {
      ...result,
      page: sortedPage,
    };
  },
});
