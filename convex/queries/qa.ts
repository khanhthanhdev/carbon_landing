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
