import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

const normalizeText = (value: string) => value.trim();
const toSearchable = (value: string) => normalizeText(value).toLowerCase();

export const saveQAWithEmbeddings = action({
  args: {
    id: v.optional(v.id("qa")),
    question: v.string(),
    answer: v.string(),
    content: v.optional(v.string()),
    category: v.string(),
    lang: v.optional(v.string()),
    section_id: v.optional(v.string()),
    section_number: v.optional(v.string()),
    section_title: v.optional(v.string()),
    question_number: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    sources: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const isAdmin = await ctx.runQuery(api.users.isAdmin, {});
    if (!isAdmin) {
      throw new Error("Unauthorized: admin access required");
    }

    const existing = args.id
      ? await ctx.runQuery(api.queries.qa.get, { id: args.id as any })
      : null;

    const question = normalizeText(args.question as string);
    const answer = normalizeText(args.answer as string);
    const category = normalizeText(args.category as string);
    const lang = args.lang ? normalizeText(args.lang as string) : undefined;
    const keywords = ((args.keywords ?? []) as string[])
      .map((value) => normalizeText(value))
      .filter(Boolean);
    const keywords_searchable = keywords
      .map((value) => value.toLowerCase())
      .join(" ");
    const category_searchable = category.toLowerCase();
    const question_lower = question.toLowerCase();
    const content = args.content
      ? normalizeText(args.content as string)
      : `${question}\n\n${answer}`.trim();
    const searchableText = `${question}\n\n${answer}`.trim();
    const timestampIso = new Date().toISOString();

    if (!question) {
      throw new Error("Question is required.");
    }
    if (!answer) {
      throw new Error("Answer is required.");
    }
    if (!category) {
      throw new Error("Category is required.");
    }

    const embeddings = await ctx.runAction(api.embeddings.embedQADocumentAll, {
      question,
      answer,
    });

    const mutationPayload: any = {
      question,
      answer,
      category,
      lang,
      section_id: args.section_id,
      section_number: args.section_number,
      section_title: args.section_title,
      question_number: args.question_number,
      keywords,
      sources: args.sources ?? [],
      content,
      searchable_text: searchableText,
      question_lower,
      keywords_searchable,
      category_searchable,
      has_sources: ((args.sources ?? []) as any[]).length > 0,
      answer_length: answer.length,
      metadata_created_at:
        existing?.metadata_created_at ??
        (existing?.createdAt
          ? new Date(existing.createdAt).toISOString()
          : timestampIso),
      metadata_updated_at: timestampIso,
      embedding_doc: embeddings.embedding_doc,
      embedding_qa: embeddings.embedding_qa,
      embedding_fact: embeddings.embedding_fact,
    };

    if (args.id) {
      mutationPayload.id = args.id;
    }

    const id = await ctx.runMutation(
      api.mutations.qa.upsertQA,
      mutationPayload
    );

    return {
      id,
      updated: Boolean(existing),
    };
  },
});

export const deleteQA = action({
  args: { id: v.id("qa") },
  handler: async (ctx, args) => {
    const isAdmin = await ctx.runQuery(api.users.isAdmin, {});
    if (!isAdmin) {
      throw new Error("Unauthorized: admin access required");
    }

    await ctx.runMutation(api.mutations.qa.deleteQA, { id: args.id });
    return { id: args.id };
  },
});
