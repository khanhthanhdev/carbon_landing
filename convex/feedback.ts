import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkIsAdmin } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }
    return await ctx.db.query("feedback").order("desc").collect();
  },
});

export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    rating: v.number(),
    comment: v.string(),
    locale: v.optional(v.string()),
    // 1️⃣ Nội dung thông tin
    contentAccuracy: v.optional(v.number()),
    contentRelevance: v.optional(v.number()),
    contentFreshness: v.optional(v.number()),
    // 2️⃣ Dễ sử dụng
    interfaceSimplicity: v.optional(v.number()),
    languageSupport: v.optional(v.number()),
    // 3️⃣ Công cụ và tính năng hỗ trợ
    toolsAvailability: v.optional(v.number()),
    // 4️⃣ Kết nối và chia sẻ
    networkingCapability: v.optional(v.number()),
    knowledgeSharing: v.optional(v.number()),
    // 5️⃣ Giá trị và tác động
    understandingImprovement: v.optional(v.number()),
    practicalApplication: v.optional(v.number()),
    // 6️⃣ Sự hài lòng chung
    overallSatisfaction: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();

    return ctx.db.insert("feedback", {
      name: args.name,
      email: args.email,
      rating: args.rating,
      comment: args.comment,
      locale: args.locale,
      contentAccuracy: args.contentAccuracy,
      contentRelevance: args.contentRelevance,
      contentFreshness: args.contentFreshness,
      interfaceSimplicity: args.interfaceSimplicity,
      languageSupport: args.languageSupport,
      toolsAvailability: args.toolsAvailability,
      networkingCapability: args.networkingCapability,
      knowledgeSharing: args.knowledgeSharing,
      understandingImprovement: args.understandingImprovement,
      practicalApplication: args.practicalApplication,
      overallSatisfaction: args.overallSatisfaction,
      createdAt,
    });
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const feedbackEntries = await ctx.db.query("feedback").collect();
    return feedbackEntries.map((entry) => ({
      id: entry._id,
      ...entry,
    }));
  },
});
