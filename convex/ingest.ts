import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { sleep } from "./shared";

/**
 * Transform raw Q&A data to question format
 */
const transformQAToQuestion = (
    qa: { question: string; answer: string; sources?: any[] },
    index: number,
    category: string = "General"
) => {
    const questionNumber = `Q${(index + 1).toString().padStart(3, '0')}`;
    const sectionNumber = Math.floor(index / 10) + 1;

    // Extract keywords from question and answer
    const text = `${qa.question} ${qa.answer}`.toLowerCase();
    const keywords = [
        ...new Set([
            "carbon",
            "tín chỉ",
            "phát thải",
            "khí nhà kính",
            "thị trường",
            ...text.match(/\b\w{4,}\b/g)?.slice(0, 5) || []
        ])
    ];

    return {
        question: qa.question,
        answer: qa.answer,
        question_number: questionNumber,
        section_number: sectionNumber.toString(),
        section_title: `Section ${sectionNumber}`,
        category,
        keywords,
        sources: qa.sources || [],
        created_at: new Date().toISOString(),
    };
};

/**
 * Normalize QA import payload shared by actions and scripts.
 */
const normalizeImportItem = (item: {
    question: string;
    answer: string;
    category?: string | null;
    lang?: string | null;
    sources?: unknown;
    metadata?: Record<string, unknown> | null;
    search_fields?: Record<string, unknown> | null;
    searchable_text?: string | null;
    section_id?: string | null;
    section_number?: string | null;
    section_title?: string | null;
    question_number?: string | null;
    id?: string | null;
    keywords?: unknown;
}) => {
    const normalizeString = (value: unknown) => {
        if (typeof value !== "string") {
            return undefined;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };

    const question = normalizeString(item.question);
    const answer = normalizeString(item.answer);
    if (!question || !answer) {
        throw new Error("Each QA item must provide non-empty question and answer fields.");
    }

    const metadata = (item.metadata && typeof item.metadata === "object" ? item.metadata : {}) as Record<
        string,
        unknown
    >;
    const searchFields = (item.search_fields && typeof item.search_fields === "object"
        ? item.search_fields
        : {}) as Record<string, unknown>;

    const category =
        normalizeString(metadata.category ?? item.category) ??
        normalizeString(item.section_title ?? metadata.section_title) ??
        "general";
    const lang = normalizeString(item.lang ?? metadata.lang);
    const sectionId = normalizeString(item.section_id ?? metadata.section_id);
    const sectionNumber = normalizeString(item.section_number ?? metadata.section_number);
    const sectionTitle = normalizeString(item.section_title ?? metadata.section_title);
    const questionNumber = normalizeString(item.question_number ?? metadata.question_number);
    const sourceId =
        normalizeString(item.id) ??
        normalizeString((item as Record<string, unknown>).source_id) ??
        normalizeString(metadata.id);
    const searchableText = normalizeString(item.searchable_text);

    const collectKeywords = (value: unknown): string[] | undefined => {
        if (!Array.isArray(value)) {
            return undefined;
        }
        const entries = value
            .map((entry) => normalizeString(entry))
            .filter((entry): entry is string => typeof entry === "string");
        return entries.length > 0 ? entries : undefined;
    };

    const keywords =
        collectKeywords(metadata.keywords) ??
        collectKeywords(item.keywords);

    const sources =
        Array.isArray(item.sources)
            ? item.sources
                .map((source) => {
                    if (typeof source === "string") {
                        const note = normalizeString(source);
                        return note ? { note } : undefined;
                    }
                    if (source && typeof source === "object") {
                        const normalizedSource: Record<string, string> = {};
                        const type = normalizeString((source as Record<string, unknown>).type);
                        const title = normalizeString((source as Record<string, unknown>).title);
                        const url = normalizeString((source as Record<string, unknown>).url);
                        const location = normalizeString((source as Record<string, unknown>).location);
                        const note = normalizeString((source as Record<string, unknown>).note);
                        if (type) normalizedSource.type = type;
                        if (title) normalizedSource.title = title;
                        if (url) normalizedSource.url = url;
                        if (location) normalizedSource.location = location;
                        if (note) normalizedSource.note = note;
                        return Object.keys(normalizedSource).length > 0 ? normalizedSource : undefined;
                    }
                    return undefined;
                })
                .filter((value): value is Record<string, string> => value !== undefined)
            : undefined;

    const questionLower =
        normalizeString(searchFields.question_lower) ??
        question.toLowerCase();

    const keywordsSearchable =
        normalizeString(searchFields.keywords_searchable) ??
        (keywords ? keywords.join(" ").toLowerCase() : undefined);

    const categorySearchable =
        normalizeString(searchFields.category_searchable) ??
        (category ? category.toLowerCase() : undefined);

    const hasSources =
        typeof metadata.has_sources === "boolean"
            ? metadata.has_sources
            : (sources?.length ?? 0) > 0;

    const answerLength =
        typeof metadata.answer_length === "number"
            ? metadata.answer_length
            : answer.length;

    const metadataCreatedAt = normalizeString(metadata.created_at);
    const metadataUpdatedAt = normalizeString(metadata.updated_at);

    const content = searchableText ?? `${question}\n\n${answer}`;

    return {
        question,
        answer,
        category,
        lang,
        sources,
        content,
        searchable_text: searchableText,
        section_id: sectionId,
        section_number: sectionNumber,
        section_title: sectionTitle,
        question_number: questionNumber,
        source_id: sourceId,
        keywords,
        question_lower: questionLower,
        keywords_searchable: keywordsSearchable,
        category_searchable: categorySearchable,
        has_sources: hasSources,
        answer_length: answerLength,
        metadata_created_at: metadataCreatedAt,
        metadata_updated_at: metadataUpdatedAt,
    };
};

/**
 * Import QA entries by generating embeddings within Convex.
 * Useful when external scripts cannot reach the Convex deployment.
 */
export const importQAWithEmbeddings = action({
    args: {
        items: v.array(
            v.object({
                id: v.optional(v.string()),
                question: v.string(),
                answer: v.string(),
                searchable_text: v.optional(v.string()),
                category: v.optional(v.string()),
                lang: v.optional(v.string()),
                section_id: v.optional(v.string()),
                section_number: v.optional(v.string()),
                section_title: v.optional(v.string()),
                question_number: v.optional(v.string()),
                keywords: v.optional(v.array(v.string())),
                metadata: v.optional(
                    v.object({
                        question_number: v.optional(v.string()),
                        section_number: v.optional(v.string()),
                        section_title: v.optional(v.string()),
                        section_id: v.optional(v.string()),
                        category: v.optional(v.string()),
                        keywords: v.optional(v.array(v.string())),
                        has_sources: v.optional(v.boolean()),
                        answer_length: v.optional(v.number()),
                        created_at: v.optional(v.string()),
                        updated_at: v.optional(v.string()),
                        lang: v.optional(v.string()),
                    }),
                ),
                search_fields: v.optional(
                    v.object({
                        question_lower: v.optional(v.string()),
                        keywords_searchable: v.optional(v.string()),
                        category_searchable: v.optional(v.string()),
                    }),
                ),
                sources: v.optional(v.any()),
            }),
        ),
        skipExisting: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const skipExisting = args.skipExisting ?? false;
        let inserted = 0;
        let updated = 0;
        const failures: Array<{ question: string; error: string }> = [];

        // First, normalize all items and collect valid ones
        const validItems: Array<{
            rawItem: any;
            normalized: any;
        }> = [];

        for (const rawItem of args.items) {
            try {
                const normalized = normalizeImportItem(rawItem as any);
                validItems.push({ rawItem, normalized });
            } catch (error: any) {
                failures.push({
                    question: rawItem.question,
                    error: error?.message ?? "Invalid QA payload",
                });
            }
        }

        // If skipExisting is true, check which ones already exist
        let itemsToProcess = validItems;
        if (skipExisting) {
            const allQAs = await ctx.runQuery(api.queries.qa.listAll, {});
            itemsToProcess = validItems.filter(({ normalized }) => {
                const { question, category, question_number } = normalized;
                let existing = allQAs.find(
                    (qa) => qa.category === category && qa.question === question
                );
                if (!existing && question_number) {
                    existing = allQAs.find(
                        (qa) => qa.question_number === question_number
                    );
                }
                return !existing;
            });
        }

        // Prepare documents for batch embedding
        const documentsToEmbed = itemsToProcess.map(({ normalized }) => ({
            question: normalized.question,
            answer: normalized.answer,
        }));

        // Batch embed all documents at once
        let embeddings: Array<{
            embedding_doc: number[];
            embedding_qa: number[];
            embedding_fact: number[];
            composed: string;
            dim: number;
            model: string;
        }> = [];

        if (documentsToEmbed.length > 0) {
            try {
                embeddings = await ctx.runAction(api.embeddings.embedQADocumentsBatch, {
                    documents: documentsToEmbed,
                });
            } catch (error: any) {
                // If batch embedding fails, fall back to individual embedding
                console.warn("Batch embedding failed, falling back to individual embedding:", error.message);
                embeddings = [];
                for (const doc of documentsToEmbed) {
                    try {
                        const embedded = await ctx.runAction(api.embeddings.embedQADocumentAll, {
                            question: doc.question,
                            answer: doc.answer,
                        });
                        embeddings.push(embedded);
                        // Add delay to prevent rate limiting
                        await sleep(5000);
                    } catch (embedError: any) {
                        failures.push({
                            question: doc.question,
                            error: embedError?.message ?? "Embedding generation failed",
                        });
                    }
                }
            }
        }

        // Process each item with its embedding
        for (let i = 0; i < itemsToProcess.length; i++) {
            const { rawItem, normalized } = itemsToProcess[i];
            const embedded = embeddings[i];

            if (!embedded) {
                // Skip if embedding failed
                continue;
            }

            const {
                question,
                answer,
                category,
                lang,
                sources,
                content,
                searchable_text,
                section_id,
                section_number,
                section_title,
                question_number,
                source_id,
                keywords,
                question_lower,
                keywords_searchable,
                category_searchable,
                has_sources,
                answer_length,
                metadata_created_at,
                metadata_updated_at,
            } = normalized;

            try {
                // Check if QA already exists (again, in case of concurrent updates)
                const allQAs = await ctx.runQuery(api.queries.qa.listAll, {});
                let existing = allQAs.find(
                    (qa) => qa.category === category && qa.question === question
                );

                if (!existing && question_number) {
                    existing = allQAs.find(
                        (qa) => qa.question_number === question_number
                    );
                }

                const id = await ctx.runMutation(api.mutations.qa.upsertQA, {
                    question,
                    answer,
                    sources,
                    category,
                    lang,
                    content,
                    searchable_text,
                    section_id,
                    section_number,
                    section_title,
                    question_number,
                    source_id,
                    keywords,
                    question_lower,
                    keywords_searchable,
                    category_searchable,
                    has_sources,
                    answer_length,
                    metadata_created_at,
                    metadata_updated_at,
                    embedding_doc: embedded.embedding_doc,
                    embedding_qa: embedded.embedding_qa,
                    embedding_fact: embedded.embedding_fact,
                });

                if (existing) {
                    updated += 1;
                } else if (id) {
                    inserted += 1;
                }
            } catch (error: any) {
                failures.push({
                    question,
                    error: error?.message ?? "Unknown import error",
                });
            }
        }

        return {
            inserted,
            updated,
            failures,
        };
    },
});

/**
 * Import QA data without generating embeddings (for initial import)
 */
export const importQASimple = action({
    args: {
        items: v.array(
            v.object({
                id: v.optional(v.string()),
                question: v.string(),
                answer: v.string(),
                searchable_text: v.optional(v.string()),
                category: v.optional(v.string()),
                lang: v.optional(v.string()),
                section_id: v.optional(v.string()),
                section_number: v.optional(v.string()),
                section_title: v.optional(v.string()),
                question_number: v.optional(v.string()),
                keywords: v.optional(v.array(v.string())),
                metadata: v.optional(
                    v.object({
                        question_number: v.optional(v.string()),
                        section_number: v.optional(v.string()),
                        section_title: v.optional(v.string()),
                        section_id: v.optional(v.string()),
                        category: v.optional(v.string()),
                        keywords: v.optional(v.array(v.string())),
                        has_sources: v.optional(v.boolean()),
                        answer_length: v.optional(v.number()),
                        created_at: v.optional(v.string()),
                        updated_at: v.optional(v.string()),
                        lang: v.optional(v.string()),
                    }),
                ),
                search_fields: v.optional(
                    v.object({
                        question_lower: v.optional(v.string()),
                        keywords_searchable: v.optional(v.string()),
                        category_searchable: v.optional(v.string()),
                    }),
                ),
                sources: v.optional(v.any()),
            }),
        ),
        skipExisting: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        let inserted = 0;
        let updated = 0;
        const failures: Array<{ question: string; error: string }> = [];

        for (const item of args.items) {
            try {
                const normalized = normalizeImportItem(item);

                // Check if exists
                let existing = null;
                if (normalized.question_number) {
                    existing = await ctx.runQuery(api.queries.qa.getByQuestionNumber, {
                        questionNumber: normalized.question_number,
                    });
                }

                if (existing && args.skipExisting) {
                    continue;
                }

                // Prepare data for qa table
                const qaData = {
                    question: normalized.question,
                    answer: normalized.answer,
                    content: normalized.searchable_text || `${normalized.question}\n\n${normalized.answer}`,
                    searchable_text: normalized.searchable_text,
                    section_id: normalized.section_id,
                    section_number: normalized.section_number,
                    section_title: normalized.section_title,
                    question_number: normalized.question_number,
                    source_id: normalized.source_id,
                    category: normalized.category || "General",
                    keywords: normalized.keywords,
                    question_lower: normalized.question_lower,
                    keywords_searchable: normalized.keywords_searchable,
                    category_searchable: normalized.category_searchable,
                    lang: normalized.lang,
                    has_sources: normalized.has_sources,
                    answer_length: normalized.answer_length,
                    metadata_created_at: normalized.metadata_created_at,
                    metadata_updated_at: normalized.metadata_updated_at,
                    sources: normalized.sources,
                    embedding_doc: [], // Empty for now
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                const id = await ctx.runMutation(api.mutations.qa.upsertQA, qaData);

                if (existing) {
                    updated += 1;
                } else if (id) {
                    inserted += 1;
                }
            } catch (error: any) {
                failures.push({
                    question: item.question,
                    error: error?.message ?? "Unknown import error",
                });
            }
        }

        return {
            inserted,
            updated,
            failures,
        };
    },
});
