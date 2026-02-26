import { ConvexError, v } from "convex/values";
import {
  type Citation,
  extractCitations,
  extractCitedSentences,
} from "../lib/ai";
import { GeminiHelper } from "../lib/ai/gemini";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { generateQueryEmbedding } from "./searchUtils";

/**
 * Creates a system prompt for RAG-based answer generation with proper citation instructions
 */
function createRAGSystemPrompt(locale: string, focusTopic?: string): string {
  const isVietnamese = locale === "vi";

  // Topic focus instructions
  const topicFocusMap: Record<string, { en: string; vi: string }> = {
    general: {
      en: "Focus on providing comprehensive overviews of carbon markets and sustainability concepts.",
      vi: "Tập trung cung cấp cái nhìn tổng quan về thị trường carbon và các khái niệm phát triển bền vững.",
    },
    trading: {
      en: "Focus particularly on carbon trading mechanisms, credit systems, and market dynamics.",
      vi: "Đặc biệt tập trung vào cơ chế giao dịch carbon, hệ thống tín chỉ và động lực thị trường.",
    },
    policy: {
      en: "Focus on climate policies, regulatory frameworks, and government regulations.",
      vi: "Tập trung vào chính sách khí hậu, khung pháp lý và các quy định của chính phủ.",
    },
    projects: {
      en: "Focus on carbon offset projects, methodologies, and project development.",
      vi: "Tập trung vào các dự án bù đắp carbon, phương pháp luận và phát triển dự án.",
    },
    accounting: {
      en: "Focus on carbon accounting methods, reporting standards, and measurement practices.",
      vi: "Tập trung vào phương pháp kế toán carbon, tiêu chuẩn báo cáo và thực hành đo lường.",
    },
    compliance: {
      en: "Focus on compliance markets, mandatory schemes, and regulatory requirements.",
      vi: "Tập trung vào thị trường bắt buộc, các chương trình bắt buộc và yêu cầu pháp lý.",
    },
    voluntary: {
      en: "Focus on voluntary carbon markets, certification standards, and voluntary programs.",
      vi: "Tập trung vào thị trường carbon tự nguyện, tiêu chuẩn chứng nhận và các chương trình tự nguyện.",
    },
    technology: {
      en: "Focus on carbon capture technologies, technological solutions, and innovation.",
      vi: "Tập trung vào công nghệ thu giữ carbon, giải pháp công nghệ và đổi mới.",
    },
  };

  const topicFocus =
    focusTopic && topicFocusMap[focusTopic]
      ? isVietnamese
        ? topicFocusMap[focusTopic].vi
        : topicFocusMap[focusTopic].en
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
  }
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

/**
 * Generate follow-up questions based on the user's question and the generated answer
 */
async function generateFollowUpQuestions(
  userQuestion: string,
  generatedAnswer: string,
  locale: string,
  _conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
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
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0 && q.length < 150) // Filter out empty lines and overly long questions
      .slice(0, 3); // Take max 3 questions

    return questions;
  } catch (error) {
    return []; // Return empty array if generation fails
  }
}

/**
 * Enriches source objects with citation metadata by mapping citations back to sources
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
  citations: Citation[]
): Promise<
  Array<{
    questionId: string;
    questionNumber: string;
    question: string;
    answer: string;
    category: string;
    relevanceScore: number;
    sources: any[];
    citationMarkers: string[];
    citedSentences: string[];
  }>
> {
  // Create a map to track which sources were cited
  const sourceCitationMap = new Map<
    number,
    {
      markers: string[];
      citations: Citation[];
    }
  >();

  // Process each citation to map it back to sources
  citations.forEach((citation) => {
    if (
      citation.sourceIndex !== undefined &&
      citation.sourceIndex < sources.length
    ) {
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
          sentences.forEach((sentenceObj) => {
            if (!citedSentences.includes(sentenceObj.sentence)) {
              citedSentences.push(sentenceObj.sentence);
            }
          });
        } catch (error) {
          // Error extracting cited sentences - continue with empty list
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

    try {
      // Step 1: Generate query embedding for the user's question
      const embeddingStartTime = Date.now();

      const embedding = await generateQueryEmbedding(ctx, trimmedQuestion, {
        ttlMs: 24 * 60 * 60 * 1000, // 24 hour cache for query embeddings
        skipCache: false, // Use cache for better performance
      });

      const embeddingGenerationTimeMs = Date.now() - embeddingStartTime;

      // Step 2: Perform vector search to retrieve top relevant Q&As
      const searchStartTime = Date.now();

      let searchResults = await ctx.runAction(api.search.vectorSearch, {
        embedding,
        category: undefined, // No category filter for RAG - we want broad context
        lang: locale, // Filter by language if specified
        limit: maxSources, // Get exactly the number of sources we need
      });

      // Fallback: if no results found with language filter, retry without it
      // and prefer documents matching the requested locale
      if (searchResults.length === 0) {
        const allResults = await ctx.runAction(api.search.vectorSearch, {
          embedding,
          category: undefined,
          lang: undefined,
          limit: maxSources * 3,
        });

        // Prefer results whose content matches the requested locale
        const vietnamesePattern =
          /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
        const isViRequest = locale === "vi";

        const matchingLang = allResults.filter((r) => {
          if (r.lang === locale) {
            return true;
          }
          if (isViRequest) {
            const text = `${r.question} ${r.answer}`;
            return vietnamesePattern.test(text);
          }
          return false;
        });

        searchResults =
          matchingLang.length > 0
            ? matchingLang.slice(0, maxSources)
            : allResults.slice(0, maxSources);
      }

      const searchTimeMs = Date.now() - searchStartTime;

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
            "", // Empty line for readability
          ].join("\n");
        })
        .join("\n");

      const totalTimeMs = Date.now() - startTime;

      // Step 4: Retrieve conversation history for context-aware responses
      const conversationHistory: Array<{
        role: "user" | "assistant";
        content: string;
      }> = [];

      try {
        const existingConversation = await ctx.runQuery(
          api.queries.conversations.getConversation,
          {
            sessionId: args.sessionId,
          }
        );

        if (existingConversation && existingConversation.messages.length > 0) {
          // Extract message history (exclude current question)
          conversationHistory.push(
            ...existingConversation.messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            }))
          );
        }
      } catch (historyError) {
        // Log but don't fail if history retrieval fails
      }

      // Step 5: Generate answer with Gemini using proper citation format and conversation history
      const answerGenerationStartTime = Date.now();

      // Create system prompt instructing proper citation format with topic focus
      const systemPrompt = createRAGSystemPrompt(locale, focusTopic);
      const citationReminder =
        locale === "vi"
          ? "QUAN TRỌNG: Hãy nhớ trích dẫn nguồn bằng [Source N] cho mọi thông tin bạn sử dụng từ CONTEXT."
          : "IMPORTANT: Remember to cite sources using [Source N] for every piece of information you use from the CONTEXT.";

      const userPrompt = `CONTEXT:\n${contextString}\n\nUSER QUESTION:\n${trimmedQuestion}\n\n${citationReminder}\n\nProvide a comprehensive answer with proper citations:`;

      const geminiHelper = new GeminiHelper();
      const generatedAnswer =
        conversationHistory.length > 0
          ? await geminiHelper.generateTextWithHistory(
              systemPrompt,
              conversationHistory,
              userPrompt,
              {
                locale,
                maxTokens: 1000,
              }
            )
          : await geminiHelper.generateText(
              `${systemPrompt}\n\n${userPrompt}`,
              {
                locale,
                maxTokens: 1000,
              }
            );

      const answerGenerationTimeMs = Date.now() - answerGenerationStartTime;

      // Step 5: Parse generated answer to extract citations
      const citations = extractCitations(generatedAnswer);

      // Step 6: Map citations back to source Q&As and extract cited sentences
      const enrichedSources = await enrichSourcesWithCitations(
        sources,
        generatedAnswer,
        citations
      );

      // Step 7: Generate follow-up questions
      let followUpQuestions: string[] = [];
      try {
        followUpQuestions = await generateFollowUpQuestions(
          trimmedQuestion,
          generatedAnswer,
          locale,
          conversationHistory
        );
      } catch (followUpError) {}

      // Generate conversation ID (simple timestamp-based for now)
      const conversationId = `conv_${args.sessionId}_${Date.now()}`;

      const finalTotalTimeMs = Date.now() - startTime;

      // Step 8: Save conversation with citations and follow-up questions
      try {
        // Save user question
        await ctx.runMutation(
          api.mutations.conversations.saveConversationMessage,
          {
            sessionId: args.sessionId,
            role: "user" as const,
            content: trimmedQuestion,
            locale,
          }
        );

        // Save assistant answer with sources, citation metadata, and follow-up questions
        await ctx.runMutation(
          api.mutations.conversations.saveConversationMessage,
          {
            sessionId: args.sessionId,
            role: "assistant" as const,
            content: generatedAnswer,
            locale,
            sources: enrichedSources.map((source) => ({
              questionId: source.questionId as Id<"qa">,
              questionNumber: source.questionNumber,
              question: source.question,
              relevanceScore: source.relevanceScore,
              citedSentences: source.citedSentences,
              citationMarkers: source.citationMarkers,
            })),
            followUpQuestions:
              followUpQuestions.length > 0 ? followUpQuestions : undefined,
            metadata: {
              sourcesUsed: sources.length,
              generationTimeMs: answerGenerationTimeMs,
              // tokensUsed: undefined, // Token usage not available from Gemini API
            },
          }
        );
      } catch (saveError) {
        // Log error but don't fail the entire request
        console.error(`Failed to save conversation: ${saveError}`);
        console.error(
          `Session: ${args.sessionId}, Question length: ${trimmedQuestion.length}`
        );
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorTotalTimeMs = Date.now() - startTime;

      console.error(
        `RAG query failed after ${errorTotalTimeMs}ms:`,
        errorMessage
      );
      console.error(
        `Question: "${trimmedQuestion.substring(0, 100)}${trimmedQuestion.length > 100 ? "..." : ""}"`
      );

      // Enhanced error context for different failure scenarios
      let enhancedError = `RAG query failed: ${errorMessage}`;

      if (errorMessage.includes("embedding")) {
        enhancedError +=
          " (Embedding generation failed - check Gemini API configuration)";
      } else if (
        errorMessage.includes("vector search") ||
        errorMessage.includes("search")
      ) {
        enhancedError += " (Vector search failed - check database indexes)";
      } else if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429")
      ) {
        enhancedError += " (Rate limit exceeded - try again in a moment)";
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("timeout")
      ) {
        enhancedError += " (Network error - check API connectivity)";
      }

      throw new ConvexError(enhancedError);
    }
  },
});
