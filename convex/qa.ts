import { query } from "./_generated/server";
import { v } from "convex/values";

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
      sections: Array.from(sectionsMap.values()).sort((a, b) => {
        const aNum = parseInt(a.section_number || "0");
        const bNum = parseInt(b.section_number || "0");
        return aNum - bNum;
      }),
    };
  },
});
