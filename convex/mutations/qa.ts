import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const upsertQA = mutation({
  args: {
    id: v.optional(v.id("qa")),
    question: v.string(),
    answer: v.string(),
    sources: v.optional(v.array(v.any())),
    category: v.string(),
    lang: v.optional(v.string()),
    embedding_doc: v.optional(v.array(v.float64())),
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
    const basePatch: any = {
      question: args.question,
      answer: args.answer,
      category: args.category,
      content: args.content,
      updatedAt: now,
    };

    if (args.embedding_doc !== undefined) {
      basePatch.embedding_doc = args.embedding_doc;
    }
    if (args.searchable_text !== undefined) {
      basePatch.searchable_text = args.searchable_text;
    }
    if (args.section_id !== undefined) {
      basePatch.section_id = args.section_id;
    }
    if (args.section_number !== undefined) {
      basePatch.section_number = args.section_number;
    }
    if (args.section_title !== undefined) {
      basePatch.section_title = args.section_title;
    }
    if (args.question_number !== undefined) {
      basePatch.question_number = args.question_number;
    }
    if (args.source_id !== undefined) {
      basePatch.source_id = args.source_id;
    }
    if (args.keywords !== undefined) {
      basePatch.keywords = args.keywords;
    }
    if (args.question_lower !== undefined) {
      basePatch.question_lower = args.question_lower;
    }
    if (args.keywords_searchable !== undefined) {
      basePatch.keywords_searchable = args.keywords_searchable;
    }
    if (args.category_searchable !== undefined) {
      basePatch.category_searchable = args.category_searchable;
    }
    if (args.has_sources !== undefined) {
      basePatch.has_sources = args.has_sources;
    }
    if (args.answer_length !== undefined) {
      basePatch.answer_length = args.answer_length;
    }
    if (args.metadata_created_at !== undefined) {
      basePatch.metadata_created_at = args.metadata_created_at;
    }
    if (args.metadata_updated_at !== undefined) {
      basePatch.metadata_updated_at = args.metadata_updated_at;
    }
    if (args.sources !== undefined) {
      basePatch.sources = args.sources;
    }
    if (args.lang !== undefined) {
      basePatch.lang = args.lang;
    }
    if (args.embedding_qa !== undefined) {
      basePatch.embedding_qa = args.embedding_qa;
    }
    if (args.embedding_fact !== undefined) {
      basePatch.embedding_fact = args.embedding_fact;
    }

    if (args.id) {
      await ctx.db.patch(args.id, basePatch);
      return args.id;
    }

    const existing = await ctx.db
      .query("qa")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("question"), args.question))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, basePatch);
      return existing._id;
    }

    return ctx.db.insert("qa", {
      category: args.category,
      question: args.question,
      answer: args.answer,
      content: args.content,
      createdAt: now,
      updatedAt: now,
      ...basePatch,
    } as any);
  },
});

export const importQuestion = mutation({
  args: {
    question: v.optional(v.string()),
    answer: v.optional(v.string()),
    searchable_text: v.optional(v.string()),
    summary: v.optional(v.string()),
    question_number: v.optional(v.string()),
    section_number: v.optional(v.string()),
    section_title: v.optional(v.string()),
    category: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    has_sources: v.optional(v.boolean()),
    answer_length: v.optional(v.number()),
    sources: v.optional(v.array(v.any())),
    question_lower: v.optional(v.string()),
    keywords_searchable: v.optional(v.string()),
    category_searchable: v.optional(v.string()),
    lang: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
    sequence: v.optional(v.number()),
    is_common: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const baseData: any = {
      updatedAt: now,
    };

    // Map all the fields
    if (args.question !== undefined) {
      baseData.question = args.question;
    }
    if (args.answer !== undefined) {
      baseData.answer = args.answer;
    }
    if (args.searchable_text !== undefined) {
      baseData.searchable_text = args.searchable_text;
    }
    if (args.summary !== undefined) {
      baseData.summary = args.summary;
    }
    if (args.question_number !== undefined) {
      baseData.question_number = args.question_number;
    }
    if (args.section_number !== undefined) {
      baseData.section_number = args.section_number;
    }
    if (args.section_title !== undefined) {
      baseData.section_title = args.section_title;
    }
    if (args.category !== undefined) {
      baseData.category = args.category;
    }
    if (args.keywords !== undefined) {
      baseData.keywords = args.keywords;
    }
    if (args.has_sources !== undefined) {
      baseData.has_sources = args.has_sources;
    }
    if (args.answer_length !== undefined) {
      baseData.answer_length = args.answer_length;
    }
    if (args.sources !== undefined) {
      baseData.sources = args.sources;
    }
    if (args.question_lower !== undefined) {
      baseData.question_lower = args.question_lower;
    }
    if (args.keywords_searchable !== undefined) {
      baseData.keywords_searchable = args.keywords_searchable;
    }
    if (args.category_searchable !== undefined) {
      baseData.category_searchable = args.category_searchable;
    }
    if (args.lang !== undefined) {
      baseData.lang = args.lang;
    }
    if (args.embedding !== undefined) {
      baseData.embedding = args.embedding;
    }
    if (args.created_at !== undefined) {
      baseData.created_at = args.created_at;
    }
    if (args.updated_at !== undefined) {
      baseData.updated_at = args.updated_at;
    }
    if (args.sequence !== undefined) {
      baseData.sequence = args.sequence;
    }
    if (args.is_common !== undefined) {
      baseData.is_common = args.is_common;
    }
    if (args.tags !== undefined) {
      baseData.tags = args.tags;
    }

    // For backward compatibility, set content to answer if not provided
    if (!baseData.content && baseData.answer) {
      baseData.content = baseData.answer;
    }

    return ctx.db.insert("qa", baseData);
  },
});

export const replaceAll = mutation({
  args: {
    questions: v.array(
      v.object({
        question: v.optional(v.string()),
        answer: v.optional(v.string()),
        searchable_text: v.optional(v.string()),
        summary: v.optional(v.string()),
        question_number: v.optional(v.string()),
        section_number: v.optional(v.string()),
        section_title: v.optional(v.string()),
        category: v.optional(v.string()),
        keywords: v.optional(v.array(v.string())),
        has_sources: v.optional(v.boolean()),
        answer_length: v.optional(v.number()),
        sources: v.optional(v.array(v.any())),
        question_lower: v.optional(v.string()),
        keywords_searchable: v.optional(v.string()),
        category_searchable: v.optional(v.string()),
        lang: v.optional(v.string()),
        embedding: v.optional(v.array(v.float64())),
        created_at: v.optional(v.string()),
        updated_at: v.optional(v.string()),
        sequence: v.optional(v.number()),
        is_common: v.optional(v.boolean()),
        tags: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete all existing qa records
    const existingRecords = await ctx.db.query("qa").collect();
    for (const record of existingRecords) {
      await ctx.db.delete(record._id);
    }

    // Insert new records
    const results = [];
    for (const question of args.questions) {
      const now = Date.now();
      const baseData: any = {
        createdAt: now,
        updatedAt: now,
      };

      // Map all the fields
      if (question.question !== undefined) {
        baseData.question = question.question;
      }
      if (question.answer !== undefined) {
        baseData.answer = question.answer;
      }
      if (question.searchable_text !== undefined) {
        baseData.searchable_text = question.searchable_text;
      }
      if (question.summary !== undefined) {
        baseData.summary = question.summary;
      }
      if (question.question_number !== undefined) {
        baseData.question_number = question.question_number;
      }
      if (question.section_number !== undefined) {
        baseData.section_number = question.section_number;
      }
      if (question.section_title !== undefined) {
        baseData.section_title = question.section_title;
      }
      if (question.category !== undefined) {
        baseData.category = question.category;
      }
      if (question.keywords !== undefined) {
        baseData.keywords = question.keywords;
      }
      if (question.has_sources !== undefined) {
        baseData.has_sources = question.has_sources;
      }
      if (question.answer_length !== undefined) {
        baseData.answer_length = question.answer_length;
      }
      if (question.sources !== undefined) {
        baseData.sources = question.sources;
      }
      if (question.question_lower !== undefined) {
        baseData.question_lower = question.question_lower;
      }
      if (question.keywords_searchable !== undefined) {
        baseData.keywords_searchable = question.keywords_searchable;
      }
      if (question.category_searchable !== undefined) {
        baseData.category_searchable = question.category_searchable;
      }
      if (question.lang !== undefined) {
        baseData.lang = question.lang;
      }
      if (question.embedding !== undefined) {
        baseData.embedding = question.embedding;
      }
      if (question.created_at !== undefined) {
        baseData.created_at = question.created_at;
      }
      if (question.updated_at !== undefined) {
        baseData.updated_at = question.updated_at;
      }
      if (question.sequence !== undefined) {
        baseData.sequence = question.sequence;
      }
      if (question.is_common !== undefined) {
        baseData.is_common = question.is_common;
      }
      if (question.tags !== undefined) {
        baseData.tags = question.tags;
      }

      // For backward compatibility, set content to answer if not provided
      if (!baseData.content && baseData.answer) {
        baseData.content = baseData.content = baseData.answer;
      }

      const id = await ctx.db.insert("qa", baseData);
      results.push(id);
    }

    return results;
  },
});

export const patchQA = mutation({
  args: {
    id: v.id("qa"),
    lang: v.optional(v.string()),
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

export const deleteQA = mutation({
  args: { id: v.id("qa") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});
