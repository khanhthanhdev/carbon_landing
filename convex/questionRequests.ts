import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    question: v.string(),
    sourceQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();

    return ctx.db.insert("questionRequests", {
      name: args.name,
      email: args.email,
      question: args.question,
      status: "pending",
      sourceQuery: args.sourceQuery,
      createdAt,
    });
  },
});

export const createAction = action({
  args: {
    name: v.string(),
    email: v.string(),
    question: v.string(),
    sourceQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const _createdAt = Date.now();

    return await ctx.runMutation(api.questionRequests.create, {
      name: args.name,
      email: args.email,
      question: args.question,
      sourceQuery: args.sourceQuery,
    });
  },
});

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("triaged"),
        v.literal("completed")
      )
    ),
  },
  handler: async (ctx, args) => {
    let queryBuilder = ctx.db.query("questionRequests");

    if (args.status) {
      queryBuilder = queryBuilder.filter((q) =>
        q.eq(q.field("status"), args.status!)
      );
    }

    const requests = await queryBuilder.collect();

    return requests.map((request) => ({
      id: request._id,
      ...request,
    }));
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("questionRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("triaged"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return args.status;
  },
});
