import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const upsertQA = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    sources: v.optional(
      v.array(
        v.object({
          type: v.optional(v.string()),
          title: v.optional(v.string()),
          url: v.optional(v.string()),
          location: v.optional(v.string()),
          note: v.optional(v.string()),
        }),
      ),
    ),
    category: v.string(),
    lang: v.optional(v.string()),
    embedding_doc: v.array(v.float64()),
    embedding_qa: v.optional(v.array(v.float64())),
    embedding_fact: v.optional(v.array(v.float64())),
    content: v.string(),
    searchable_text: v.optional(v.string()),
    section_id: v.optional(v.string()),
    section_number: v.optional(v.string()),
    section_title: v.optional(v.string()),
    question_number: v.optional(v.string()),
    source_id: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    question_lower: v.optional(v.string()),
    keywords_searchable: v.optional(v.string()),
    category_searchable: v.optional(v.string()),
    has_sources: v.optional(v.boolean()),
    answer_length: v.optional(v.number()),
    metadata_created_at: v.optional(v.string()),
    metadata_updated_at: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("qa")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("question"), args.question))
      .first();

    if (existing) {
      const patchPayload: Record<string, unknown> = {
        answer: args.answer,
        category: args.category,
        content: args.content,
        embedding_doc: args.embedding_doc,
        updatedAt: now,
        ...(args.searchable_text !== undefined ? { searchable_text: args.searchable_text } : {}),
        ...(args.section_id !== undefined ? { section_id: args.section_id } : {}),
        ...(args.section_number !== undefined ? { section_number: args.section_number } : {}),
        ...(args.section_title !== undefined ? { section_title: args.section_title } : {}),
        ...(args.question_number !== undefined ? { question_number: args.question_number } : {}),
        ...(args.source_id !== undefined ? { source_id: args.source_id } : {}),
        ...(args.keywords !== undefined ? { keywords: args.keywords } : {}),
        ...(args.question_lower !== undefined ? { question_lower: args.question_lower } : {}),
        ...(args.keywords_searchable !== undefined ? { keywords_searchable: args.keywords_searchable } : {}),
        ...(args.category_searchable !== undefined ? { category_searchable: args.category_searchable } : {}),
        ...(args.has_sources !== undefined ? { has_sources: args.has_sources } : {}),
        ...(args.answer_length !== undefined ? { answer_length: args.answer_length } : {}),
        ...(args.metadata_created_at !== undefined ? { metadata_created_at: args.metadata_created_at } : {}),
        ...(args.metadata_updated_at !== undefined ? { metadata_updated_at: args.metadata_updated_at } : {}),
      };

      if (args.sources !== undefined) patchPayload.sources = args.sources;
      if (args.lang !== undefined) patchPayload.lang = args.lang;
      if (args.embedding_qa !== undefined) patchPayload.embedding_qa = args.embedding_qa;
      if (args.embedding_fact !== undefined) patchPayload.embedding_fact = args.embedding_fact;

      await ctx.db.patch(existing._id, patchPayload);
      return existing._id;
    }

    return ctx.db.insert("qa", {
      question: args.question,
      answer: args.answer,
      sources: args.sources ?? [],
      category: args.category,
      lang: args.lang,
      content: args.content,
      searchable_text: args.searchable_text,
      section_id: args.section_id,
      section_number: args.section_number,
      section_title: args.section_title,
      question_number: args.question_number,
      source_id: args.source_id,
      keywords: args.keywords,
      question_lower: args.question_lower,
      keywords_searchable: args.keywords_searchable,
      category_searchable: args.category_searchable,
      has_sources: args.has_sources,
      answer_length: args.answer_length,
      metadata_created_at: args.metadata_created_at,
      metadata_updated_at: args.metadata_updated_at,
      embedding_doc: args.embedding_doc,
      embedding_qa: args.embedding_qa,
      embedding_fact: args.embedding_fact,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const patchQA = mutation({
  args: {
    id: v.id("qa"),
    embedding_doc: v.optional(v.array(v.float64())),
    embedding_qa: v.optional(v.array(v.float64())),
    embedding_fact: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });
    
    return id;
  },
});
