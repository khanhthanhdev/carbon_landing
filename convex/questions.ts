import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();
const trimString = (value: string) => value.trim();
const toSearchable = (value: string) =>
  collapseWhitespace(value)
    .toLowerCase()
    .normalize("NFKD");

export type QuestionSourceInput = {
  type: string;
  title: string;
  url: string;
  location?: string;
};

export type QuestionInput = {
  question: string;
  answer: string;
  searchable_text?: string;
  summary?: string;
  question_number: string;
  section_number: string;
  section_title: string;
  category: string;
  keywords: string[];
  has_sources?: boolean;
  answer_length?: number;
  sources: QuestionSourceInput[];
  question_lower?: string;
  keywords_searchable?: string;
  category_searchable?: string;
  embedding?: number[] | null;
  created_at?: string;
  updated_at?: string;
  sequence?: number;
  is_common?: boolean;
  tags?: string[];
};

type QuestionRecord = Omit<Doc<"questions">, "_id" | "_creationTime">;

export const questionSourceValidator = v.object({
  type: v.string(),
  title: v.string(),
  url: v.string(),
  location: v.optional(v.string()),
});

export const questionPayloadValidator = v.object({
  question: v.string(),
  answer: v.string(),
  searchable_text: v.optional(v.string()),
  summary: v.optional(v.string()),
  question_number: v.string(),
  section_number: v.string(),
  section_title: v.string(),
  category: v.string(),
  keywords: v.array(v.string()),
  has_sources: v.optional(v.boolean()),
  answer_length: v.optional(v.number()),
  sources: v.array(questionSourceValidator),
  question_lower: v.optional(v.string()),
  keywords_searchable: v.optional(v.string()),
  category_searchable: v.optional(v.string()),
  embedding: v.optional(v.union(v.array(v.float64()), v.null())),
  created_at: v.optional(v.string()),
  updated_at: v.optional(v.string()),
  sequence: v.optional(v.number()),
  is_common: v.optional(v.boolean()),
  tags: v.optional(v.array(v.string())),
});

const ensureNonEmpty = (
  value: string | undefined,
  field: string,
  options?: { collapse?: boolean },
) => {
  if (value === undefined) {
    throw new ConvexError(`${field} is required.`);
  }

  const cleaned = options?.collapse ? collapseWhitespace(value) : trimString(value);
  if (!cleaned) {
    throw new ConvexError(`${field} is required.`);
  }
  return cleaned;
};

const buildQuestionRecord = (input: QuestionInput): QuestionRecord => {
  const question = ensureNonEmpty(input.question, "question");
  const answer = ensureNonEmpty(input.answer, "answer");
  const questionNumber = ensureNonEmpty(input.question_number, "question_number");
  const sectionNumber = ensureNonEmpty(input.section_number, "section_number");
  const sectionTitle = ensureNonEmpty(input.section_title, "section_title");
  const category = ensureNonEmpty(input.category, "category");

  const keywords = (input.keywords ?? [])
    .map((keyword) => collapseWhitespace(keyword))
    .filter(Boolean);
  if (keywords.length === 0) {
    throw new ConvexError("keywords must include at least one value.");
  }

  const sources = (input.sources ?? []).map((source) => {
    const location = source.location ? trimString(source.location) : undefined;
    return {
      type: ensureNonEmpty(source.type, "sources.type"),
      title: ensureNonEmpty(source.title, "sources.title"),
      url: ensureNonEmpty(source.url, "sources.url"),
      ...(location ? { location } : {}),
    };
  });

  const createdAt = trimString(input.created_at ?? new Date().toISOString());
  const updatedAt = trimString(input.updated_at ?? createdAt);

  const searchableTextSource = input.searchable_text ?? `${question}\n\n${answer}`;
  const searchableText = trimString(searchableTextSource);
  if (!searchableText) {
    throw new ConvexError("searchable_text cannot be empty.");
  }

  const questionLower = input.question_lower
    ? collapseWhitespace(input.question_lower)
    : toSearchable(question);

  const defaultKeywordsSearchable = keywords.map((value) => toSearchable(value)).join(" ");
  const keywordsSearchable = input.keywords_searchable
    ? collapseWhitespace(input.keywords_searchable)
    : defaultKeywordsSearchable;

  const categorySearchable = input.category_searchable
    ? collapseWhitespace(input.category_searchable)
    : toSearchable(category);

  const tags = (input.tags ?? [])
    .map((tag) => trimString(tag))
    .filter(Boolean);

  const record: QuestionRecord = {
    question,
    answer,
    searchable_text: searchableText,
    question_number: questionNumber,
    section_number: sectionNumber,
    section_title: sectionTitle,
    category,
    keywords,
    has_sources: input.has_sources ?? sources.length > 0,
    answer_length: input.answer_length ?? answer.length,
    sources,
    question_lower: questionLower,
    keywords_searchable: keywordsSearchable || defaultKeywordsSearchable,
    category_searchable: categorySearchable,
    created_at: createdAt,
    updated_at: updatedAt,
    is_common: input.is_common ?? false,
  };

  if (input.summary) {
    const summary = trimString(input.summary);
    if (summary) {
      record.summary = summary;
    }
  }

  if (typeof input.sequence === "number") {
    record.sequence = input.sequence;
  }

  if (tags.length > 0) {
    record.tags = tags;
  }

  if (Array.isArray(input.embedding) && input.embedding.length > 0) {
    record.embedding = input.embedding;
  }

  return record;
};

export type PublicQuestion = Omit<
  Doc<"questions">,
  "embedding" | "_id" | "_creationTime" | "tags" | "is_common"
> & {
  id: Id<"questions">;
  tags: string[];
  is_common: boolean;
  isCommon: boolean;
};

const toPublicQuestion = (doc: Doc<"questions">): PublicQuestion => ({
  id: doc._id,
  question: doc.question,
  answer: doc.answer,
  searchable_text: doc.searchable_text,
  summary: doc.summary,
  question_number: doc.question_number,
  section_number: doc.section_number,
  section_title: doc.section_title,
  category: doc.category,
  keywords: doc.keywords,
  has_sources: doc.has_sources,
  answer_length: doc.answer_length,
  sources: doc.sources,
  question_lower: doc.question_lower,
  keywords_searchable: doc.keywords_searchable,
  category_searchable: doc.category_searchable,
  created_at: doc.created_at,
  updated_at: doc.updated_at,
  sequence: doc.sequence,
  is_common: doc.is_common ?? false,
  isCommon: doc.is_common ?? false,
  tags: doc.tags ?? [],
});

const questionQueryArgs = {
  search: v.optional(v.string()),
  category: v.optional(v.string()),
  section: v.optional(v.string()),
  limit: v.optional(v.number()),
  commonOnly: v.optional(v.boolean()),
};

const compareQuestions = (a: Doc<"questions">, b: Doc<"questions">) => {
  const seqA = typeof a.sequence === "number" ? a.sequence : Number.POSITIVE_INFINITY;
  const seqB = typeof b.sequence === "number" ? b.sequence : Number.POSITIVE_INFINITY;
  if (seqA !== seqB) {
    return seqA - seqB;
  }

  const numberA = a.question_number ?? "";
  const numberB = b.question_number ?? "";
  const numberComparison = numberA.localeCompare(numberB, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (numberComparison !== 0) {
    return numberComparison;
  }

  return a._creationTime - b._creationTime;
};

const getQuestionsQuery = query({
  args: questionQueryArgs,
  handler: async (ctx, args) => {
    const requestedLimit = args.limit ?? DEFAULT_LIMIT;
    if (requestedLimit <= 0) {
      throw new ConvexError("limit must be greater than 0.");
    }
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    const searchTerm = args.search?.trim();
    const category = args.category ? trimString(args.category) : undefined;
    const section = args.section ? trimString(args.section) : undefined;
    const commonOnly = args.commonOnly ?? false;

    let documents: Doc<"questions">[] = [];

    if (searchTerm) {
      const searchLimit = commonOnly ? Math.min(limit * 2, MAX_LIMIT) : limit;
      documents = await ctx.db
        .query("questions")
        .withSearchIndex("search_by_text", (q) => {
          let queryBuilder = q.search("searchable_text", searchTerm);
          if (category) {
            queryBuilder = queryBuilder.eq("category_searchable", toSearchable(category));
          }
          if (section) {
            queryBuilder = queryBuilder.eq("section_number", section);
          }
          return queryBuilder;
        })
        .take(searchLimit);

      if (documents.length === 0) {
        const keywordResults = await ctx.db
          .query("questions")
          .withSearchIndex("search_by_keywords", (q) => {
            let queryBuilder = q.search("keywords_searchable", toSearchable(searchTerm));
            if (category) {
              queryBuilder = queryBuilder.eq("category_searchable", toSearchable(category));
            }
            // Note: search_by_keywords index doesn't have section_number filter
            return queryBuilder;
          })
          .take(searchLimit);

        // Filter by section after fetching if needed
        documents = section 
          ? keywordResults.filter(doc => doc.section_number === section)
          : keywordResults;
      }
    } else if (section) {
      documents = await ctx.db
        .query("questions")
        .withIndex("by_section", (q) => q.eq("section_number", section))
        .collect();
    } else if (category) {
      documents = await ctx.db
        .query("questions")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    } else {
      documents = await ctx.db.query("questions").collect();
    }

    const filtered = documents.filter((doc) => (commonOnly ? doc.is_common ?? false : true));

    filtered.sort(compareQuestions);

    return filtered.slice(0, limit).map(toPublicQuestion);
  },
});

export const list = getQuestionsQuery;
export const getQuestions = getQuestionsQuery;

export const getPaginated = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
    section: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const section = args.section ? trimString(args.section) : undefined;
    const category = args.category ? trimString(args.category) : undefined;

    let query;
    if (section) {
      query = ctx.db
        .query("questions")
        .withIndex("by_section", (q) => q.eq("section_number", section));
    } else if (category) {
      query = ctx.db
        .query("questions")
        .withIndex("by_category", (q) => q.eq("category", category));
    } else {
      query = ctx.db.query("questions");
    }

    const result = await query.paginate(args.paginationOpts);

    // Sort by sequence if available
    const sortedPage = [...result.page].sort(compareQuestions);

    return {
      ...result,
      page: sortedPage.map(toPublicQuestion),
    };
  },
});

export const get = query({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    return doc ? toPublicQuestion(doc) : null;
  },
});

export const importQuestion = mutation({
  args: questionPayloadValidator,
  handler: async (ctx, args) => {
    const payload = buildQuestionRecord(args);
    const existing = await ctx.db
      .query("questions")
      .withIndex("by_question_number", (q) => q.eq("question_number", payload.question_number))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return { id: existing._id, updated: true };
    }

    const id = await ctx.db.insert("questions", payload);
    return { id, updated: false };
  },
});

export const replaceAll = mutation({
  args: {
    questions: v.array(questionPayloadValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("questions").collect();
    await Promise.all(existing.map((doc) => ctx.db.delete(doc._id)));

    let imported = 0;
    for (const question of args.questions) {
      const payload = buildQuestionRecord(question);
      await ctx.db.insert("questions", payload);
      imported += 1;
    }

    return { imported };
  },
});

export const listWithEmbeddings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 1000;
    const docs = await ctx.db.query("questions").take(limit);
    
    return docs.map(doc => ({
      id: doc._id,
      question: doc.question,
      answer: doc.answer,
      question_number: doc.question_number,
      section_number: doc.section_number,
      section_title: doc.section_title,
      category: doc.category,
      keywords: doc.keywords,
      sources: doc.sources,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      hasEmbedding: Array.isArray(doc.embedding) && doc.embedding.length > 0,
    }));
  },
});

export const getAllByLang = query({
  args: {
    lang: v.string(),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("questions")
      .filter((q) => q.lang === args.lang)
      .collect();

    // Group by section
    const sectionsMap = new Map<string, any>();

    docs.forEach((doc) => {
      const sectionId = `section_${doc.section_number}`;
      if (!sectionsMap.has(sectionId)) {
        sectionsMap.set(sectionId, {
          section_id: sectionId,
          section_number: doc.section_number,
          section_title: doc.section_title,
          questions: [],
          question_count: 0,
        });
      }
      const section = sectionsMap.get(sectionId);
      section.questions.push({
        id: doc._id,
        question: doc.question,
        answer: doc.answer,
        searchable_text: doc.searchable_text,
        metadata: {
          question_number: doc.question_number,
          section_number: doc.section_number,
          section_title: doc.section_title,
          category: doc.category,
          keywords: doc.keywords,
        },
        sources: doc.sources || [],
      });
      section.question_count++;
    });

    return {
      sections: Array.from(sectionsMap.values()).sort((a, b) => 
        parseInt(a.section_number) - parseInt(b.section_number)
      ),
    };
  },
});
