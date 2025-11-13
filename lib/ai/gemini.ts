import { GoogleGenAI } from "@google/genai";

// Task types for embedding generation
export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "QUESTION_ANSWERING" | "FACT_VERIFICATION";

// Rate limiting configuration
interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit: number;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Default configurations
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerDay: 1000,
  burstLimit: 10,
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// Rate limiter state
interface RateLimiterState {
  requestsThisMinute: number;
  requestsToday: number;
  lastMinuteReset: number;
  lastDayReset: number;
  burstTokens: number;
  lastBurstRefill: number;
}

/**
 * GeminiHelper class provides a robust interface for Google Gemini API interactions
 * with rate limiting, retry logic, and proper error handling.
 */
export class GeminiHelper {
  private client: GoogleGenAI;
  private embeddingModel: string;
  private textModel: string;
  private rateLimitConfig: RateLimitConfig;
  private retryConfig: RetryConfig;
  private rateLimiterState: RateLimiterState;

  constructor(
    apiKey?: string,
    options?: {
      embeddingModel?: string;
      textModel?: string;
      rateLimitConfig?: Partial<RateLimitConfig>;
      retryConfig?: Partial<RetryConfig>;
    }
  ) {
    const key = apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("Missing Google Gemini API key. Set GOOGLE_API_KEY or GEMINI_API_KEY.");
    }

    this.client = new GoogleGenAI({ apiKey: key, vertexai: false });
    this.embeddingModel = options?.embeddingModel || process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
    this.textModel = options?.textModel || process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash-lite";
    
    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT, ...options?.rateLimitConfig };
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
    
    // Initialize rate limiter state
    const now = Date.now();
    this.rateLimiterState = {
      requestsThisMinute: 0,
      requestsToday: 0,
      lastMinuteReset: now,
      lastDayReset: now,
      burstTokens: this.rateLimitConfig.burstLimit,
      lastBurstRefill: now,
    };
  }

  /**
   * Generate embeddings for text with specified task type
   */
  async generateEmbedding(
    text: string,
    taskType: EmbeddingTaskType = "RETRIEVAL_QUERY",
    options?: {
      title?: string;
      dimensions?: number;
    }
  ): Promise<number[]> {
    const sanitized = text.trim();
    if (!sanitized) {
      throw new Error("Cannot generate embedding for empty text");
    }

    if (sanitized.length > 20000) {
      throw new Error("Text too long for embedding generation (max 20,000 characters)");
    }

    return this.executeWithRetry(async () => {
      await this.checkRateLimit();

      const response = await this.client.models.embedContent({
        model: this.embeddingModel,
        contents: [
          {
            role: "user",
            parts: [{ text: sanitized }],
          },
        ],
        config: {
          taskType,
          title: options?.title,
          ...(options?.dimensions ? { outputDimensionality: options.dimensions } : {}),
        },
      });

      const values = response.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new Error("Gemini did not return an embedding vector");
      }

      this.updateRateLimiterState();
      return values;
    });
  }

  /**
   * Generate embeddings for a batch of texts with specified task types
   */
  async batchEmbedContents(
    requests: Array<{
      text: string;
      taskType: EmbeddingTaskType;
      title?: string;
      dimensions?: number;
    }>
  ): Promise<number[][]> {
    const sanitizedRequests = requests.map(({ text, ...rest }) => {
      const sanitized = text.trim();
      if (!sanitized) {
        throw new Error("Cannot generate embedding for empty text");
      }
      if (sanitized.length > 20000) {
        throw new Error("Text too long for embedding generation (max 20,000 characters)");
      }
      return { text: sanitized, ...rest };
    });

    return this.executeWithRetry(async () => {
      await this.checkRateLimit();

      const batchRequests = sanitizedRequests.map(({ text, taskType, title, dimensions }) => ({
        model: this.embeddingModel,
        content: {
          role: "user",
          parts: [{ text }],
        },
        taskType,
        title,
        outputDimensionality: dimensions,
      }));

      const response = await this.client.models.batchEmbedContents({
        requests: batchRequests,
      });

      const embeddings = response.embeddings?.map(e => e.values);
      if (!embeddings || embeddings.length !== requests.length) {
        throw new Error("Gemini did not return the expected number of embeddings");
      }

      this.updateRateLimiterState();
      return embeddings;
    });
  }

  /**
   * Generate text response with context and locale support
   */
  async generateText(
    prompt: string,
    options?: {
      locale?: string;
      context?: string;
      maxTokens?: number;
    }
  ): Promise<string> {
    const sanitizedPrompt = prompt.trim();
    if (!sanitizedPrompt) {
      throw new Error("Prompt must not be empty");
    }

    return this.executeWithRetry(async () => {
      await this.checkRateLimit();

      const languageInstruction = options?.locale === "en" 
        ? "Respond in English." 
        : "Respond in Vietnamese.";
      
      const contextInstruction = options?.context 
        ? `Use the following context where relevant:\n${options.context}` 
        : "";

      const compositePrompt = `${languageInstruction}\n${contextInstruction}\n${sanitizedPrompt}`.trim();

      const requestParams: any = {
        model: this.textModel,
        contents: [
          {
            role: "user",
            parts: [{ text: compositePrompt }],
          },
        ],
      };

      if (options?.maxTokens) {
        requestParams.generationConfig = {
          maxOutputTokens: options.maxTokens,
        };
      }

      const response = await this.client.models.generateContent(requestParams);

      const text = response.text;
      if (!text) {
        throw new Error("Gemini did not return any text");
      }

      this.updateRateLimiterState();
      return text.trim();
    });
  }

  /**
   * Generate text response with conversation history support
   * Enables multi-turn conversations with context awareness
   */
  async generateTextWithHistory(
    systemPrompt: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
    currentPrompt: string,
    options?: {
      locale?: string;
      maxTokens?: number;
    }
  ): Promise<string> {
    const sanitizedPrompt = currentPrompt.trim();
    if (!sanitizedPrompt) {
      throw new Error("Prompt must not be empty");
    }

    return this.executeWithRetry(async () => {
      await this.checkRateLimit();

      const languageInstruction = options?.locale === "en" 
        ? "Respond in English." 
        : "Respond in Vietnamese.";

      // Build conversation contents for Gemini API
      const contents = [];

      // Add system prompt as first user message
      contents.push({
        role: "user" as const,
        parts: [{ text: `${languageInstruction}\n\n${systemPrompt}` }],
      });

      // Add a dummy assistant acknowledgment
      contents.push({
        role: "model" as const,
        parts: [{ text: "Understood. I will follow these instructions." }],
      });

      // Add conversation history (limit to last 10 messages to avoid context overflow)
      const recentHistory = conversationHistory.slice(-10);
      for (const message of recentHistory) {
        contents.push({
          role: message.role === "user" ? "user" as const : "model" as const,
          parts: [{ text: message.content }],
        });
      }

      // Add current prompt
      contents.push({
        role: "user" as const,
        parts: [{ text: sanitizedPrompt }],
      });

      const requestParams: any = {
        model: this.textModel,
        contents,
      };

      if (options?.maxTokens) {
        requestParams.generationConfig = {
          maxOutputTokens: options.maxTokens,
        };
      }

      const response = await this.client.models.generateContent(requestParams);

      const text = response.text;
      if (!text) {
        throw new Error("Gemini did not return any text");
      }

      this.updateRateLimiterState();
      return text.trim();
    });
  }

  /**
   * Check if request can proceed based on rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counters if time windows have passed
    if (now - this.rateLimiterState.lastMinuteReset >= 60000) {
      this.rateLimiterState.requestsThisMinute = 0;
      this.rateLimiterState.lastMinuteReset = now;
    }
    
    if (now - this.rateLimiterState.lastDayReset >= 86400000) {
      this.rateLimiterState.requestsToday = 0;
      this.rateLimiterState.lastDayReset = now;
    }

    // Refill burst tokens (1 token per second)
    const timeSinceLastRefill = now - this.rateLimiterState.lastBurstRefill;
    const tokensToAdd = Math.floor(timeSinceLastRefill / 1000);
    if (tokensToAdd > 0) {
      this.rateLimiterState.burstTokens = Math.min(
        this.rateLimitConfig.burstLimit,
        this.rateLimiterState.burstTokens + tokensToAdd
      );
      this.rateLimiterState.lastBurstRefill = now;
    }

    // Check rate limits
    if (this.rateLimiterState.requestsToday >= this.rateLimitConfig.requestsPerDay) {
      throw new Error("Daily rate limit exceeded. Please try again tomorrow.");
    }

    if (this.rateLimiterState.requestsThisMinute >= this.rateLimitConfig.requestsPerMinute) {
      const waitTime = 60000 - (now - this.rateLimiterState.lastMinuteReset);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    if (this.rateLimiterState.burstTokens <= 0) {
      throw new Error("Burst limit exceeded. Please wait a moment before making another request.");
    }
  }

  /**
   * Update rate limiter state after successful request
   */
  private updateRateLimiterState(): void {
    this.rateLimiterState.requestsThisMinute++;
    this.rateLimiterState.requestsToday++;
    this.rateLimiterState.burstTokens--;
  }

  /**
   * Execute function with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const baseDelay = this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt);
        const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
        const delay = Math.min(baseDelay + jitter, this.retryConfig.maxDelayMs);
        
        console.warn(`Gemini API request failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}): ${error}. Retrying in ${Math.round(delay)}ms...`);
        
        await this.sleep(delay);
      }
    }
    
    throw new Error(`Gemini API request failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError.message}`);
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Don't retry on authentication, validation, or rate limit errors
    return (
      message.includes("api key") ||
      message.includes("authentication") ||
      message.includes("invalid") ||
      message.includes("rate limit") ||
      message.includes("quota") ||
      message.includes("empty text") ||
      message.includes("too long")
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limiter status
   */
  getRateLimitStatus(): {
    requestsThisMinute: number;
    requestsToday: number;
    burstTokensAvailable: number;
    maxRequestsPerMinute: number;
    maxRequestsPerDay: number;
    maxBurstTokens: number;
  } {
    return {
      requestsThisMinute: this.rateLimiterState.requestsThisMinute,
      requestsToday: this.rateLimiterState.requestsToday,
      burstTokensAvailable: this.rateLimiterState.burstTokens,
      maxRequestsPerMinute: this.rateLimitConfig.requestsPerMinute,
      maxRequestsPerDay: this.rateLimitConfig.requestsPerDay,
      maxBurstTokens: this.rateLimitConfig.burstLimit,
    };
  }
}

// Create singleton instance for backward compatibility
let geminiHelper: GeminiHelper | null = null;

function getGeminiHelper(): GeminiHelper {
  if (!geminiHelper) {
    geminiHelper = new GeminiHelper();
  }
  return geminiHelper;
}

// Backward compatibility functions
export async function generateEmbedding(
  text: string,
  options: { usage?: "document" | "query" | "questionAnswering" | "factVerification"; title?: string; dimensions?: number } = {}
): Promise<number[]> {
  const taskTypeMap = {
    document: "RETRIEVAL_DOCUMENT" as const,
    query: "RETRIEVAL_QUERY" as const,
    questionAnswering: "QUESTION_ANSWERING" as const,
    factVerification: "FACT_VERIFICATION" as const,
  };
  
  const taskType = options.usage ? taskTypeMap[options.usage] : "RETRIEVAL_QUERY";
  
  return getGeminiHelper().generateEmbedding(text, taskType, {
    title: options.title,
    dimensions: options.dimensions,
  });
}

export async function generateText(
  prompt: string,
  options?: { locale?: string; context?: string; maxTokens?: number }
): Promise<string> {
  return getGeminiHelper().generateText(prompt, options);
}
