import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper to compare questions by section_number then question_number
const compareQuestions = (a: any, b: any) => {
  const sectionA = parseInt(a.section_number || "0", 10);
  const sectionB = parseInt(b.section_number || "0", 10);
  if (sectionA !== sectionB) return sectionA - sectionB;
  
  const qNumA = parseInt(a.question_number || "0", 10);
  const qNumB = parseInt(b.question_number || "0", 10);
  return qNumA - qNumB;
};

// Helper to transform a qa document to public format
const toPublicQuestion = (doc: any) => ({
  id: doc._id,
  question: doc.question,
  answer: doc.content || doc.answer, // Use content (rich HTML) if available, fallback to answer
  searchable_text: doc.searchable_text,
  question_number: doc.question_number,
  section_number: doc.section_number,
  section_title: doc.section_title,
  category: doc.category,
  keywords: doc.keywords,
  sources: doc.sources || [],
  metadata: {
    question_number: doc.question_number,
    section_number: doc.section_number,
    section_title: doc.section_title,
    category: doc.category,
    keywords: doc.keywords,
  },
});

// Get paginated questions for a specific section and language
export const getPaginated = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
    lang: v.optional(v.string()),
    section: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lang = args.lang?.trim() || undefined;
    const section = args.section?.trim() || undefined;

    let dbQuery;
    
    // Use the combined section+lang index when both are provided
    if (section && lang) {
      dbQuery = ctx.db
        .query("qa")
        .withIndex("by_section_lang", (q) => 
          q.eq("section_number", section).eq("lang", lang)
        );
    } else if (section) {
      dbQuery = ctx.db
        .query("qa")
        .withIndex("by_section_number", (q) => q.eq("section_number", section));
    } else if (lang) {
      dbQuery = ctx.db
        .query("qa")
        .withIndex("by_lang", (q) => q.eq("lang", lang));
    } else {
      dbQuery = ctx.db.query("qa");
    }

    const result = await dbQuery.paginate(args.paginationOpts);

    // Sort by question_number within the section
    const sortedPage = [...result.page].sort(compareQuestions);

    return {
      ...result,
      page: sortedPage.map(toPublicQuestion),
    };
  },
});

// Get list of available sections with their question counts
export const getSections = query({
  args: {
    lang: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lang = args.lang?.trim() || undefined;

    let docs;
    if (lang) {
      docs = await ctx.db
        .query("qa")
        .withIndex("by_lang", (q) => q.eq("lang", lang))
        .collect();
    } else {
      docs = await ctx.db.query("qa").collect();
    }

    // Group by section to get section info
    const sectionsMap = new Map<string, {
      section_number: string;
      section_title: string;
      question_count: number;
    }>();

    docs.forEach((doc) => {
      const sectionNumber = doc.section_number || "0";
      if (!sectionsMap.has(sectionNumber)) {
        sectionsMap.set(sectionNumber, {
          section_number: sectionNumber,
          section_title: doc.section_title || `Section ${sectionNumber}`,
          question_count: 0,
        });
      }
      const section = sectionsMap.get(sectionNumber)!;
      section.question_count++;
    });

    return Array.from(sectionsMap.values()).sort(
      (a, b) => parseInt(a.section_number, 10) - parseInt(b.section_number, 10)
    );
  },
});

export const list = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
    commonOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.search?.trim();
    const category = args.category?.trim();
    const limit = args.limit || 50;
    const commonOnly = args.commonOnly || false;

    let queryBuilder = ctx.db.query("qa");

    // Apply filters
    if (category && category !== "All") {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("category"), category));
    }

    if (commonOnly) {
      // Assuming is_common field exists, otherwise filter by some other criteria
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("is_common"), true));
    }

    if (searchTerm) {
      // Use search index for text search
      queryBuilder = ctx.db.query("qa").withSearchIndex("by_text", (q) => {
        let searchQuery = q.search("content", searchTerm);
        if (category && category !== "All") {
          searchQuery = searchQuery.eq("category", category);
        }
        return searchQuery;
      });
    }

    // Apply limit and collect results
    const results = await queryBuilder.take(limit);

    // Transform to match expected format
    return results.map((doc) => ({
      id: doc._id,
      question: doc.question,
      answer: doc.content || doc.answer,
      searchable_text: doc.searchable_text,
      question_number: doc.question_number,
      section_number: doc.section_number,
      section_title: doc.section_title,
      category: doc.category,
      keywords: doc.keywords,
      sources: doc.sources || [],
      metadata: {
        question_number: doc.question_number,
        section_number: doc.section_number,
        section_title: doc.section_title,
        category: doc.category,
        keywords: doc.keywords,
      },
    }));
  },
});

export const listWithEmbeddings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 1000;
    return ctx.db.query("qa").take(limit);
  },
});

export const get = query({
  args: { id: v.id("qa") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    return doc ? toPublicQuestion(doc) : null;
  },
});

export const getAllByLang = query({
  args: {
    lang: v.string(),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("qa")
      .filter((q) => q.eq(q.field("lang"), args.lang))
      .collect();

    // Group by section
    const sectionsMap = new Map<string, any>();

    docs.forEach((doc) => {
      const sectionId = doc.section_id || `section_${doc.section_number}`;
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
        answer: doc.content || doc.answer, // Use content (rich HTML) if available, fallback to answer
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
      sections: Array.from(sectionsMap.values()).sort((a, b) => {
        const aNum = parseInt(a.section_number || "0");
        const bNum = parseInt(b.section_number || "0");
        return aNum - bNum;
      }),
    };
  },
});
