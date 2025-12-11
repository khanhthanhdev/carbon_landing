import { v } from "convex/values";

/**
 * Error context interface for structured error logging
 */
export interface SearchErrorContext {
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
 */
export const logSearchError = (context: SearchErrorContext): void => {
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
 */
export const sanitizeContentForEmbedding = (question: string, answer: string) => {
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
 */
export const getEmbeddingCacheKey = (question: string, answer: string, questionNumber?: string) => {
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
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Question type for filtering (matches listWithEmbeddings return type)
 */
export type QuestionWithEmbeddingStatus = {
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
 */
export const filterQuestions = (
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
 */
export const validateQuestion = (question: QuestionWithEmbeddingStatus): {
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
