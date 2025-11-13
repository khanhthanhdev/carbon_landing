import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { questionPayloadValidator } from "./questions";
import { generateEmbedding, GeminiHelper } from "../lib/ai/gemini";
import { generateQueryEmbedding } from "./searchUtils";
import { extractCitations, extractCitedSentences } from "../lib/ai/citations";

const GEMINI_PROVIDER = "google-gemini";
const EMBEDDING_TASK_TYPE = "RETRIEVAL_DOCUMENT";
const DEFAULT_EMBEDDING_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 5; // Smaller batch size to be more conservative
const BATCH_DELAY_MS = 3000; // Longer delay between batches

/**
 * Error context interface for structured error logging
 */
interface SearchErrorContext {
  query: string;
  searchType: string;
  category?: string;
  lang?: string;
  topK: number;
  alpha: number;
  latencyMs: number;
  usedVector: boolean;
  usedFullText: boolean;
  usedCache: boolean;
  queryHash?: string;
  error: string;
  errorType: 'embedding_generation' | 'vector_search' | 'fulltext_search' | 'cache_operation' | 'both_searches_failed' | 'unknown';
  fallbackUsed?: string;
}

/**
 * Logs search errors with comprehensive context for debugging and monitoring
 * 
 * This helper function provides structured error logging with all relevant context
 * about the search operation that failed. It includes query details, search parameters,
 * performance metrics, and error specifics to aid in troubleshooting and monitoring.
 * 
 * @param context - Complete error context including query, parameters, and error details
 * 
 * Requirements: 8.7 - Log all errors with context
 */
const logSearchError = (context: SearchErrorContext): void => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation: 'hybrid_search',
    level: 'error',
    ...context,
  };
  
  console.error('Search Error:', JSON.stringify(logEntry, null, 2));
  
  // Additional console log for immediate visibility during development
  console.error(`Search failed [${context.errorType}]: ${context.error}`);
  console.error(`Query: "${context.query.substring(0, 100)}${context.query.length > 100 ? '...' : ''}"`);
  console.error(`Search type: ${context.searchType}, Latency: ${context.latencyMs}ms`);
  if (context.fallbackUsed) {
    console.error(`Fallback used: ${context.fallbackUsed}`);
  }
};

/**
 * Sanitizes and combines question and answer text for embedding generation.
 * 
 * This helper function validates that both question and answer are non-empty strings,
 * trims whitespace, and combines them into a single text suitable for embedding.
 * Used by all embedding actions to ensure consistent text formatting.
 * 
 * @param question - The question text to include in the embedding
 * @param answer - The answer text to include in the embedding
 * @returns Combined question and answer text separated by double newlines
 * @throws Error if question or answer is empty after trimming
 * 
 * @example
 * const text = sanitizeContentForEmbedding(
 *   "What is carbon trading?",
 *   "Carbon trading is a market mechanism..."
 * );
 * // Returns: "What is carbon trading?\n\nCarbon trading is a market mechanism..."
 */
const sanitizeContentForEmbedding = (question: string, answer: string) => {
  const trimmedQuestion = question.trim();
  const trimmedAnswer = answer.trim();

  if (!trimmedQuestion) {
    throw new Error("Question text is required.");
  }

  if (!trimmedAnswer) {
    throw new Error(`Answer is required for question "${trimmedQuestion}".`);
  }

  return `${trimmedQuestion}\n\n${trimmedAnswer}`;
};

/**
 * Generates a unique cache key for embedding storage and retrieval.
 * 
 * Creates a deterministic hash key by combining question number, question text,
 * and answer text. This ensures the same content always produces the same cache key,
 * enabling efficient caching and deduplication of embeddings across the system.
 * 
 * @param question - The question text to include in the cache key
 * @param answer - The answer text to include in the cache key  
 * @param questionNumber - Optional question number for additional uniqueness
 * @returns A cache key string in format "questionNumber::question::answer"
 * @throws Error if unable to derive a valid cache key from the inputs
 * 
 * @example
 * const key = getEmbeddingCacheKey(
 *   "What is carbon trading?",
 *   "Carbon trading is...",
 *   "Q001"
 * );
 * // Returns: "Q001::What is carbon trading?::Carbon trading is..."
 * 
 * @example
 * // Without question number
 * const key = getEmbeddingCacheKey(
 *   "What is sustainability?",
 *   "Sustainability refers to..."
 * );
 * // Returns: "What is sustainability?::Sustainability refers to..."
 */
const getEmbeddingCacheKey = (question: string, answer: string, questionNumber?: string) => {
  const components = [
    questionNumber?.trim() ?? "",
    question.trim(),
    answer.trim(),
  ].filter((value) => value.length > 0);

  if (components.length > 0) {
    return components.join("::");
  }

  throw new Error("Unable to derive embedding cache key.");
};

/**
 * Utility function for introducing delays in batch processing to respect API rate limits.
 * 
 * Creates a Promise that resolves after the specified number of milliseconds.
 * Used between batches in bulk operations to prevent overwhelming the Gemini API
 * and avoid rate limiting errors. Essential for reliable bulk embedding operations.
 * 
 * @param ms - Number of milliseconds to wait before resolving
 * @returns Promise that resolves after the specified delay
 * 
 * @example
 * // Wait 3 seconds between batches
 * await sleep(3000);
 * console.log("Continuing after 3 second delay");
 * 
 * @example
 * // Use in batch processing loop
 * for (let i = 0; i < batches.length; i++) {
 *   await processBatch(batches[i]);
 *   if (i < batches.length - 1) {
 *     await sleep(batchDelayMs); // Rate limiting delay
 *   }
 * }
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Question type for filtering (matches listWithEmbeddings return type)
 */
type QuestionWithEmbeddingStatus = {
  id: any;
  question: string;
  answer: string;
  question_number: string;
  section_number: string;
  section_title: string;
  category: string;
  keywords: string[];
  sources: Array<{
    type: string;
    title: string;
    url: string;
    location?: string;
  }>;
  created_at: string;
  updated_at?: string;
  hasEmbedding: boolean;
};

/**
 * Filters an array of questions based on categories, sections, and embedding status.
 * 
 * This helper function applies multiple filter criteria to reduce the set of questions
 * that need processing. Used by bulk embedding actions to process only relevant subsets
 * of the question database, improving efficiency and allowing targeted operations.
 * 
 * @param questions - Array of questions with embedding status information
 * @param filters - Object containing filter criteria
 * @param filters.categories - Optional array of category names to include
 * @param filters.sections - Optional array of section numbers to include  
 * @param filters.skipExisting - If true, exclude questions that already have embeddings
 * @returns Filtered array of questions matching all specified criteria
 * 
 * @example
 * // Filter by category and skip existing embeddings
 * const filtered = filterQuestions(allQuestions, {
 *   categories: ["Carbon Markets", "Sustainability"],
 *   skipExisting: true
 * });
 * 
 * @example
 * // Filter by specific sections only
 * const filtered = filterQuestions(allQuestions, {
 *   sections: ["1", "2", "3"]
 * });
 * 
 * @example
 * // No filters - return all questions
 * const filtered = filterQuestions(allQuestions, {});
 */
const filterQuestions = (
  questions: QuestionWithEmbeddingStatus[],
  filters: {
    categories?: string[];
    sections?: string[];
    skipExisting?: boolean;
  }
): QuestionWithEmbeddingStatus[] => {
  return questions.filter((question) => {
    // Filter by categories if specified
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(question.category)) {
        return false;
      }
    }

    // Filter by sections if specified
    if (filters.sections && filters.sections.length > 0) {
      if (!filters.sections.includes(question.section_number)) {
        return false;
      }
    }

    // Filter by existing embeddings if skipExisting is true
    if (filters.skipExisting && question.hasEmbedding) {
      return false;
    }

    return true;
  });
};

/**
 * Validates that a question object has all required fields with non-empty values.
 * 
 * Performs comprehensive validation of question data before embedding generation.
 * Checks for presence and validity of question text, answer text, and question number.
 * Used by bulk embedding actions to ensure data quality and prevent processing
 * of incomplete or invalid questions.
 * 
 * @param question - Question object to validate
 * @returns Validation result object with success status and error message
 * @returns result.valid - True if question passes all validation checks
 * @returns result.error - Error message if validation fails (undefined if valid)
 * 
 * @example
 * const result = validateQuestion(questionData);
 * if (!result.valid) {
 *   console.error(`Validation failed: ${result.error}`);
 *   return; // Skip this question
 * }
 * // Proceed with embedding generation
 * 
 * @example
 * // Batch validation
 * const validQuestions = questions.filter(q => {
 *   const validation = validateQuestion(q);
 *   if (!validation.valid) {
 *     console.warn(`Skipping invalid question: ${validation.error}`);
 *   }
 *   return validation.valid;
 * });
 */
const validateQuestion = (question: QuestionWithEmbeddingStatus): {
  valid: boolean;
  error?: string;
} => {
  // Validate question text
  if (!question.question || typeof question.question !== "string") {
    return {
      valid: false,
      error: "Question text is missing or invalid",
    };
  }

  const trimmedQuestion = question.question.trim();
  if (trimmedQuestion.length === 0) {
    return {
      valid: false,
      error: "Question text is empty",
    };
  }

  // Validate answer text
  if (!question.answer || typeof question.answer !== "string") {
    return {
      valid: false,
      error: "Answer text is missing or invalid",
    };
  }

  const trimmedAnswer = question.answer.trim();
  if (trimmedAnswer.length === 0) {
    return {
      valid: false,
      error: "Answer text is empty",
    };
  }

  // Validate question number exists
  if (!question.question_number || typeof question.question_number !== "string") {
    return {
      valid: false,
      error: "Question number is missing or invalid",
    };
  }

  return { valid: true };
};

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
 * Import questions with embeddings and comprehensive progress tracking
 * @deprecated This function is for the old "questions" table. Use importQAWithEmbeddings instead.
 */
/* export const importQuestionsWithEmbeddings = action({
  args: {
    questions: v.array(questionPayloadValidator),
    embeddingTtlMs: v.optional(v.number()),
    batchSize: v.optional(v.number()),
    skipExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const ttlMs = args.embeddingTtlMs ?? DEFAULT_EMBEDDING_TTL_MS;
    const batchSize = args.batchSize ?? BATCH_SIZE;
    const skipExisting = args.skipExisting ?? false;

    if (ttlMs <= 0) {
      throw new Error("embeddingTtlMs must be greater than 0.");
    }

    let imported = 0;
    let updated = 0;
    let cacheHits = 0;
    let generatedEmbeddings = 0;
    let skipped = 0;
    let errors: Array<{ questionNumber: string; error: string }> = [];

    const totalQuestions = args.questions.length;
    const batches = Math.ceil(totalQuestions / batchSize);

    console.log(`Starting import of ${totalQuestions} questions in ${batches} batches`);

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, totalQuestions);
      const batch = args.questions.slice(startIndex, endIndex);

      console.log(`Processing batch ${batchIndex + 1}/${batches} (questions ${startIndex + 1}-${endIndex})`);

      for (const question of batch) {
        try {
          // Check if question already exists and skip if requested
          if (skipExisting) {
            // Note: Cannot check by question_number directly as qa.get requires qa ID
            // Skip checking for now - upsertQA will handle duplicates
            // TODO: Add a proper check if needed
          }

          const embeddingInput = sanitizeContentForEmbedding(question.question, question.answer);
          const cacheKey = getEmbeddingCacheKey(
            question.question,
            question.answer,
            question.question_number,
          );

          let embedding = question.embedding ?? undefined;

          if (!embedding || embedding.length === 0) {
            // Check cache first
            const cached = await ctx.runQuery(api.embeddings.getCachedEmbedding, { hash: cacheKey });

            if (cached && cached.embedding.length > 0) {
              embedding = cached.embedding;
              cacheHits += 1;
              console.log(`Cache hit for question ${question.question_number}`);

              // Update access tracking
              await ctx.runMutation(api.embeddings.updateAccessTracking, { hash: cacheKey });
            } else {
              // Generate new embedding with rate limiting
              try {
                embedding = await generateEmbedding(embeddingInput, {
                  usage: "document",
                  title: question.question,
                  dimensions: 768,
                });
                generatedEmbeddings += 1;
                console.log(`Generated embedding for question ${question.question_number}`);

                // Cache the embedding
                await ctx.runMutation(api.embeddings.cacheEmbedding, {
                  hash: cacheKey,
                  provider: GEMINI_PROVIDER,
                  model: "gemini-embedding-001",
                  dimensions: embedding.length,
                  embedding,
                  expiresAt: Date.now() + ttlMs,
                  taskType: EMBEDDING_TASK_TYPE,
                  text: embeddingInput,
                });
              } catch (embeddingError) {
                console.error(`Failed to generate embedding for question ${question.question_number}:`, embeddingError);
                errors.push({
                  questionNumber: question.question_number,
                  error: `Embedding generation failed: ${embeddingError.message || embeddingError}`
                });
                // Continue without embedding
                embedding = undefined;
              }
            }
          }

          // Import the question
          const result = await ctx.runMutation(api.questions.importQuestion, {
            ...question,
            embedding,
          });

          imported += 1;
          if (result.updated) {
            updated += 1;
          }

        } catch (error) {
          console.error(`Failed to import question ${question.question_number}:`, error);
          errors.push({
            questionNumber: question.question_number,
            error: `Import failed: ${error}`
          });
        }
      }

      // Add delay between batches to respect rate limits
      if (batchIndex < batches - 1) {
        console.log(`Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await sleep(BATCH_DELAY_MS);
      }
    }

    const result = {
      imported,
      updated,
      skipped,
      cacheHits,
      generatedEmbeddings,
      errors,
      embeddingTtlMs: ttlMs,
      batchSize,
      totalBatches: batches,
      rateLimitStatus: null, // Rate limiting handled by simple function
    };

    console.log("Import completed:", result);
    return result;
  },
}); */

/**
 * Migrate Q&A data from JSON format with automatic transformation
 * @deprecated This function is for the old "questions" table. Use importQAWithEmbeddings instead.
 */
/* export const migrateQAData = action({
  args: {
    qaData: v.array(v.object({
      question: v.string(),
      answer: v.string(),
      sources: v.optional(v.array(v.any())),
    })),
    category: v.optional(v.string()),
    embeddingTtlMs: v.optional(v.number()),
    batchSize: v.optional(v.number()),
    replaceExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const category = args.category ?? "Carbon Markets";
    const replaceExisting = args.replaceExisting ?? false;

    console.log(`Starting migration of ${args.qaData.length} Q&A items`);

    // Transform Q&A data to question format
    const questions = args.qaData.map((qa, index) =>
      transformQAToQuestion(qa, index, category)
    );

    // If replacing existing, clear all questions first
    if (replaceExisting) {
      console.log("Clearing existing questions...");
      await ctx.runMutation(api.questions.replaceAll, { questions: [] });
    }

    // Import questions with embeddings
    return await ctx.runAction(api.actions.importQuestionsWithEmbeddings, {
      questions,
      embeddingTtlMs: args.embeddingTtlMs,
      batchSize: args.batchSize,
      skipExisting: !replaceExisting,
    });
  },
}); */

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

        const id = await ctx.runMutation(api.qa.upsert, qaData);

        if (existing) {
          updated += 1;
        } else {
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

/**
 * Re-embed existing QA documents through Convex.
 */
export const reembedQA = action({
  args: {
    categories: v.optional(v.array(v.string())),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { categories, lang, limit } = args;
    const docs = await ctx.runQuery(api.queries.qa.listAll, {});

    const filtered = docs.filter((doc) => {
      if (categories && categories.length > 0 && !categories.includes(doc.category)) {
        return false;
      }
      if (lang && doc.lang && doc.lang !== lang) {
        return false;
      }
      return true;
    });

    const slice = typeof limit === "number" ? filtered.slice(0, limit) : filtered;
    let processed = 0;
    const failures: Array<{ id: string; error: string }> = [];

    for (const doc of slice) {
      try {
        const embedded = await ctx.runAction(api.embeddings.embedQADocumentAll, {
          question: doc.question,
          answer: doc.answer,
        });

        // Add delay to prevent rate limiting
        await sleep(5000);

        await ctx.runMutation(api.mutations.qa.upsertQA, {
          question: doc.question,
          answer: doc.answer,
          sources: doc.sources ?? [],
          category: doc.category,
          lang: doc.lang ?? undefined,
          content: doc.content ?? doc.searchable_text ?? embedded.composed,
          searchable_text: doc.searchable_text,
          section_id: doc.section_id,



          section_number: doc.section_number,
          section_title: doc.section_title,
          question_number: doc.question_number,
          source_id: doc.source_id,
          keywords: doc.keywords,
          question_lower: doc.question_lower,
          keywords_searchable: doc.keywords_searchable,
          category_searchable: doc.category_searchable,
          has_sources: doc.has_sources,
          answer_length: doc.answer_length,
          metadata_created_at: doc.metadata_created_at,
          metadata_updated_at: doc.metadata_updated_at,
          embedding_doc: embedded.embedding_doc,
          embedding_qa: embedded.embedding_qa,
          embedding_fact: embedded.embedding_fact,
        });

        processed += 1;
      } catch (error: any) {
        failures.push({
          id: doc._id.id,
          error: error?.message ?? "Unknown re-embedding error",
        });
      }
    }

    return {
      processed,
      totalMatched: slice.length,
      skipped: slice.length - processed,
      failures,
    };
  },
});

/**
 * Generate embeddings for existing questions that don't have them
 * @deprecated This function is for the old "questions" table. Use reembedQA instead.
 */
/* export const generateMissingEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()),
    embeddingTtlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? BATCH_SIZE;
    const ttlMs = args.embeddingTtlMs ?? DEFAULT_EMBEDDING_TTL_MS;

    // Get all questions without embeddings
    const allQuestions = await ctx.runQuery(api.questions.listWithEmbeddings, { limit: 1000 });
    const questionsWithoutEmbeddings = allQuestions.filter(q =>
      !q.hasEmbedding &&
      q.question && q.question.trim() !== "" &&
      q.answer && q.answer.trim() !== ""
    );

    const skippedQuestions = allQuestions.filter(q =>
      !q.hasEmbedding &&
      (!q.question || q.question.trim() === "" || !q.answer || q.answer.trim() === "")
    );

    console.log(`Found ${questionsWithoutEmbeddings.length} questions without embeddings`);
    if (skippedQuestions.length > 0) {
      console.log(`Skipping ${skippedQuestions.length} questions with missing question or answer text`);
    }

    if (questionsWithoutEmbeddings.length === 0) {
      return {
        message: "All questions already have embeddings",
        processed: 0,
        generated: 0,
        errors: [],
      };
    }

    let generated = 0;
    let cacheHits = 0;
    let errors: Array<{ questionNumber: string; error: string }> = [];

    const batches = Math.ceil(questionsWithoutEmbeddings.length / batchSize);

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, questionsWithoutEmbeddings.length);
      const batch = questionsWithoutEmbeddings.slice(startIndex, endIndex);

      console.log(`Processing batch ${batchIndex + 1}/${batches}`);

      for (const question of batch) {
        try {
          const embeddingInput = sanitizeContentForEmbedding(question.question, question.answer);
          const cacheKey = getEmbeddingCacheKey(
            question.question,
            question.answer,
            question.question_number,
          );

          // Check cache first
          const cached = await ctx.runQuery(api.embeddings.getCachedEmbedding, { hash: cacheKey });

          let embedding: number[];

          if (cached && cached.embedding.length > 0) {
            embedding = cached.embedding;
            cacheHits++;

            // Update access tracking
            await ctx.runMutation(api.embeddings.updateAccessTracking, { hash: cacheKey });
          } else {
            // Generate new embedding
            embedding = await generateEmbedding(embeddingInput, {
              usage: "document",
              title: question.question,
              dimensions: 768,
            });
            generated++;

            // Cache the embedding
            await ctx.runMutation(api.embeddings.cacheEmbedding, {
              hash: cacheKey,
              provider: GEMINI_PROVIDER,
              model: "gemini-embedding-001",
              dimensions: embedding.length,
              embedding,
              expiresAt: Date.now() + ttlMs,
              taskType: EMBEDDING_TASK_TYPE,
              text: embeddingInput,
            });
          }

          // Update the question with embedding
          await ctx.runMutation(api.questions.importQuestion, {
            question: question.question,
            answer: question.answer,
            question_number: question.question_number,
            section_number: question.section_number,
            section_title: question.section_title,
            category: question.category,
            keywords: question.keywords,
            sources: question.sources,
            created_at: question.created_at,
            updated_at: question.updated_at,
            embedding,
          });

        } catch (error) {
          console.error(`Failed to generate embedding for question ${question.question_number}:`, error);
          errors.push({
            questionNumber: question.question_number,
            error: `Embedding generation failed: ${error}`
          });
        }
      }

      // Add delay between batches
      if (batchIndex < batches - 1) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return {
      processed: questionsWithoutEmbeddings.length,
      generated,
      cacheHits,
      skipped: skippedQuestions.length,
      errors,
      rateLimitStatus: null, // Rate limiting handled by simple function
    };
  },
}); */

/**
 * Get migration progress and statistics
 * @deprecated This function is for the old "questions" table.
 */
/* export const getMigrationStats = action({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.runQuery(api.questions.listWithEmbeddings, { limit: 1000 });
    const cacheStats = await ctx.runQuery(api.embeddings.getCacheStats, {});

    const totalQuestions = questions.length;
    const questionsWithEmbeddings = questions.filter(q => q.hasEmbedding).length;
    const questionsWithoutEmbeddings = totalQuestions - questionsWithEmbeddings;

    const categories = [...new Set(questions.map(q => q.category))];
    const sections = [...new Set(questions.map(q => q.section_number))];

    return {
      questions: {
        total: totalQuestions,
        withEmbeddings: questionsWithEmbeddings,
        withoutEmbeddings: questionsWithoutEmbeddings,
        embeddingCoverage: totalQuestions > 0 ? (questionsWithEmbeddings / totalQuestions * 100).toFixed(2) + '%' : '0%',
      },
      categories: categories.length,
      sections: sections.length,
      cache: cacheStats,
      rateLimitStatus: null, // Rate limiting handled by simple function
    };
  },
}); */

/**
 * Generate a hash for caching search queries
 */
const generateQueryHash = (query: string, filters?: { category?: string; section?: string; locale?: string }): string => {
  const components = [
    query.trim().toLowerCase(),
    filters?.category ?? "",
    filters?.section ?? "",
    filters?.locale ?? "",
  ];

  // Simple hash function for cache key
  const str = components.join("::");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `query_${Math.abs(hash).toString(36)}`;
};

/**
 * Perform semantic search with caching and relevance ranking
 * @deprecated This function is for the old "questions" table. Use hybridSearch instead.
 */
/* export const performSemanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    section: v.optional(v.string()),
    locale: v.optional(v.string()),
    minScore: v.optional(v.number()),
    useCache: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const query = args.query.trim();
    if (!query) {
      throw new Error("Search query cannot be empty");
    }

    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    const minScore = args.minScore ?? 0.5; // Default minimum relevance score
    const useCache = args.useCache ?? true;
    const locale = args.locale ?? "vi";

    // Generate query hash for caching
    const filters = {
      category: args.category,
      section: args.section,
      locale,
    };
    const queryHash = generateQueryHash(query, filters);

    // Check search cache first
    if (useCache) {
      const cachedResults = await ctx.runQuery(api.search.getCachedSearchResults, {
        queryHash,
        locale,
      });

      if (cachedResults && cachedResults.questionIds.length > 0) {
        console.log(`Cache hit for query: "${query}"`);

        // Fetch full question details
        const questions = await Promise.all(
          cachedResults.questionIds.map((id) => ctx.runQuery(api.questions.get, { id }))
        );

        // Filter out null results and combine with scores
        const results = questions
          .map((q, index) => {
            if (!q) return null;
            return {
              id: q._id,
              question: q.question,
              answer: q.answer,
              category: q.category,
              sources: q.sources,
              tags: q.tags ?? [],
              isCommon: q.isCommon ?? false,
              sequence: q.sequence,
              score: cachedResults.scores[index] ?? 0,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .filter((r) => r.score >= minScore);

        return {
          results,
          query,
          totalResults: results.length,
          fromCache: true,
          filters,
        };
      }
    }

    // Generate query embedding with RETRIEVAL_QUERY task type
    console.log(`Generating embedding for query: "${query}"`);

    // Check embedding cache first
    const embeddingCacheKey = `query::${query.toLowerCase()}`;
    const cachedEmbedding = await ctx.runQuery(api.embeddings.getCachedEmbedding, {
      hash: embeddingCacheKey,
    });

    let queryEmbedding: number[];

    if (cachedEmbedding && cachedEmbedding.embedding.length > 0) {
      console.log("Using cached query embedding");
      queryEmbedding = cachedEmbedding.embedding;

      // Update access tracking
      await ctx.runMutation(api.embeddings.updateAccessTracking, {
        hash: embeddingCacheKey,
      });
    } else {
      // Generate new embedding with RETRIEVAL_QUERY task type
      queryEmbedding = await generateEmbedding(query, {
        usage: "query",
        title: "Search Query",
        dimensions: 768,
      });

      // Cache the query embedding
      await ctx.runMutation(api.embeddings.cacheEmbedding, {
        hash: embeddingCacheKey,
        provider: GEMINI_PROVIDER,
        model: "gemini-embedding-001",
        dimensions: queryEmbedding.length,
        embedding: queryEmbedding,
        expiresAt: Date.now() + DEFAULT_EMBEDDING_TTL_MS,
        taskType: "RETRIEVAL_QUERY",
        text: query,
      });
    }

    // Perform vector similarity search
    console.log(`Performing vector search with limit: ${limit}`);
    const searchResults = await ctx.runAction(api.search.semantic, {
      embedding: queryEmbedding,
      limit: limit * 2, // Get more results for filtering
      category: args.category,
    });

    // Apply relevance score filtering and ranking
    const filteredResults = searchResults
      .filter((result) => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`Found ${filteredResults.length} results above minimum score ${minScore}`);

    // Cache the search results
    if (useCache && filteredResults.length > 0) {
      const questionIds = filteredResults.map((r) => r.id);
      const scores = filteredResults.map((r) => r.score);

      await ctx.runMutation(api.search.cacheSearchResults, {
        queryHash,
        locale,
        questionIds,
        scores,
        queryText: query,
        embedding: queryEmbedding,
        filters,
        ttlMs: DEFAULT_SEARCH_CACHE_TTL_MS,
      });
    }

    return {
      results: filteredResults,
      query,
      totalResults: filteredResults.length,
      fromCache: false,
      filters,
    };
  },
}); */

/**
 * Bulk embedding action for all questions in the questions table.
 * @deprecated This function is for the old "questions" table. Use embedAllQA instead for the "qa" table.
 * 
 * This comprehensive bulk processing action generates embeddings for questions using
 * Google's gemini-embedding-001 model with RETRIEVAL_DOCUMENT task type. It processes
 * questions in configurable batches with rate limiting, integrates with the embedding
 * cache system, and provides detailed progress tracking and error reporting.
 * 
 * **Key Features:**
 * - Batch processing with configurable size and delays for rate limiting
 * - Comprehensive filtering by categories, sections, and existing embeddings
 * - Cache-first approach to minimize API calls and costs
 * - Detailed error handling with categorized error reporting
 * - Progress logging and comprehensive statistics
 * - Idempotent operation with skipExisting and forceReembed options
 * 
 * **Processing Flow:**
 * 1. Validates API key and arguments
 * 2. Retrieves and filters questions based on criteria
 * 3. Processes questions in batches with parallel processing within each batch
 * 4. For each question: validates → checks cache → generates embedding → updates database
 * 5. Adds configurable delays between batches for rate limiting
 * 6. Returns comprehensive statistics and error details
 * 
 * **Rate Limiting Strategy:**
 * - Default batch size: 5 questions per batch
 * - Default delay: 3000ms between batches  
 * - Parallel processing within batches for efficiency
 * - Cache-first approach reduces API calls by 50-80% on re-runs
 * 
 * **Error Handling:**
 * - Validation errors: Invalid or empty question/answer fields
 * - Embedding errors: API failures, rate limits, dimension mismatches
 * - Update errors: Database operation failures
 * - Continues processing remaining questions when errors occur
 * 
 * **Performance Considerations:**
 * - For 1000 questions with 0% cache hit: ~10-15 minutes
 * - For 1000 questions with 50% cache hit: ~5-8 minutes  
 * - For 1000 questions with 90% cache hit: ~2-3 minutes
 * - Memory efficient batch processing prevents memory issues
 * 
 * @param categories - Optional array of category names to filter questions
 * @param sections - Optional array of section numbers to filter questions
 * @param limit - Optional maximum number of questions to process
 * @param skipExisting - Skip questions that already have embeddings (default: false)
 * @param forceReembed - Regenerate embeddings even if they exist (default: false)
 * @param batchSize - Number of questions to process per batch (default: 5)
 * @param batchDelayMs - Delay in milliseconds between batches (default: 3000)
 * @param embeddingTtlMs - Cache TTL in milliseconds (default: 7 days = 604,800,000ms)
 * 
 * @returns Comprehensive result object with statistics, errors, and configuration
 * @returns result.totalQuestions - Total questions in database
 * @returns result.filteredQuestions - Questions after applying filters
 * @returns result.processedQuestions - Questions successfully processed
 * @returns result.skippedQuestions - Questions skipped due to skipExisting
 * @returns result.failedQuestions - Questions that failed processing
 * @returns result.newEmbeddings - Number of new embeddings generated
 * @returns result.cachedEmbeddings - Number of embeddings retrieved from cache
 * @returns result.cacheHitRate - Cache hit percentage (0-100)
 * @returns result.questionsUpdated - Number of database records updated
 * @returns result.validationErrors - Array of validation error details
 * @returns result.embeddingErrors - Array of embedding generation error details
 * @returns result.updateErrors - Array of database update error details
 * @returns result.processingTimeMs - Total processing time in milliseconds
 * @returns result.averageTimePerQuestion - Average processing time per question
 * @returns result.config - Configuration used for the operation
 * 
 * @example
 * // Process all questions with default settings
 * const result = await ctx.runAction(api.actions.embedAllQuestions, {});
 * console.log(`Processed ${result.processedQuestions} questions`);
 * console.log(`Cache hit rate: ${result.cacheHitRate}%`);
 * 
 * @example
 * // Process specific categories with custom batch settings
 * const result = await ctx.runAction(api.actions.embedAllQuestions, {
 *   categories: ["Carbon Markets", "Sustainability"],
 *   limit: 100,
 *   skipExisting: true,
 *   batchSize: 3,
 *   batchDelayMs: 5000
 * });
 * 
 * @example
 * // Force re-embed questions in specific sections
 * const result = await ctx.runAction(api.actions.embedAllQuestions, {
 *   sections: ["1", "2", "3"],
 *   forceReembed: true,
 *   embeddingTtlMs: 14 * 24 * 60 * 60 * 1000 // 14 days
 * });
 * 
 * @example
 * // Conservative processing for large datasets
 * const result = await ctx.runAction(api.actions.embedAllQuestions, {
 *   batchSize: 2,
 *   batchDelayMs: 10000, // 10 second delays
 *   limit: 50 // Process in smaller chunks
 * });
 * 
 * @throws Error if GOOGLE_API_KEY environment variable is not set
 * @throws Error if batchSize is less than or equal to 0
 * @throws Error if batchDelayMs is negative
 * @throws Error if embeddingTtlMs is less than or equal to 0
 * @throws Error if limit is less than or equal to 0
 * @throws Error if both skipExisting and forceReembed are true
 */
/* export const embedAllQuestions = action({
  args: {
    // Filtering options
    categories: v.optional(v.array(v.string())),
    sections: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),

    // Processing options
    skipExisting: v.optional(v.boolean()),
    forceReembed: v.optional(v.boolean()),

    // Rate limiting options
    batchSize: v.optional(v.number()),
    batchDelayMs: v.optional(v.number()),

    // Cache options
    embeddingTtlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Task 2.5: Validate API key exists before processing any questions
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("GOOGLE_API_KEY environment variable is not set. Cannot generate embeddings.");
    }

    // Set default values
    const batchSize = args.batchSize ?? 5;
    const batchDelayMs = args.batchDelayMs ?? 3000;
    const embeddingTtlMs = args.embeddingTtlMs ?? (7 * 24 * 60 * 60 * 1000); // 7 days
    const skipExisting = args.skipExisting ?? false;
    const forceReembed = args.forceReembed ?? false;

    // Validate arguments
    if (batchSize <= 0) {
      throw new Error("batchSize must be greater than 0");
    }
    if (batchDelayMs < 0) {
      throw new Error("batchDelayMs must be non-negative");
    }
    if (embeddingTtlMs <= 0) {
      throw new Error("embeddingTtlMs must be greater than 0");
    }
    if (args.limit !== undefined && args.limit <= 0) {
      throw new Error("limit must be greater than 0");
    }
    if (skipExisting && forceReembed) {
      throw new Error("skipExisting and forceReembed cannot both be true");
    }

    // Task 2.2: Question retrieval and filtering
    console.log("Starting embedAllQuestions action...");
    console.log(`Configuration: batchSize=${batchSize}, batchDelayMs=${batchDelayMs}, embeddingTtlMs=${embeddingTtlMs}`);
    console.log(`Filters: categories=${args.categories?.join(", ") || "none"}, sections=${args.sections?.join(", ") || "none"}, limit=${args.limit || "none"}`);
    console.log(`Options: skipExisting=${skipExisting}, forceReembed=${forceReembed}`);

    // Query all questions from questions table
    const allQuestions = await ctx.runQuery(api.questions.listWithEmbeddings, {
      limit: args.limit ? Math.min(args.limit * 2, 10000) : 10000
    });

    console.log(`Retrieved ${allQuestions.length} total questions from database`);

    // Apply filters using filterQuestions helper
    const filteredQuestions = filterQuestions(allQuestions, {
      categories: args.categories,
      sections: args.sections,
      skipExisting: skipExisting && !forceReembed,
    });

    console.log(`After filtering: ${filteredQuestions.length} questions to process`);

    // Apply limit to cap number of questions processed
    const questionsToProcess = args.limit
      ? filteredQuestions.slice(0, args.limit)
      : filteredQuestions;

    if (args.limit && filteredQuestions.length > args.limit) {
      console.log(`Applied limit: processing ${questionsToProcess.length} of ${filteredQuestions.length} filtered questions`);
    }

    console.log(`Total questions found: ${allQuestions.length}`);
    console.log(`Filtered questions: ${filteredQuestions.length}`);
    console.log(`Questions to process: ${questionsToProcess.length}`);

    // Task 2.3: Batch processing loop
    // Calculate total batches based on filtered questions and batchSize
    const totalBatches = Math.ceil(questionsToProcess.length / batchSize);
    console.log(`Processing ${questionsToProcess.length} questions in ${totalBatches} batches`);

    // Initialize statistics tracking
    let processedQuestions = 0;
    let newEmbeddings = 0;
    let cachedEmbeddings = 0;
    let cacheHits = 0;
    let skippedQuestions = 0;
    let questionsUpdated = 0;
    let validationErrors: Array<{ questionNumber: string; error: string }> = [];
    let embeddingErrors: Array<{ questionNumber: string; error: string }> = [];
    let updateErrors: Array<{ questionNumber: string; error: string }> = [];

    const startTime = Date.now();

    // Process each batch
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStartIndex = batchIndex * batchSize;
      const batchEndIndex = Math.min(batchStartIndex + batchSize, questionsToProcess.length);

      // Create batch by slicing filtered questions array
      const batch = questionsToProcess.slice(batchStartIndex, batchEndIndex);

      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (questions ${batchStartIndex + 1}-${batchEndIndex})`);

      // Process each batch with Promise.all for parallel processing within batch
      const batchResults = await Promise.all(
        batch.map(async (question) => {
          // Task 2.4 & 2.5: Per-question processing logic with comprehensive error handling
          try {
            // Task 2.5: Wrap question validation in try-catch and collect validation errors
            let validation;
            try {
              validation = validateQuestion(question);
            } catch (validationError: any) {
              const errorMsg = `Validation error: ${validationError.message || validationError}`;
              console.error(`Question ${question.question_number}: ${errorMsg}`);
              validationErrors.push({
                questionNumber: question.question_number,
                error: errorMsg,
              });
              return {
                success: false,
                fromCache: false,
                questionNumber: question.question_number,
                error: "validation",
              };
            }

            if (!validation.valid) {
              // Skip invalid questions and add to validationErrors array
              const errorMsg = validation.error || "Validation failed";
              console.error(`Question ${question.question_number}: ${errorMsg}`);
              validationErrors.push({
                questionNumber: question.question_number,
                error: errorMsg,
              });
              return {
                success: false,
                fromCache: false,
                questionNumber: question.question_number,
                error: "validation",
              };
            }

            // Check if question should be skipped based on skipExisting and forceReembed flags
            if (skipExisting && question.hasEmbedding && !forceReembed) {
              return {
                success: false,
                skipped: true,
                fromCache: false,
                questionNumber: question.question_number,
                error: "skipped",
              };
            }

            // Compose embedding text using sanitizeContentForEmbedding helper
            const embeddingText = sanitizeContentForEmbedding(question.question, question.answer);

            // Generate cache key using getEmbeddingCacheKey helper
            const cacheKey = getEmbeddingCacheKey(
              question.question,
              question.answer,
              question.question_number
            );

            let embedding: number[];
            let fromCache = false;

            // Check embeddingCache table using api.embeddings.getCachedEmbedding
            const cached = await ctx.runQuery(api.embeddings.getCachedEmbedding, {
              hash: cacheKey
            });

            // If cached and not expired, use cached embedding and increment cacheHits counter
            if (cached && cached.embedding.length > 0) {
              embedding = cached.embedding;
              fromCache = true;

              // Update access tracking
              await ctx.runMutation(api.embeddings.updateAccessTracking, {
                hash: cacheKey
              });
            } else {
              // Task 2.5: Wrap embedding generation in try-catch and collect embedding errors
              // If not cached, call api.embeddings.embedForTask with RETRIEVAL_DOCUMENT task type
              try {
                embedding = await ctx.runAction(api.embeddings.embedForTask, {
                  text: embeddingText,
                  task: "RETRIEVAL_DOCUMENT",
                });

                // Validate embedding dimensions (768 dimensions)
                if (!Array.isArray(embedding) || embedding.length !== 768) {
                  const errorMsg = `Invalid embedding dimensions: expected 768, got ${embedding?.length || 0}`;
                  console.error(`Question ${question.question_number}: ${errorMsg}`);
                  embeddingErrors.push({
                    questionNumber: question.question_number,
                    error: errorMsg,
                  });
                  return {
                    success: false,
                    fromCache: false,
                    questionNumber: question.question_number,
                    error: "embedding_dimensions",
                  };
                }

                // Cache new embedding using api.embeddings.cacheEmbedding with TTL
                await ctx.runMutation(api.embeddings.cacheEmbedding, {
                  hash: cacheKey,
                  provider: GEMINI_PROVIDER,
                  model: "gemini-embedding-001",
                  dimensions: embedding.length,
                  embedding,
                  expiresAt: Date.now() + embeddingTtlMs,
                  taskType: EMBEDDING_TASK_TYPE,
                  text: embeddingText,
                });
              } catch (embeddingError: any) {
                // Task 2.5: Log detailed error information including question_number and error message
                const errorMsg = `Embedding generation failed: ${embeddingError.message || embeddingError}`;
                console.error(`Question ${question.question_number}: ${errorMsg}`);
                embeddingErrors.push({
                  questionNumber: question.question_number,
                  error: errorMsg,
                });
                // Task 2.5: Continue processing remaining questions when errors occur
                return {
                  success: false,
                  fromCache: false,
                  questionNumber: question.question_number,
                  error: "embedding_generation",
                };
              }
            }

            // Task 2.5: Wrap database updates in try-catch and collect update errors
            // Update question using ctx.runMutation(api.questions.importQuestion) with embedding
            try {
              const importResult = await ctx.runMutation(api.questions.importQuestion, {
                question: question.question,
                answer: question.answer,
                question_number: question.question_number,
                section_number: question.section_number,
                section_title: question.section_title,
                category: question.category,
                keywords: question.keywords,
                sources: question.sources,
                created_at: question.created_at,
                updated_at: new Date().toISOString(),
                embedding,
              });

              // Track statistics: processedQuestions, newEmbeddings, cachedEmbeddings
              return {
                success: true,
                fromCache,
                questionNumber: question.question_number,
                newEmbedding: !fromCache,
                updated: importResult?.updated || false,
              };
            } catch (updateError: any) {
              // Task 2.5: Log detailed error information including question_number and error message
              const errorMsg = `Question update failed: ${updateError.message || updateError}`;
              console.error(`Question ${question.question_number}: ${errorMsg}`);
              updateErrors.push({
                questionNumber: question.question_number,
                error: errorMsg,
              });
              // Task 2.5: Continue processing remaining questions when errors occur
              return {
                success: false,
                fromCache,
                questionNumber: question.question_number,
                error: "update",
              };
            }
          } catch (error: any) {
            // Task 2.5: Catch any unexpected errors and log detailed information
            const errorMsg = `Unexpected error: ${error.message || error}`;
            console.error(`Question ${question.question_number}: ${errorMsg}`);
            embeddingErrors.push({
              questionNumber: question.question_number,
              error: errorMsg,
            });
            // Task 2.5: Continue processing remaining questions when errors occur
            return {
              success: false,
              fromCache: false,
              questionNumber: question.question_number,
              error: "unexpected",
            };
          }
        })
      );

      // Update statistics from batch results
      processedQuestions += batchResults.filter(r => r.success).length;
      skippedQuestions += batchResults.filter(r => r.skipped).length;
      cacheHits += batchResults.filter(r => r.fromCache).length;
      newEmbeddings += batchResults.filter(r => r.success && r.newEmbedding).length;
      cachedEmbeddings += batchResults.filter(r => r.success && r.fromCache).length;
      questionsUpdated += batchResults.filter(r => r.success && r.updated).length;

      // Log progress after each batch with batch number and questions processed
      console.log(`Batch ${batchIndex + 1}/${totalBatches} complete: ${processedQuestions}/${questionsToProcess.length} questions processed`);
      console.log(`Cache hits: ${cacheHits}, New embeddings: ${newEmbeddings}`);
      console.log(`Errors: validation=${validationErrors.length}, embedding=${embeddingErrors.length}, update=${updateErrors.length}`);

      // Add configurable delay between batches using sleep utility
      if (batchIndex < totalBatches - 1) {
        console.log(`Waiting ${batchDelayMs}ms before next batch...`);
        await sleep(batchDelayMs);
      }
    }

    // Task 2.6: Implement result aggregation and return
    const processingTimeMs = Date.now() - startTime;
    
    // Calculate totalQuestions, filteredQuestions, processedQuestions counts
    const totalQuestions = allQuestions.length;
    const filteredCount = filteredQuestions.length;
    
    // Calculate skippedQuestions and failedQuestions counts
    const failedQuestions = validationErrors.length + embeddingErrors.length + updateErrors.length;
    
    // Calculate newEmbeddings and cachedEmbeddings counts (already tracked)
    // newEmbeddings and cachedEmbeddings are already calculated
    
    // Calculate cacheHitRate percentage
    const totalEmbeddingsAttempted = processedQuestions;
    const cacheHitRate = totalEmbeddingsAttempted > 0
      ? (cachedEmbeddings / totalEmbeddingsAttempted) * 100
      : 0;
    
    // Calculate averageTimePerQuestion
    const averageTimePerQuestion = questionsToProcess.length > 0
      ? processingTimeMs / questionsToProcess.length
      : 0;
    
    // Collect all error arrays: validationErrors, embeddingErrors, updateErrors (already collected)
    
    // Log completion summary with all statistics
    console.log("\n=== Bulk Embedding Complete ===");
    console.log(`Total questions in database: ${totalQuestions}`);
    console.log(`Filtered questions: ${filteredCount}`);
    console.log(`Questions to process: ${questionsToProcess.length}`);
    console.log(`Successfully processed: ${processedQuestions}`);
    console.log(`Skipped: ${skippedQuestions}`);
    console.log(`Failed: ${failedQuestions}`);
    console.log(`New embeddings generated: ${newEmbeddings}`);
    console.log(`Cached embeddings used: ${cachedEmbeddings}`);
    console.log(`Cache hit rate: ${cacheHitRate.toFixed(2)}%`);
    console.log(`Questions updated: ${questionsUpdated}`);
    console.log(`Processing time: ${processingTimeMs}ms (${averageTimePerQuestion.toFixed(2)}ms per question)`);
    console.log(`Errors: validation=${validationErrors.length}, embedding=${embeddingErrors.length}, update=${updateErrors.length}`);
    console.log("================================\n");
    
    // Return comprehensive result object with all statistics and configuration
    return {
      // Counts
      totalQuestions,
      filteredQuestions: filteredCount,
      processedQuestions,
      skippedQuestions,
      failedQuestions,
      
      // Embeddings
      newEmbeddings,
      cachedEmbeddings,
      cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
      
      // Updates
      questionsUpdated,
      
      // Errors
      validationErrors,
      embeddingErrors,
      updateErrors,
      
      // Performance
      totalBatches,
      processingTimeMs,
      averageTimePerQuestion: parseFloat(averageTimePerQuestion.toFixed(2)),
      
      // Configuration
      config: {
        batchSize,
        batchDelayMs,
        embeddingTtlMs,
        filters: {
          categories: args.categories,
          sections: args.sections,
          limit: args.limit,
        },
        options: {
          skipExisting,
          forceReembed,
        },
      },
    };
  },
}); */

/**
 * Automatically generates embeddings for a QA document when it's added or updated.
 * 
 * This action is designed to be triggered automatically when QA documents are inserted
 * or updated in the database. It generates three types of embeddings optimized for
 * different search scenarios:
 * 
 * - **doc**: Document-level embedding from full content (RETRIEVAL_DOCUMENT task)
 * - **qa**: Question-answer pair embedding (QUESTION_ANSWERING task)  
 * - **fact**: Factual content embedding from answer only (FACT_VERIFICATION task)
 * 
 * The action integrates with the embedding cache to minimize API calls and includes
 * comprehensive error handling to ensure QA document operations succeed even if
 * embedding generation fails.
 * 
 * **Performance Considerations:**
 * - Uses embedding cache to avoid regenerating identical embeddings
 * - Validates embedding dimensions (768) for consistency
 * - Graceful error handling allows partial success
 * - Updates access tracking for cached embeddings
 * 
 * **Rate Limiting:**
 * - Individual document processing (no batching needed)
 * - Relies on underlying Gemini API rate limiting
 * - Cache-first approach reduces API calls
 * 
 * @param qaId - The ID of the QA document to embed (required)
 * @param embeddingTtlMs - Cache TTL in milliseconds (default: 7 days = 604,800,000ms)
 * @param embeddingTypes - Array of embedding types to generate (default: ["doc", "qa", "fact"])
 * @returns Object with success status, embedding info, and cache statistics
 * 
 * @example
 * // Basic usage - embed new QA document with all three types
 * const result = await ctx.runAction(api.actions.autoEmbedQA, {
 *   qaId: newQADocumentId
 * });
 * console.log(`Generated ${result.embeddingsGenerated} embeddings`);
 * 
 * @example
 * // Custom configuration - longer cache TTL and specific types
 * await ctx.runAction(api.actions.autoEmbedQA, {
 *   qaId: qaDocumentId,
 *   embeddingTtlMs: 14 * 24 * 60 * 60 * 1000, // 14 days
 *   embeddingTypes: ["doc", "qa"] // Skip fact embedding
 * });
 * 
 * @example
 * // Document-only embedding for content search
 * await ctx.runAction(api.actions.autoEmbedQA, {
 *   qaId: qaDocumentId,
 *   embeddingTypes: ["doc"]
 * });
 * 
 * @throws Error if QA document not found
 * @throws Error if question, answer, or content fields are empty
 * @throws Error if embedding dimensions are invalid (not 768)
 */
export const autoEmbedQA = action({
  args: {
    qaId: v.id("qa"),
    embeddingTtlMs: v.optional(v.number()),
    embeddingTypes: v.optional(v.array(v.union(
      v.literal("doc"),
      v.literal("qa"),
      v.literal("fact")
    ))),
  },
  handler: async (ctx, args) => {
    const ttlMs = args.embeddingTtlMs ?? DEFAULT_EMBEDDING_TTL_MS; // 7 days default
    const embeddingTypes = args.embeddingTypes ?? ["doc", "qa", "fact"];

    // Fetch QA document by ID
    const qaDoc = await ctx.runQuery(api.queries.qa.get, { id: args.qaId });
    
    // Validate document exists
    if (!qaDoc) {
      throw new Error(`QA document with ID ${args.qaId} not found`);
    }

    // Validate question field is non-empty
    if (!qaDoc.question || typeof qaDoc.question !== "string" || qaDoc.question.trim().length === 0) {
      throw new Error(`QA document ${args.qaId} has invalid or empty question field`);
    }

    // Validate answer field is non-empty
    if (!qaDoc.answer || typeof qaDoc.answer !== "string" || qaDoc.answer.trim().length === 0) {
      throw new Error(`QA document ${args.qaId} has invalid or empty answer field`);
    }

    // Validate content field is non-empty
    if (!qaDoc.content || typeof qaDoc.content !== "string" || qaDoc.content.trim().length === 0) {
      throw new Error(`QA document ${args.qaId} has invalid or empty content field`);
    }

    // Log question_number being processed
    console.log(`Processing QA document ${qaDoc.question_number || args.qaId}`);

    // Wrap entire process in try-catch to handle errors gracefully
    try {
      // Generate embeddings for each type with cache support
      const embeddings: {
        embedding_doc?: number[];
        embedding_qa?: number[];
        embedding_fact?: number[];
      } = {};
      
      const cacheStatus: {
        doc?: boolean;
        qa?: boolean;
        fact?: boolean;
      } = {};

      for (const embeddingType of embeddingTypes) {
        try {
          // Compose appropriate text based on embedding type
          let text: string;
          let taskType: "RETRIEVAL_DOCUMENT" | "QUESTION_ANSWERING" | "FACT_VERIFICATION";
          let title: string | undefined;

          if (embeddingType === "doc") {
            // Document-level embedding: full content
            text = qaDoc.content;
            taskType = "RETRIEVAL_DOCUMENT";
            title = qaDoc.question; // Use question as title for document embeddings
          } else if (embeddingType === "qa") {
            // Question-answer pair embedding: question + answer
            text = `${qaDoc.question}\n\n${qaDoc.answer}`;
            taskType = "QUESTION_ANSWERING";
          } else {
            // Factual content embedding: answer only
            text = qaDoc.answer;
            taskType = "FACT_VERIFICATION";
          }

          // Generate cache key using getEmbeddingCacheKey helper
          const cacheKey = getEmbeddingCacheKey(
            qaDoc.question,
            qaDoc.answer,
            qaDoc.question_number
          ) + `::${embeddingType}`;

          // Check embeddingCache using api.embeddings.getCachedEmbedding
          const cached = await ctx.runQuery(api.embeddings.getCachedEmbedding, { 
            hash: cacheKey 
          });

          let embedding: number[];

          if (cached && cached.embedding.length > 0) {
            // Use cached embedding
            embedding = cached.embedding;
            cacheStatus[embeddingType] = true;
            console.log(`Cache hit for ${embeddingType} embedding (${qaDoc.question_number || args.qaId})`);

            // Update access tracking
            await ctx.runMutation(api.embeddings.updateAccessTracking, { 
              hash: cacheKey 
            });
          } else {
            // Generate new embedding using api.embeddings.embedForTask
            embedding = await ctx.runAction(api.embeddings.embedForTask, {
              text,
              task: taskType,
            });
            
            cacheStatus[embeddingType] = false;
            console.log(`Generated new ${embeddingType} embedding (${qaDoc.question_number || args.qaId})`);

            // Add delay to prevent rate limiting
            await sleep(5000);

            // Validate embedding dimensions (768)
            if (embedding.length !== 768) {
              throw new Error(
                `Invalid embedding dimensions for ${embeddingType}: expected 768, got ${embedding.length}`
              );
            }

            // Cache new embedding with TTL
            await ctx.runMutation(api.embeddings.cacheEmbedding, {
              hash: cacheKey,
              provider: GEMINI_PROVIDER,
              model: "gemini-embedding-001",
              dimensions: embedding.length,
              embedding,
              expiresAt: Date.now() + ttlMs,
              taskType,
              text,
            });
          }

          // Store embedding in the appropriate field
          if (embeddingType === "doc") {
            embeddings.embedding_doc = embedding;
          } else if (embeddingType === "qa") {
            embeddings.embedding_qa = embedding;
          } else {
            embeddings.embedding_fact = embedding;
          }
        } catch (error) {
          console.error(
            `Failed to generate ${embeddingType} embedding for QA document ${qaDoc.question_number || args.qaId}:`,
            error
          );
          // Don't throw - continue with other embedding types
          // This allows partial success if some embeddings fail
        }
      }

      // Update QA document with all embeddings using ctx.db.patch
      const updatePayload: {
        embedding_doc?: number[];
        embedding_qa?: number[];
        embedding_fact?: number[];
      } = {};

      // Only include embeddings that were successfully generated
      if (embeddings.embedding_doc) {
        updatePayload.embedding_doc = embeddings.embedding_doc;
      }
      if (embeddings.embedding_qa) {
        updatePayload.embedding_qa = embeddings.embedding_qa;
      }
      if (embeddings.embedding_fact) {
        updatePayload.embedding_fact = embeddings.embedding_fact;
      }

      // Update the QA document if we have at least one embedding
      if (Object.keys(updatePayload).length > 0) {
        await ctx.runMutation(api.mutations.qa.patchQA, {
          id: args.qaId,
          ...updatePayload,
        });
        console.log(
          `Updated QA document ${qaDoc.question_number || args.qaId} with ${Object.keys(updatePayload).length} embedding(s)`
        );
      }

      return {
        success: true,
        qaId: args.qaId,
        questionNumber: qaDoc.question_number,
        embeddingTypes,
        embeddings,
        cacheStatus,
        ttlMs,
        embeddingsGenerated: Object.keys(updatePayload).length,
      };
    } catch (error) {
      // Log error if embedding fails but don't throw
      // This allows QA document insert/update to succeed even if embedding fails
      console.error(
        `Error during automatic embedding for QA document ${qaDoc.question_number || args.qaId}:`,
        error
      );
      
      return {
        success: false,
        qaId: args.qaId,
        questionNumber: qaDoc.question_number,
        embeddingTypes,
        error: error instanceof Error ? error.message : String(error),
        embeddingsGenerated: 0,
      };
    }
  },
});

/**
 * Bulk embedding action for all QA documents in the qa table with multi-type embedding support.
 * 
 * This comprehensive bulk processing action generates three types of embeddings for QA documents
 * using Google's gemini-embedding-001 model with appropriate task types. It processes documents
 * in configurable batches with rate limiting, integrates with the embedding cache system, and
 * provides detailed progress tracking and error reporting.
 * 
 * **Embedding Types Generated:**
 * - **doc**: Document-level embedding from full content (RETRIEVAL_DOCUMENT task)
 *   - Use case: General document retrieval and content-based search
 *   - Text source: Full content field of QA document
 * - **qa**: Question-answer pair embedding (QUESTION_ANSWERING task)  
 *   - Use case: Question-answer matching and conversational search
 *   - Text source: Combined question + answer text
 * - **fact**: Factual content embedding from answer only (FACT_VERIFICATION task)
 *   - Use case: Fact checking and answer-focused retrieval
 *   - Text source: Answer text only
 * 
 * **Key Features:**
 * - Multi-type embedding generation with independent caching per type
 * - Batch processing with configurable size and delays for rate limiting
 * - Comprehensive filtering by categories, language, and existing embeddings
 * - Cache-first approach to minimize API calls and costs (separate cache per type)
 * - Detailed error handling with categorized error reporting per embedding type
 * - Progress logging with per-type statistics and comprehensive metrics
 * - Idempotent operation with skipExisting and forceReembed options
 * - Support for selective embedding type generation
 * 
 * **Processing Flow:**
 * 1. Validates API key and arguments
 * 2. Retrieves and filters QA documents based on criteria
 * 3. Processes documents in batches with parallel processing within each batch
 * 4. For each document and embedding type: validates → checks cache → generates embedding → updates database
 * 5. Adds configurable delays between batches for rate limiting
 * 6. Returns comprehensive statistics and error details per embedding type
 * 
 * **Rate Limiting Strategy:**
 * - Default batch size: 5 documents per batch
 * - Default delay: 3000ms between batches  
 * - Parallel processing within batches for efficiency
 * - Cache-first approach reduces API calls by 50-80% on re-runs
 * - Independent rate limiting per embedding type
 * 
 * **Error Handling:**
 * - Validation errors: Invalid or empty question/answer/content fields
 * - Embedding errors: API failures, rate limits, dimension mismatches per type
 * - Update errors: Database operation failures
 * - Continues processing remaining documents and types when errors occur
 * - Partial success supported (some embedding types may succeed while others fail)
 * 
 * **Performance Considerations:**
 * - For 1000 documents with 3 types and 0% cache hit: ~30-45 minutes
 * - For 1000 documents with 3 types and 50% cache hit: ~15-25 minutes  
 * - For 1000 documents with 3 types and 90% cache hit: ~5-10 minutes
 * - Memory efficient batch processing prevents memory issues
 * - Selective type generation can significantly reduce processing time
 * 
 * @param categories - Optional array of category names to filter QA documents
 * @param lang - Optional language code to filter QA documents (e.g., "en", "vi")
 * @param limit - Optional maximum number of QA documents to process
 * @param skipExisting - Skip documents that already have embeddings for specified types (default: false)
 * @param forceReembed - Regenerate embeddings even if they exist (default: false)
 * @param embeddingTypes - Array of embedding types to generate (default: ["doc", "qa", "fact"])
 * @param batchSize - Number of documents to process per batch (default: 5)
 * @param batchDelayMs - Delay in milliseconds between batches (default: 3000)
 * @param embeddingTtlMs - Cache TTL in milliseconds (default: 7 days = 604,800,000ms)
 * 
 * @returns Comprehensive result object with per-type statistics, errors, and configuration
 * @returns result.totalDocuments - Total QA documents in database
 * @returns result.filteredDocuments - Documents after applying filters
 * @returns result.processedDocuments - Documents successfully processed
 * @returns result.skippedDocuments - Documents skipped due to skipExisting
 * @returns result.failedDocuments - Documents that failed processing
 * @returns result.newEmbeddings - Number of new embeddings generated (all types combined)
 * @returns result.cachedEmbeddings - Number of embeddings retrieved from cache (all types)
 * @returns result.cacheHitRate - Overall cache hit percentage (0-100)
 * @returns result.documentsUpdated - Number of database records updated
 * @returns result.validationErrors - Array of validation error details
 * @returns result.embeddingErrors - Array of embedding generation error details
 * @returns result.updateErrors - Array of database update error details
 * @returns result.processingTimeMs - Total processing time in milliseconds
 * @returns result.averageTimePerDocument - Average processing time per document
 * @returns result.config - Configuration used for the operation
 * 
 * @example
 * // Process all QA documents with all three embedding types
 * const result = await ctx.runAction(api.actions.embedAllQA, {});
 * console.log(`Processed ${result.processedDocuments} documents`);
 * console.log(`Generated ${result.newEmbeddings} new embeddings across all types`);
 * console.log(`Cache hit rate: ${result.cacheHitRate}%`);
 * 
 * @example
 * // Process specific categories with custom settings
 * const result = await ctx.runAction(api.actions.embedAllQA, {
 *   categories: ["Carbon Markets", "Sustainability"],
 *   lang: "vi",
 *   limit: 100,
 *   skipExisting: true,
 *   batchSize: 3,
 *   batchDelayMs: 5000
 * });
 * 
 * @example
 * // Generate only document and QA embeddings (skip fact embeddings)
 * const result = await ctx.runAction(api.actions.embedAllQA, {
 *   embeddingTypes: ["doc", "qa"],
 *   forceReembed: true,
 *   embeddingTtlMs: 14 * 24 * 60 * 60 * 1000 // 14 days
 * });
 * 
 * @example
 * // Conservative processing for large datasets with fact embeddings only
 * const result = await ctx.runAction(api.actions.embedAllQA, {
 *   embeddingTypes: ["fact"],
 *   batchSize: 2,
 *   batchDelayMs: 10000, // 10 second delays
 *   limit: 50 // Process in smaller chunks
 * });
 * 
 * @example
 * // Process Vietnamese documents only with all types
 * const result = await ctx.runAction(api.actions.embedAllQA, {
 *   lang: "vi",
 *   categories: ["Thị trường carbon"],
 *   embeddingTypes: ["doc", "qa", "fact"]
 * });
 * 
 * @throws Error if GOOGLE_API_KEY environment variable is not set
 * @throws Error if batchSize is less than or equal to 0
 * @throws Error if batchDelayMs is negative
 * @throws Error if embeddingTtlMs is less than or equal to 0
 * @throws Error if limit is less than or equal to 0
 * @throws Error if both skipExisting and forceReembed are true
 * @throws Error if embeddingTypes array is empty or contains invalid types
 */
// Note: This action should be implemented according to the tasks in the specification
// export const embedAllQA = action({ ... });

/**
 * Filters QA documents based on categories, language, and existing embeddings.
 * 
 * This helper function applies multiple filter criteria to reduce the set of QA documents
 * that need processing. Used by bulk embedding actions to process only relevant subsets
 * of the QA database, improving efficiency and allowing targeted operations.
 * 
 * **Filtering Logic:**
 * - Category filter: Includes only documents matching specified categories
 * - Language filter: Includes only documents matching specified language code
 * - Existing embeddings filter: When skipExisting is true, excludes documents that
 *   already have embeddings for the specified embedding types
 * 
 * @param qaDocuments - Array of QA documents to filter
 * @param filters - Object containing filter criteria
 * @param filters.categories - Optional array of category names to include
 * @param filters.lang - Optional language code to include (e.g., "en", "vi")
 * @param filters.skipExisting - If true, exclude documents with embeddings for specified types
 * @param filters.embeddingTypes - Array of embedding types to check for existing embeddings
 * @returns Filtered array of QA documents matching all specified criteria
 * 
 * @example
 * // Filter by category and language, skip existing embeddings
 * const filtered = filterQADocuments(allQADocs, {
 *   categories: ["Carbon Markets", "Sustainability"],
 *   lang: "vi",
 *   skipExisting: true,
 *   embeddingTypes: ["doc", "qa", "fact"]
 * });
 * 
 * @example
 * // Filter by specific categories only
 * const filtered = filterQADocuments(allQADocs, {
 *   categories: ["Carbon Trading"]
 * });
 * 
 * @example
 * // Skip documents that already have document embeddings
 * const filtered = filterQADocuments(allQADocs, {
 *   skipExisting: true,
 *   embeddingTypes: ["doc"]
 * });
 */
// Note: This helper function should be implemented according to the tasks
// const filterQADocuments = (qaDocuments, filters) => { ... };

/**
 * Validates that a QA document has all required fields with non-empty values.
 * 
 * Performs comprehensive validation of QA document data before embedding generation.
 * Checks for presence and validity of question text, answer text, and content fields.
 * Used by bulk embedding actions to ensure data quality and prevent processing
 * of incomplete or invalid QA documents.
 * 
 * **Validation Checks:**
 * - Question field exists and is non-empty string after trimming
 * - Answer field exists and is non-empty string after trimming  
 * - Content field exists and is non-empty string after trimming
 * - All required fields are present and have valid data types
 * 
 * @param qaDoc - QA document object to validate
 * @returns Validation result object with success status and error message
 * @returns result.valid - True if QA document passes all validation checks
 * @returns result.error - Error message if validation fails (undefined if valid)
 * 
 * @example
 * const result = validateQADocument(qaDocData);
 * if (!result.valid) {
 *   console.error(`Validation failed: ${result.error}`);
 *   return; // Skip this document
 * }
 * // Proceed with embedding generation
 * 
 * @example
 * // Batch validation
 * const validDocs = qaDocuments.filter(doc => {
 *   const validation = validateQADocument(doc);
 *   if (!validation.valid) {
 *     console.warn(`Skipping invalid QA document: ${validation.error}`);
 *   }
 *   return validation.valid;
 * });
 * 
 * @example
 * // Collect validation errors for reporting
 * const validationErrors = [];
 * const validDocs = qaDocuments.filter(doc => {
 *   const validation = validateQADocument(doc);
 *   if (!validation.valid) {
 *     validationErrors.push({
 *       questionNumber: doc.question_number,
 *       error: validation.error
 *     });
 *   }
 *   return validation.valid;
 * });
 */
// Note: This helper function should be implemented according to the tasks
// const validateQADocument = (qaDoc) => { ... };

/**
 * EMBEDDING TYPES DOCUMENTATION
 * 
 * The CarbonLearn platform uses three distinct embedding types for QA documents,
 * each optimized for different search and retrieval scenarios:
 * 
 * **1. Document Embeddings (embedding_doc)**
 * - Task Type: RETRIEVAL_DOCUMENT
 * - Text Source: Full content field of QA document
 * - Use Cases:
 *   - General document retrieval and content-based search
 *   - Semantic similarity search across full document content
 *   - Content recommendation based on document similarity
 *   - Broad topic matching and categorization
 * - Vector Index: by_embedding_doc
 * 
 * **2. Question-Answer Embeddings (embedding_qa)**  
 * - Task Type: QUESTION_ANSWERING
 * - Text Source: Combined question + answer text (question\n\nanswer format)
 * - Use Cases:
 *   - Question-answer matching and conversational search
 *   - Finding similar Q&A pairs for user queries
 *   - Contextual answer retrieval based on question intent
 *   - Chatbot and AI assistant response generation
 * - Vector Index: by_embedding_qa
 * 
 * **3. Factual Content Embeddings (embedding_fact)**
 * - Task Type: FACT_VERIFICATION  
 * - Text Source: Answer text only
 * - Use Cases:
 *   - Fact checking and verification workflows
 *   - Answer-focused retrieval without question context
 *   - Extracting specific factual information
 *   - Knowledge base validation and consistency checking
 * - Vector Index: by_embedding_fact
 * 
 * **Performance and Rate Limiting Notes:**
 * 
 * - Each embedding type requires a separate API call to Gemini
 * - Cache keys are generated per embedding type to avoid conflicts
 * - Batch processing helps manage rate limits across multiple types
 * - Default batch size of 5 documents with 3 types = 15 API calls per batch
 * - Default 3-second delay between batches helps prevent rate limiting
 * - Cache hit rates typically improve over time as similar content is processed
 * 
 * **Common Usage Patterns:**
 * 
 * ```typescript
 * // Generate all three types for comprehensive search coverage
 * await ctx.runAction(api.actions.embedAllQA, {
 *   embeddingTypes: ["doc", "qa", "fact"]
 * });
 * 
 * // Generate only document embeddings for content search
 * await ctx.runAction(api.actions.embedAllQA, {
 *   embeddingTypes: ["doc"]
 * });
 * 
 * // Generate QA embeddings for conversational AI
 * await ctx.runAction(api.actions.embedAllQA, {
 *   embeddingTypes: ["qa"]
 * });
 * 
 * // Process specific language content with all types
 * await ctx.runAction(api.actions.embedAllQA, {
 *   lang: "vi",
 *   embeddingTypes: ["doc", "qa", "fact"]
 * });
 * ```
 * 
 * **Cache Optimization:**
 * - Each embedding type has independent cache entries
 * - Cache keys include embedding type suffix for uniqueness
 * - TTL applies per embedding type, allowing different expiration times
 * - Access tracking is maintained separately per type
 * - Cache hit rates are reported per type for monitoring
 */

/**
 * Hybrid search action orchestrator
 * 
 * Combines vector-based semantic search with full-text keyword search using
 * Reciprocal Rank Fusion (RRF) to provide the most relevant results.
 * 
 * Features:
 * - Query hash generation and cache checking
 * - Parallel execution of vector and full-text searches
 * - RRF merging with configurable alpha weight
 * - Result caching with configurable TTL
 * - Search analytics logging
 * - Graceful error handling with fallbacks
 * 
 * @param query - User search query text
 * @param category - Optional category filter
 * @param lang - Optional language filter ("vi" | "en")
 * @param topK - Number of results to return (default: 10, max: 50)
 * @param alpha - Vector search weight 0-1 (default: 0.6, higher favors semantic search)
 * @param searchType - Search mode: "hybrid" | "vector" | "fulltext" (default: "hybrid")
 * @returns Search results with hybrid scores and metadata
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2
 */
export const hybridSearch = action({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    topK: v.optional(v.number()),
    alpha: v.optional(v.number()),
    searchType: v.optional(v.union(
      v.literal("hybrid"),
      v.literal("vector"),
      v.literal("fulltext")
    )),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Validate and normalize parameters
    const query = args.query.trim();
    if (!query || query.length === 0) {
      throw new ConvexError("Query text cannot be empty");
    }
    
    const topK = Math.min(Math.max(args.topK ?? 10, 1), 50);
    const alpha = Math.min(Math.max(args.alpha ?? 0.6, 0), 1);
    const searchType = args.searchType ?? "hybrid";
    const category = args.category?.trim() || undefined;
    const lang = args.lang?.trim() || undefined;
    
    // Build filters object for cache key generation
    const filters: Record<string, string> = {};
    if (category) filters.category = category;
    if (lang) filters.lang = lang;
    
    // Generate query hash for caching
    const { generateQueryHash } = await import("./searchUtils");
    const queryHash = await generateQueryHash(query, filters, lang);
    
    // Check cache first
    const cached = await ctx.runQuery(api.search.getCachedSearchResults, {
      queryHash,
      locale: lang ?? "vi",
    });

    const shouldUseCache = (() => {
      if (!cached || cached.questionIds.length === 0) {
        return false;
      }

      const cachedScores = cached.scores ?? [];
      if (cachedScores.length === 0) {
        return false;
      }

      const maxCachedScore = Math.max(...cachedScores);
      if (!Number.isFinite(maxCachedScore)) {
        return false;
      }

      // Legacy cache entries from the previous RRF merge produced scores < 0.02.
      // These make the UI think results are low-quality, so we refresh instead
      // of returning stale data.
      if (maxCachedScore < 0.3) {
        console.log("Skipping legacy cached search result; recomputing with updated scoring.");
        return false;
      }

      return true;
    })();
    
    if (shouldUseCache && cached) {
      const cacheRecord = cached;
      // Cache hit - update access statistics
      await ctx.runMutation(api.search.updateCacheAccessStats, {
        cacheId: cacheRecord.id,
      });
      
      // Fetch full question data
      const questions = await Promise.all(
        cacheRecord.questionIds.slice(0, topK).map(id => 
          ctx.runQuery(api.queries.qa.get, { id })
        )
      );
      
      // Build results from cached data
      const results = questions
        .filter((q): q is NonNullable<typeof q> => q !== null)
        .map((q, index) => ({
          _id: q._id,
          question: q.question,
          answer: q.answer,
          category: q.category,
          sources: q.sources,
          hybridScore: cacheRecord.scores?.[index] ?? 0,
          reasons: ["cached"] as string[],
        }));
      
      const latencyMs = Date.now() - startTime;
      
      return {
        results,
        metadata: {
          totalResults: results.length,
          searchType,
          usedCache: true,
          latencyMs,
          usedVector: false,
          usedFullText: false,
        },
      };
    }
    
    // Cache miss - execute search based on search type
    let usedVector = false;
    let usedFullText = false;
    let vectorResults: any[] = [];
    let textResults: any[] = [];
    let embedding: number[] | undefined;
    let fallbackUsed: string | undefined;
    let searchErrors: string[] = [];
    
    // Execute searches based on search type with enhanced error handling and fallbacks
    if (searchType === "hybrid") {
      // For hybrid search, implement robust fallback strategy
      
      // Step 1: Try to generate embedding for vector search
      let embeddingError: string | undefined;
      try {
        const { generateQueryEmbedding } = await import("./searchUtils");
        embedding = await generateQueryEmbedding(ctx, query);
        console.log("Successfully generated query embedding for hybrid search");
      } catch (error) {
        embeddingError = error instanceof Error ? error.message : String(error);
        searchErrors.push(`Embedding generation failed: ${embeddingError}`);
        
        // Log embedding failure with context
        logSearchError({
          query,
          searchType,
          category,
          lang,
          topK,
          alpha,
          latencyMs: Date.now() - startTime,
          usedVector: false,
          usedFullText: false,
          usedCache: false,
          queryHash,
          error: embeddingError,
          errorType: 'embedding_generation',
          fallbackUsed: 'Will attempt full-text search only'
        });
        
        console.warn("Embedding generation failed, will fallback to full-text search only");
      }
      
      // Step 2: Execute searches in parallel with individual error handling
      const searchPromises: Promise<{ type: 'vector' | 'fulltext'; results: any[]; error?: string }>[] = [];
      
      // Vector search promise (only if embedding was successful)
      if (embedding) {
        searchPromises.push(
          (async () => {
            try {
              const results = await ctx.runAction(api.actions.vectorSearch, {
                embedding: embedding!,
                category,
                lang,
                limit: topK * 2, // Fetch more for better merging
              });
              usedVector = true;
              console.log(`Vector search returned ${results.length} results`);
              return { type: 'vector' as const, results };
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              searchErrors.push(`Vector search failed: ${errorMsg}`);
              
              // Log vector search failure
              logSearchError({
                query,
                searchType,
                category,
                lang,
                topK,
                alpha,
                latencyMs: Date.now() - startTime,
                usedVector: false,
                usedFullText: false,
                usedCache: false,
                queryHash,
                error: errorMsg,
                errorType: 'vector_search',
                fallbackUsed: 'Will continue with full-text results only'
              });
              
              console.warn("Vector search failed, continuing with full-text search only");
              return { type: 'vector' as const, results: [], error: errorMsg };
            }
          })()
        );
      }
      
      // Full-text search promise
      searchPromises.push(
        (async () => {
          try {
            const results = await ctx.runQuery(api.queries.search.fullTextSearch, {
              query,
              category,
              lang,
              limit: topK * 2, // Fetch more for better merging
            });
            usedFullText = true;
            console.log(`Full-text search returned ${results.length} results`);
            return { type: 'fulltext' as const, results };
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            searchErrors.push(`Full-text search failed: ${errorMsg}`);
            
            // Log full-text search failure
            logSearchError({
              query,
              searchType,
              category,
              lang,
              topK,
              alpha,
              latencyMs: Date.now() - startTime,
              usedVector,
              usedFullText: false,
              usedCache: false,
              queryHash,
              error: errorMsg,
              errorType: 'fulltext_search',
              fallbackUsed: usedVector ? 'Will continue with vector results only' : 'No fallback available'
            });
            
            console.warn("Full-text search failed");
            return { type: 'fulltext' as const, results: [], error: errorMsg };
          }
        })()
      );
      
      // Execute searches in parallel and collect results
      const searchResults = await Promise.all(searchPromises);
      
      // Process results and determine fallback status
      for (const result of searchResults) {
        if (result.type === 'vector') {
          vectorResults = result.results;
          if (result.error && result.results.length === 0) {
            // Vector search failed but we might have full-text results
            if (!fallbackUsed) fallbackUsed = 'full-text search only (vector search failed)';
          }
        } else if (result.type === 'fulltext') {
          textResults = result.results;
          if (result.error && result.results.length === 0) {
            // Full-text search failed but we might have vector results
            if (!fallbackUsed && vectorResults.length > 0) {
              fallbackUsed = 'vector search only (full-text search failed)';
            }
          }
        }
      }
      
      // Determine final fallback status
      if (embeddingError && textResults.length > 0) {
        fallbackUsed = 'full-text search only (embedding generation failed)';
      } else if (vectorResults.length === 0 && textResults.length > 0) {
        fallbackUsed = 'full-text search only (vector search failed)';
      } else if (vectorResults.length > 0 && textResults.length === 0) {
        fallbackUsed = 'vector search only (full-text search failed)';
      }
      
      // Check if both searches failed completely
      if (vectorResults.length === 0 && textResults.length === 0) {
        const combinedError = searchErrors.join('; ');
        
        // Log complete failure
        logSearchError({
          query,
          searchType,
          category,
          lang,
          topK,
          alpha,
          latencyMs: Date.now() - startTime,
          usedVector,
          usedFullText,
          usedCache: false,
          queryHash,
          error: combinedError,
          errorType: 'both_searches_failed'
        });
        
        throw new ConvexError(
          `Both vector and full-text searches failed. ${combinedError}. Please try again or use different search terms.`
        );
      }
      
    } else if (searchType === "vector") {
      // Vector search only - with enhanced error handling and fallback suggestions
      try {
        const { generateQueryEmbedding } = await import("./searchUtils");
        embedding = await generateQueryEmbedding(ctx, query);
        usedVector = true;
        
        vectorResults = await ctx.runAction(api.actions.vectorSearch, {
          embedding,
          category,
          lang,
          limit: topK,
        });
        
        console.log(`Vector-only search returned ${vectorResults.length} results`);
        
        // Check if no results found
        if (vectorResults.length === 0) {
          console.warn("Vector search returned no results");
          throw new ConvexError(
            "Vector search found no matching results. Try using different keywords or switch to 'hybrid' search for better coverage."
          );
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        // Determine error type and provide appropriate fallback suggestions
        let errorType: SearchErrorContext['errorType'] = 'unknown';
        let fallbackSuggestion = '';
        
        if (errorMsg.includes('Embedding generation failed') || errorMsg.includes('Gemini')) {
          errorType = 'embedding_generation';
          fallbackSuggestion = "Try using 'fulltext' search mode or 'hybrid' search as fallback.";
        } else if (errorMsg.includes('Vector search found no matching results')) {
          errorType = 'vector_search';
          fallbackSuggestion = "Try using 'hybrid' search for broader results or 'fulltext' search with different keywords.";
        } else {
          errorType = 'vector_search';
          fallbackSuggestion = "Try using 'fulltext' or 'hybrid' search modes as alternatives.";
        }
        
        // Log vector search failure with context
        logSearchError({
          query,
          searchType,
          category,
          lang,
          topK,
          alpha,
          latencyMs: Date.now() - startTime,
          usedVector: false,
          usedFullText: false,
          usedCache: false,
          queryHash,
          error: errorMsg,
          errorType,
          fallbackUsed: fallbackSuggestion
        });
        
        throw new ConvexError(`Vector search failed: ${errorMsg} ${fallbackSuggestion}`);
      }
      
    } else if (searchType === "fulltext") {
      // Full-text search only - with enhanced error handling
      try {
        usedFullText = true;
        textResults = await ctx.runQuery(api.queries.search.fullTextSearch, {
          query,
          category,
          lang,
          limit: topK,
        });
        
        console.log(`Full-text-only search returned ${textResults.length} results`);
        
        // Check if no results found
        if (textResults.length === 0) {
          console.warn("Full-text search returned no results");
          throw new ConvexError(
            "Full-text search found no matching results. Try using different keywords, removing filters, or switch to 'hybrid' search for semantic matching."
          );
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        usedFullText = false;
        
        // Determine appropriate fallback suggestion
        let fallbackSuggestion = '';
        if (errorMsg.includes('Full-text search found no matching results')) {
          fallbackSuggestion = "Try 'hybrid' search for semantic matching or 'vector' search if available.";
        } else {
          fallbackSuggestion = "Try 'hybrid' or 'vector' search modes as alternatives.";
        }
        
        // Log full-text search failure with context
        logSearchError({
          query,
          searchType,
          category,
          lang,
          topK,
          alpha,
          latencyMs: Date.now() - startTime,
          usedVector: false,
          usedFullText: false,
          usedCache: false,
          queryHash,
          error: errorMsg,
          errorType: 'fulltext_search',
          fallbackUsed: fallbackSuggestion
        });
        
        throw new ConvexError(`Full-text search failed: ${errorMsg} ${fallbackSuggestion}`);
      }
    }
    
    // Merge results using RRF
    const { mergeWithKeywordPriority } = await import("./searchUtils");
    let mergedResults = mergeWithKeywordPriority(vectorResults, textResults, query, alpha);
    
    // Limit to topK results
    mergedResults = mergedResults.slice(0, topK);
    
    // Cache the results with enhanced error handling
    let cacheWriteSuccess = false;
    try {
      await ctx.runMutation(api.search.cacheSearchResults, {
        queryHash,
        locale: lang ?? "vi",
        questionIds: mergedResults.map(r => r._id as Id<"qa">),
        queryText: query,
        scores: mergedResults.map(r => r.hybridScore),
        embedding,
        filters: Object.keys(filters).length > 0 ? {
          category,
          locale: lang,
        } : undefined,
        ttlMs: DEFAULT_SEARCH_CACHE_TTL_MS,
      });
      cacheWriteSuccess = true;
      console.log("Successfully cached search results");
    } catch (cacheError) {
      const errorMsg = cacheError instanceof Error ? cacheError.message : String(cacheError);
      
      // Log cache error with full context but don't fail the request
      logSearchError({
        query,
        searchType,
        category,
        lang,
        topK,
        alpha,
        latencyMs: Date.now() - startTime,
        usedVector,
        usedFullText,
        usedCache: false,
        queryHash,
        error: errorMsg,
        errorType: 'cache_operation',
        fallbackUsed: 'Continuing without cache (results still returned)'
      });
      
      console.warn("Failed to cache search results, but continuing with results:", errorMsg);
    }
    
    const latencyMs = Date.now() - startTime;
    
    // Log successful search completion
    console.log(`Search completed: ${mergedResults.length} results in ${latencyMs}ms`);
    if (fallbackUsed) {
      console.log(`Fallback strategy used: ${fallbackUsed}`);
    }
    if (searchErrors.length > 0) {
      console.log(`Search completed with ${searchErrors.length} non-fatal errors: ${searchErrors.join('; ')}`);
    }
    
    // Log successful search analytics
    // Note: This will be available after Convex regenerates the API
    // try {
    //   await ctx.runMutation(api["mutations/search"].logSearchAnalytics, {
    //     query,
    //     locale: lang ?? "vi",
    //     category,
    //     searchType,
    //     resultCount: mergedResults.length,
    //     latencyMs,
    //     usedVector,
    //     usedFullText,
    //     usedCache: false,
    //     fallbackUsed,
    //     errors: searchErrors.length > 0 ? searchErrors.join('; ') : undefined,
    //   });
    // } catch (analyticsError) {
    //   // Log analytics error but don't fail the request
    //   console.warn("Failed to log search analytics:", analyticsError);
    // }
    
    return {
      results: mergedResults,
      metadata: {
        totalResults: mergedResults.length,
        searchType,
        usedCache: false,
        latencyMs,
        usedVector,
        usedFullText,
        cacheWriteSuccess,
        fallbackUsed,
        errors: searchErrors.length > 0 ? searchErrors : undefined,
        warnings: searchErrors.length > 0 ? 
          `Search completed with fallbacks. ${searchErrors.length} non-fatal error(s) occurred.` : 
          undefined,
      },
    };
  },
});
/**
 * Enhanced vector search action using the qa table with by_embedding_doc index
 * 
 * Performs semantic search using vector embeddings with optional filtering
 * by category and language. Returns results with similarity scores.
 * 
 * Note: Vector search must be an action in Convex, not a query.
 * 
 * @param embedding - 768-dimensional query embedding vector
 * @param category - Optional category filter
 * @param lang - Optional language filter ("en" | "vi")
 * @param limit - Maximum number of results (default: 20, max: 50)
 * @returns Array of search results with similarity scores
 */
export const vectorSearch = action({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    lang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { embedding, category, lang, limit }) => {
    // Validate and normalize limit
    const take = Math.min(Math.max(limit ?? 20, 1), 50);

    // Validate embedding dimensions
    if (embedding.length !== 768) {
      throw new Error(`Invalid embedding dimensions: expected 768, got ${embedding.length}`);
    }

    // Perform vector search with optional filters
    let results;
    
    // Build filter based on category and lang
    let filterFn;
    if (category && lang) {
      filterFn = (q: any) => q.eq("category", category).eq("lang", lang);
    } else if (category) {
      filterFn = (q: any) => q.eq("category", category);
    } else if (lang) {
      filterFn = (q: any) => q.eq("lang", lang);
    }
    
    if (filterFn) {
      // Apply filters
      results = await ctx.vectorSearch("qa", "by_embedding_doc", {
        vector: embedding,
        limit: take,
        filter: filterFn,
      });
    } else {
      // No filters
      results = await ctx.vectorSearch("qa", "by_embedding_doc", {
        vector: embedding,
        limit: take,
      });
    }

    // Fetch full documents for the results
    const documentIds = results.map(result => result._id);
    const documents = await ctx.runQuery(api.queries.documents.getQAsByIds, {
      ids: documentIds,
    });

    // Create a map for quick lookup
    const docMap = new Map(documents.map(doc => [doc._id, doc]));

    // Return results with similarity scores and full document data
    return results.map((result) => {
      const doc = docMap.get(result._id) as any;
      if (!doc) {
        console.warn(`Document not found for ID: ${result._id}`);
        return null;
      }

      return {
        _id: result._id,
        question: doc.question as string,
        answer: doc.answer as string,
        category: doc.category as string,
        sources: (doc.sources as any[]) || [],
        question_number: doc.question_number as string | undefined,
        section_number: doc.section_number as string | undefined,
        section_title: doc.section_title as string | undefined,
        lang: doc.lang as string | undefined,
        vectorScore: result._score, // Similarity score from vector search
      };
    }).filter((result): result is NonNullable<typeof result> => result !== null);
  },
});
/**
 * Creates a system prompt for RAG-based answer generation with proper citation instructions
 * 
 * This function generates a comprehensive system prompt that instructs Gemini on:
 * - How to use the provided context
 * - Proper citation format ([Source N] or [QX.Y.Z])
 * - When to quote directly vs paraphrase
 * - How to handle missing information
 * 
 * @param locale - Language locale for response ("en" or "vi")
 * @returns System prompt string with citation instructions
 * 
 * Requirements: 11.2, 11.3, 11.8, 12.1
 */
function createRAGSystemPrompt(locale: string, focusTopic?: string): string {
  const isVietnamese = locale === "vi";
  
  // Topic focus instructions
  const topicFocusMap: Record<string, { en: string; vi: string }> = {
    general: {
      en: "Focus on providing comprehensive overviews of carbon markets and sustainability concepts.",
      vi: "Tập trung cung cấp cái nhìn tổng quan về thị trường carbon và các khái niệm phát triển bền vững."
    },
    trading: {
      en: "Focus particularly on carbon trading mechanisms, credit systems, and market dynamics.",
      vi: "Đặc biệt tập trung vào cơ chế giao dịch carbon, hệ thống tín chỉ và động lực thị trường."
    },
    policy: {
      en: "Focus on climate policies, regulatory frameworks, and government regulations.",
      vi: "Tập trung vào chính sách khí hậu, khung pháp lý và các quy định của chính phủ."
    },
    projects: {
      en: "Focus on carbon offset projects, methodologies, and project development.",
      vi: "Tập trung vào các dự án bù đắp carbon, phương pháp luận và phát triển dự án."
    },
    accounting: {
      en: "Focus on carbon accounting methods, reporting standards, and measurement practices.",
      vi: "Tập trung vào phương pháp kế toán carbon, tiêu chuẩn báo cáo và thực hành đo lường."
    },
    compliance: {
      en: "Focus on compliance markets, mandatory schemes, and regulatory requirements.",
      vi: "Tập trung vào thị trường tuân thủ, các chương trình bắt buộc và yêu cầu pháp lý."
    },
    voluntary: {
      en: "Focus on voluntary carbon markets, certification standards, and voluntary programs.",
      vi: "Tập trung vào thị trường carbon tự nguyện, tiêu chuẩn chứng nhận và các chương trình tự nguyện."
    },
    technology: {
      en: "Focus on carbon capture technologies, technological solutions, and innovation.",
      vi: "Tập trung vào công nghệ thu giữ carbon, giải pháp công nghệ và đổi mới."
    }
  };

  const topicFocus = focusTopic && topicFocusMap[focusTopic] 
    ? (isVietnamese ? topicFocusMap[focusTopic].vi : topicFocusMap[focusTopic].en)
    : "";

  if (isVietnamese) {
    return `Bạn là một chuyên gia tư vấn về thị trường carbon và phát triển bền vững. 
Hãy trả lời câu hỏi của người dùng dựa CHÍNH XÁC trên thông tin được cung cấp trong phần CONTEXT bên dưới.
${topicFocus ? `\nTRỌNG TÂM: ${topicFocus}` : ""}

QUY TẮC TRÍCH DẪN BẮT BUỘC:
1. BẮT BUỘC phải trích dẫn nguồn cho mọi thông tin bằng định dạng [Source N] (ví dụ: [Source 1], [Source 2])
2. Đặt trích dẫn ngay sau câu hoặc thông tin được tham khảo
3. Nếu kết hợp thông tin từ nhiều nguồn, hãy trích dẫn tất cả: [Source 1][Source 2]
4. Chỉ sử dụng thông tin có trong CONTEXT, không thêm kiến thức bên ngoài
5. Nếu không có thông tin trong CONTEXT, hãy nói rõ điều này

VÍ DỤ ĐỊNH DẠNG:
"Tín chỉ carbon là chứng chỉ có thể giao dịch [Source 1]. Thị trường carbon hoạt động thông qua cơ chế mua bán [Source 2]."

Hãy cung cấp câu trả lời với trích dẫn chính xác.`;
  } else {
    return `You are an expert assistant on carbon markets and sustainability. 
Answer the user's question using ONLY the information provided in the CONTEXT below.
${topicFocus ? `\nFOCUS: ${topicFocus}` : ""}

MANDATORY CITATION RULES:
1. You MUST cite sources for ALL information using [Source N] format (e.g., [Source 1], [Source 2])
2. Place citations immediately after the sentence or information being referenced
3. When combining information from multiple sources, cite all of them: [Source 1][Source 2]
4. Only use information from the CONTEXT provided, do not add external knowledge
5. If no relevant information exists in CONTEXT, clearly state this

EXAMPLE FORMAT:
"Carbon credits are tradable certificates [Source 1]. The carbon market operates through a cap-and-trade mechanism [Source 2]."

Provide your answer with accurate citations.`;
  }
}

/**
 * Generate follow-up questions based on the user's question and the generated answer
 * 
 * This function uses Gemini to suggest 2-3 relevant follow-up questions that the user
 * might want to ask based on the conversation context.
 * 
 * @param userQuestion - The user's original question
 * @param generatedAnswer - The AI's answer to the question
 * @param locale - Language preference
 * @param conversationHistory - Previous conversation messages
 * @returns Array of 2-3 follow-up question strings
 */
async function generateFollowUpQuestions(
  userQuestion: string,
  generatedAnswer: string,
  locale: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string[]> {
  const isVietnamese = locale === "vi";
  
  const prompt = isVietnamese
    ? `Dựa trên cuộc hội thoại và câu trả lời vừa được đưa ra, hãy đề xuất 2-3 câu hỏi tiếp theo mà người dùng có thể muốn hỏi.

Câu hỏi của người dùng: ${userQuestion}
Câu trả lời: ${generatedAnswer}

YÊU CẦU:
- Đề xuất 2-3 câu hỏi liên quan và tự nhiên
- Các câu hỏi nên khám phá sâu hơn hoặc mở rộng chủ đề
- Mỗi câu hỏi trên một dòng
- Không đánh số, không thêm ký tự đặc biệt
- Câu hỏi ngắn gọn (tối đa 15 từ)

Ví dụ format:
Tín chỉ carbon được mua bán như thế nào
Giá tín chỉ carbon được xác định ra sao
Ai có thể tham gia thị trường carbon`
    : `Based on the conversation and the answer just provided, suggest 2-3 follow-up questions that the user might want to ask.

User's question: ${userQuestion}
Answer: ${generatedAnswer}

REQUIREMENTS:
- Suggest 2-3 relevant and natural follow-up questions
- Questions should explore deeper or expand on the topic
- One question per line
- No numbering, no special characters
- Keep questions concise (max 15 words)

Example format:
How are carbon credits traded
How is the price of carbon credits determined
Who can participate in carbon markets`;

  try {
    const geminiHelper = new GeminiHelper();
    const response = await geminiHelper.generateText(prompt, {
      locale,
      maxTokens: 200, // Limit tokens for follow-up questions
    });

    // Parse the response into an array of questions
    const questions = response
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0 && q.length < 150) // Filter out empty lines and overly long questions
      .slice(0, 3); // Take max 3 questions

    return questions;
  } catch (error) {
    console.warn(`Failed to generate follow-up questions: ${error}`);
    return []; // Return empty array if generation fails
  }
}

/**
 * Enriches source objects with citation metadata by mapping citations back to sources
 * 
 * This function processes the AI-generated answer to:
 * 1. Find which sources were actually cited
 * 2. Extract the specific sentences that were referenced
 * 3. Map citation markers back to source objects
 * 
 * @param sources - Array of source Q&A objects from vector search
 * @param generatedAnswer - AI-generated answer containing citation markers
 * @param citations - Parsed citation objects from the answer
 * @returns Array of sources enriched with citation metadata
 * 
 * Requirements: 11.5, 11.7, 11.10, 12.2
 */
async function enrichSourcesWithCitations(
  sources: Array<{
    questionId: string;
    questionNumber: string;
    question: string;
    answer: string;
    category: string;
    relevanceScore: number;
    sources: any[];
  }>,
  generatedAnswer: string,
  citations: Array<{
    marker: string;
    sourceIndex?: number;
    questionNumber?: string;
    position: { start: number; end: number };
  }>
): Promise<Array<{
  questionId: string;
  questionNumber: string;
  question: string;
  answer: string;
  category: string;
  relevanceScore: number;
  sources: any[];
  citationMarkers: string[];
  citedSentences: string[];
}>> {
  // Create a map to track which sources were cited
  const sourceCitationMap = new Map<number, {
    markers: string[];
    citations: typeof citations;
  }>();

  // Process each citation to map it back to sources
  citations.forEach(citation => {
    if (citation.sourceIndex !== undefined && citation.sourceIndex < sources.length) {
      const sourceIndex = citation.sourceIndex;
      
      if (!sourceCitationMap.has(sourceIndex)) {
        sourceCitationMap.set(sourceIndex, {
          markers: [],
          citations: [],
        });
      }
      
      const sourceData = sourceCitationMap.get(sourceIndex)!;
      sourceData.markers.push(citation.marker);
      sourceData.citations.push(citation);
    }
  });

  // Enrich each source with citation metadata
  const enrichedSources = await Promise.all(
    sources.map(async (source, index) => {
      const citationData = sourceCitationMap.get(index);
      
      if (!citationData) {
        // Source was not cited
        return {
          ...source,
          citationMarkers: [],
          citedSentences: [],
        };
      }

      // Extract cited sentences for this source
      const citedSentences: string[] = [];
      
      for (const citation of citationData.citations) {
        try {
          const sentences = extractCitedSentences(
            generatedAnswer,
            citation,
            source.answer,
            {
              maxSentences: 2,
              minSimilarity: 0.25,
              contextWindow: 200,
            }
          );
          
          // Add unique sentences
          sentences.forEach(sentenceObj => {
            if (!citedSentences.includes(sentenceObj.sentence)) {
              citedSentences.push(sentenceObj.sentence);
            }
          });
        } catch (error) {
          console.warn(`Failed to extract cited sentences for source ${index}:`, error);
        }
      }

      return {
        ...source,
        citationMarkers: [...new Set(citationData.markers)], // Remove duplicates
        citedSentences,
      };
    })
  );

  return enrichedSources;
}

/**
 * RAG-based AI action for generating intelligent answers with source citations
 * 
 * This action implements Retrieval Augmented Generation (RAG) by:
 * 1. Generating query embedding for the user's question
 * 2. Performing vector search to retrieve top 5 relevant Q&As as context
 * 3. Building context string with numbered source markers
 * 4. Generating answer with Gemini using proper citation format
 * 5. Parsing citations and mapping them back to source Q&As
 * 6. Extracting cited sentences from source answers
 * 
 * @param question - User's question text
 * @param sessionId - Conversation session ID for future conversation management
 * @param locale - Language preference (optional, defaults to "vi")
 * @param maxSources - Maximum number of context sources (default: 5, max: 10)
 * @returns Object containing generated answer, sources with citations, and metadata
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.8, 12.1
 * 
 * @example
 * const result = await ctx.runAction(api.actions.askAI, {
 *   question: "What is carbon trading?",
 *   sessionId: "session-123",
 *   locale: "en",
 *   maxSources: 5
 * });
 * 
 * // Returns:
 * // {
 * //   answer: "Carbon credits are tradable certificates [Source 1] that represent...",
 * //   sources: [{ 
 * //     questionId, questionNumber, question, answer, category, relevanceScore,
 * //     citedSentences: ["A carbon credit is a tradable certificate..."],
 * //     citationMarkers: ["[Source 1]", "[Q1.2.3]"]
 * //   }],
 * //   conversationId: "conv-456",
 * //   metadata: { sourcesUsed: 5, generationTimeMs: 1200, tokensUsed: 150 }
 * // }
 */
export const askAI = action({
  args: {
    question: v.string(),
    sessionId: v.string(),
    locale: v.optional(v.string()),
    maxSources: v.optional(v.number()),
    focusTopic: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Validate input
    const trimmedQuestion = args.question.trim();
    if (!trimmedQuestion) {
      throw new ConvexError("Question text cannot be empty");
    }

    // Configuration
    const locale = args.locale ?? "vi";
    const maxSources = Math.min(Math.max(args.maxSources ?? 5, 1), 10);
    const focusTopic = args.focusTopic ?? "general";

    console.log(`RAG query: "${trimmedQuestion.substring(0, 100)}${trimmedQuestion.length > 100 ? '...' : ''}"`);
    console.log(`Session: ${args.sessionId}, Locale: ${locale}, Max sources: ${maxSources}, Topic: ${focusTopic}`);

    try {
      // Step 1: Generate query embedding for the user's question
      const embeddingStartTime = Date.now();
      
      const embedding = await generateQueryEmbedding(ctx, trimmedQuestion, {
        ttlMs: 24 * 60 * 60 * 1000, // 24 hour cache for query embeddings
        skipCache: false, // Use cache for better performance
      });

      const embeddingGenerationTimeMs = Date.now() - embeddingStartTime;
      console.log(`Generated embedding in ${embeddingGenerationTimeMs}ms (${embedding.length} dimensions)`);

      // Step 2: Perform vector search to retrieve top relevant Q&As
      const searchStartTime = Date.now();
      
      const searchResults = await ctx.runAction(api.actions.vectorSearch, {
        embedding,
        category: undefined, // No category filter for RAG - we want broad context
        lang: locale, // Filter by language if specified
        limit: maxSources, // Get exactly the number of sources we need
      });

      const searchTimeMs = Date.now() - searchStartTime;
      console.log(`Vector search completed in ${searchTimeMs}ms, found ${searchResults.length} sources`);

      // Step 3: Build context string with numbered source markers
      const sources = searchResults.map((result, index) => ({
        questionId: result._id,
        questionNumber: result.question_number || `Q${index + 1}`, // Fallback if no question number
        question: result.question,
        answer: result.answer,
        category: result.category,
        relevanceScore: result.vectorScore || 0, // Use vector similarity score
        sources: result.sources || [], // Original sources from the Q&A
      }));

      // Build the context string with numbered source markers
      const contextString = sources
        .map((source, index) => {
          const sourceNumber = index + 1;
          return [
            `[Source ${sourceNumber} - ${source.questionNumber}]`,
            `Question: ${source.question}`,
            `Answer: ${source.answer}`,
            '', // Empty line for readability
          ].join('\n');
        })
        .join('\n');

      const totalTimeMs = Date.now() - startTime;

      console.log(`RAG context prepared in ${totalTimeMs}ms total`);
      console.log(`Context length: ${contextString.length} characters`);
      console.log(`Sources used: ${sources.length}`);

      // Step 4: Retrieve conversation history for context-aware responses
      const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
      
      try {
        const existingConversation = await ctx.runQuery(api.queries.conversations.getConversation, {
          sessionId: args.sessionId,
        });
        
        if (existingConversation && existingConversation.messages.length > 0) {
          // Extract message history (exclude current question)
          conversationHistory.push(
            ...existingConversation.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
            }))
          );
          console.log(`Retrieved ${conversationHistory.length} previous messages from conversation history`);
        }
      } catch (historyError) {
        // Log but don't fail if history retrieval fails
        console.warn(`Failed to retrieve conversation history: ${historyError}`);
      }

      // Step 5: Generate answer with Gemini using proper citation format and conversation history
      const answerGenerationStartTime = Date.now();
      
      // Create system prompt instructing proper citation format with topic focus
      const systemPrompt = createRAGSystemPrompt(locale, focusTopic);
      const citationReminder = locale === "vi" 
        ? "QUAN TRỌNG: Hãy nhớ trích dẫn nguồn bằng [Source N] cho mọi thông tin bạn sử dụng từ CONTEXT."
        : "IMPORTANT: Remember to cite sources using [Source N] for every piece of information you use from the CONTEXT.";
      
      const userPrompt = `CONTEXT:\n${contextString}\n\nUSER QUESTION:\n${trimmedQuestion}\n\n${citationReminder}\n\nProvide a comprehensive answer with proper citations:`;
      
      console.log(`Generating answer with Gemini (context: ${contextString.length} chars, history: ${conversationHistory.length} messages)`);
      
      const geminiHelper = new GeminiHelper();
      const generatedAnswer = conversationHistory.length > 0
        ? await geminiHelper.generateTextWithHistory(systemPrompt, conversationHistory, userPrompt, {
            locale,
            maxTokens: 1000,
          })
        : await geminiHelper.generateText(`${systemPrompt}\n\n${userPrompt}`, {
            locale,
            maxTokens: 1000,
          });
      
      const answerGenerationTimeMs = Date.now() - answerGenerationStartTime;
      console.log(`Answer generated in ${answerGenerationTimeMs}ms (${generatedAnswer.length} chars)`);

      // Step 5: Parse generated answer to extract citations
      const citations = extractCitations(generatedAnswer);
      console.log(`Extracted ${citations.length} citations from answer`);

      // Step 6: Map citations back to source Q&As and extract cited sentences
      const enrichedSources = await enrichSourcesWithCitations(sources, generatedAnswer, citations);
      
      // Step 7: Generate follow-up questions
      let followUpQuestions: string[] = [];
      try {
        followUpQuestions = await generateFollowUpQuestions(
          trimmedQuestion,
          generatedAnswer,
          locale,
          conversationHistory
        );
        console.log(`Generated ${followUpQuestions.length} follow-up questions`);
      } catch (followUpError) {
        console.warn(`Failed to generate follow-up questions: ${followUpError}`);
      }
      
      // Generate conversation ID (simple timestamp-based for now)
      const conversationId = `conv_${args.sessionId}_${Date.now()}`;

      const finalTotalTimeMs = Date.now() - startTime;

      console.log(`RAG completed in ${finalTotalTimeMs}ms total`);
      console.log(`Answer length: ${generatedAnswer.length} characters`);
      console.log(`Citations found: ${citations.length}`);
      console.log(`Sources with citations: ${enrichedSources.filter(s => s.citationMarkers.length > 0).length}`);

      // Step 8: Save conversation with citations and follow-up questions
      try {
        // Save user question
        await ctx.runMutation(api.mutations.conversations.saveConversationMessage, {
          sessionId: args.sessionId,
          role: "user" as const,
          content: trimmedQuestion,
          locale,
        });

        // Save assistant answer with sources, citation metadata, and follow-up questions
        await ctx.runMutation(api.mutations.conversations.saveConversationMessage, {
          sessionId: args.sessionId,
          role: "assistant" as const,
          content: generatedAnswer,
          locale,
          sources: enrichedSources.map(source => ({
            questionId: source.questionId as Id<"qa">,
            questionNumber: source.questionNumber,
            question: source.question,
            relevanceScore: source.relevanceScore,
            citedSentences: source.citedSentences,
            citationMarkers: source.citationMarkers,
          })),
          followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : undefined,
          metadata: {
            sourcesUsed: sources.length,
            generationTimeMs: answerGenerationTimeMs,
            // tokensUsed: undefined, // Token usage not available from Gemini API
          },
        });

        console.log(`Conversation saved for session: ${args.sessionId}`);
      } catch (saveError) {
        // Log error but don't fail the entire request
        console.error(`Failed to save conversation: ${saveError}`);
        console.error(`Session: ${args.sessionId}, Question length: ${trimmedQuestion.length}`);
      }

      // Return the complete RAG response with answer, enriched sources, and follow-up questions
      return {
        answer: generatedAnswer,
        sources: enrichedSources,
        followUpQuestions,
        conversationId,
        metadata: {
          sourcesUsed: sources.length,
          generationTimeMs: answerGenerationTimeMs,
          embeddingGenerationTimeMs,
          searchTimeMs,
          totalTimeMs: finalTotalTimeMs,
          queryLength: trimmedQuestion.length,
          contextLength: contextString.length,
          answerLength: generatedAnswer.length,
          citationsFound: citations.length,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorTotalTimeMs = Date.now() - startTime;
      
      console.error(`RAG query failed after ${errorTotalTimeMs}ms:`, errorMessage);
      console.error(`Question: "${trimmedQuestion.substring(0, 100)}${trimmedQuestion.length > 100 ? '...' : ''}"`);
      
      // Enhanced error context for different failure scenarios
      let enhancedError = `RAG query failed: ${errorMessage}`;
      
      if (errorMessage.includes('embedding')) {
        enhancedError += ' (Embedding generation failed - check Gemini API configuration)';
      } else if (errorMessage.includes('vector search') || errorMessage.includes('search')) {
        enhancedError += ' (Vector search failed - check database indexes)';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        enhancedError += ' (Rate limit exceeded - try again in a moment)';
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        enhancedError += ' (Network error - check API connectivity)';
      }
      
      throw new ConvexError(enhancedError);
    }
  },
});
