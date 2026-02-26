/**
 * Citation extraction utilities for parsing citation markers from AI-generated text
 * Supports multiple citation formats: [Source N], [QX.Y.Z], and combined formats
 */

export interface Citation {
  marker: string; // Original citation text (e.g., "[Source 1]", "[Q1.2.3]")
  position: {
    start: number; // Character position in answer where citation starts
    end: number; // Character position in answer where citation ends
  };
  questionNumber?: string; // Question number if specified (e.g., "1.2.3")
  sourceIndex?: number; // Index in sources array (0-based)
}

/**
 * Extracts citation markers from AI-generated answer text
 *
 * Supported formats:
 * - [Source 1], [Source 2] - Numbered source references
 * - [Q1.2.3], [Q2.1.5] - Question number references
 * - [Source 1, Q1.2.3] - Combined source and question number
 *
 * @param answer The AI-generated answer text containing citation markers
 * @returns Array of Citation objects sorted by position in text
 */
export function extractCitations(answer: string): Citation[] {
  const citations: Citation[] = [];

  // Regex patterns for different citation formats
  const patterns = [
    // Pattern 1: [Source N] - captures source number
    {
      regex: /\[Source (\d+)\]/g,
      parse: (match: RegExpExecArray) => ({
        marker: match[0],
        sourceIndex: Number.parseInt(match[1], 10) - 1, // Convert to 0-based index
        questionNumber: undefined,
        position: {
          start: match.index!,
          end: match.index! + match[0].length,
        },
      }),
    },

    // Pattern 2: [QX.Y.Z] - captures question number
    {
      regex: /\[Q([\d.]+)\]/g,
      parse: (match: RegExpExecArray) => ({
        marker: match[0],
        sourceIndex: undefined,
        questionNumber: match[1],
        position: {
          start: match.index!,
          end: match.index! + match[0].length,
        },
      }),
    },

    // Pattern 3: [Source N, QX.Y.Z] - captures both source and question number
    {
      regex: /\[Source (\d+),\s*Q([\d.]+)\]/g,
      parse: (match: RegExpExecArray) => ({
        marker: match[0],
        sourceIndex: Number.parseInt(match[1], 10) - 1, // Convert to 0-based index
        questionNumber: match[2],
        position: {
          start: match.index!,
          end: match.index! + match[0].length,
        },
      }),
    },
  ];

  // Process each pattern
  patterns.forEach(({ regex, parse }) => {
    let match;
    // Reset regex lastIndex to ensure we start from the beginning
    regex.lastIndex = 0;

    while ((match = regex.exec(answer)) !== null) {
      citations.push(parse(match));
    }
  });

  // Sort citations by position in text (earliest first)
  return citations.sort((a, b) => a.position.start - b.position.start);
}

/**
 * Validates that a citation marker follows supported formats
 *
 * @param marker The citation marker to validate
 * @returns true if the marker is in a supported format
 */
export function isValidCitationMarker(marker: string): boolean {
  const validPatterns = [
    /^\[Source \d+\]$/, // [Source N]
    /^\[Q[\d.]+\]$/, // [QX.Y.Z]
    /^\[Source \d+,\s*Q[\d.]+\]$/, // [Source N, QX.Y.Z]
  ];

  return validPatterns.some((pattern) => pattern.test(marker));
}

/**
 * Extracts all unique source indices referenced in citations
 *
 * @param citations Array of Citation objects
 * @returns Array of unique source indices (0-based)
 */
export function getReferencedSourceIndices(citations: Citation[]): number[] {
  const indices = new Set<number>();

  citations.forEach((citation) => {
    if (citation.sourceIndex !== undefined) {
      indices.add(citation.sourceIndex);
    }
  });

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Extracts all unique question numbers referenced in citations
 *
 * @param citations Array of Citation objects
 * @returns Array of unique question numbers
 */
export function getReferencedQuestionNumbers(citations: Citation[]): string[] {
  const questionNumbers = new Set<string>();

  citations.forEach((citation) => {
    if (citation.questionNumber) {
      questionNumbers.add(citation.questionNumber);
    }
  });

  return Array.from(questionNumbers).sort();
}

/**
 * Groups citations by their source index for easier processing
 *
 * @param citations Array of Citation objects
 * @returns Map of source index to array of citations
 */
export function groupCitationsBySource(
  citations: Citation[]
): Map<number, Citation[]> {
  const groups = new Map<number, Citation[]>();

  citations.forEach((citation) => {
    if (citation.sourceIndex !== undefined) {
      const existing = groups.get(citation.sourceIndex) || [];
      existing.push(citation);
      groups.set(citation.sourceIndex, existing);
    }
  });

  return groups;
}

/**
 * Removes citation markers from text while preserving the rest of the content
 *
 * @param text Text containing citation markers
 * @returns Text with citation markers removed
 */
export function removeCitationMarkers(text: string): string {
  return text
    .replace(/\[Source \d+\]/g, "")
    .replace(/\[Q[\d.]+\]/g, "")
    .replace(/\[Source \d+,\s*Q[\d.]+\]/g, "")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Interface for cited sentence extraction results
 */
export interface CitedSentence {
  position: number; // Position in source answer
  sentence: string; // The extracted sentence from source
  similarity: number; // Similarity score (0-1)
}

/**
 * Extracts sentences from source answers that match cited content using fuzzy matching
 *
 * This function analyzes the AI-generated answer around citation markers to identify
 * which specific sentences from the source answers were referenced. It uses word
 * overlap similarity to find the best matching sentences.
 *
 * @param answer The AI-generated answer containing citations
 * @param citation The citation object with position information
 * @param sourceAnswer The source answer text to extract sentences from
 * @param options Configuration options for extraction
 * @param options.maxSentences Maximum number of sentences to return (default: 2)
 * @param options.minSimilarity Minimum similarity threshold (default: 0.3)
 * @param options.contextWindow Number of characters around citation to analyze (default: 200)
 * @returns Array of CitedSentence objects sorted by similarity score (descending)
 *
 * Requirements: 11.6, 11.11, 12.6
 *
 * @example
 * const citation = { marker: "[Source 1]", position: { start: 50, end: 60 } };
 * const sentences = extractCitedSentences(
 *   "Carbon credits are tradable certificates [Source 1] that represent emissions reductions.",
 *   citation,
 *   "A carbon credit is a tradable certificate. It represents one ton of CO2 equivalent."
 * );
 * // Returns: [{ sentence: "A carbon credit is a tradable certificate.", similarity: 0.8, position: 0 }]
 */
export function extractCitedSentences(
  answer: string,
  citation: Citation,
  sourceAnswer: string,
  options?: {
    maxSentences?: number;
    minSimilarity?: number;
    contextWindow?: number;
  }
): CitedSentence[] {
  // Configuration with defaults
  const maxSentences = options?.maxSentences ?? 2;
  const minSimilarity = options?.minSimilarity ?? 0.25; // Lowered threshold for better recall
  const contextWindow = options?.contextWindow ?? 200;

  // Validate inputs
  if (!(answer && sourceAnswer && citation.position)) {
    return [];
  }

  // Extract the context around the citation in the AI answer
  const citationStart = citation.position.start;
  const citationEnd = citation.position.end;

  // Get context before and after the citation
  const contextStart = Math.max(0, citationStart - contextWindow);
  const contextEnd = Math.min(answer.length, citationEnd + contextWindow);
  const context = answer.substring(contextStart, contextEnd);

  // Remove citation markers from context to get clean text
  const cleanContext = removeCitationMarkers(context);

  // Extract the sentence containing the citation
  const beforeCitation = answer.substring(0, citationStart);
  const afterCitation = answer.substring(citationEnd);

  // Find sentence boundaries around the citation
  const sentenceStart = Math.max(
    beforeCitation.lastIndexOf(".") + 1,
    beforeCitation.lastIndexOf("!") + 1,
    beforeCitation.lastIndexOf("?") + 1,
    0
  );

  const sentenceEndInAfter = Math.min(
    afterCitation.indexOf(".") !== -1
      ? afterCitation.indexOf(".") + citationEnd + 1
      : answer.length,
    afterCitation.indexOf("!") !== -1
      ? afterCitation.indexOf("!") + citationEnd + 1
      : answer.length,
    afterCitation.indexOf("?") !== -1
      ? afterCitation.indexOf("?") + citationEnd + 1
      : answer.length
  );

  // Extract the citing sentence (the sentence that contains the citation)
  const citingSentence = removeCitationMarkers(
    answer.substring(sentenceStart, sentenceEndInAfter).trim()
  );

  // Split source answer into sentences
  const sourceSentences = splitIntoSentences(sourceAnswer);

  // Calculate similarity for each source sentence
  const scoredSentences: CitedSentence[] = [];

  sourceSentences.forEach((sentence, index) => {
    if (sentence.trim().length < 10) {
      return; // Skip very short sentences
    }

    // Calculate similarity using word overlap
    const similarity = calculateWordOverlapSimilarity(citingSentence, sentence);

    // Also check similarity with the broader context
    const contextSimilarity = calculateWordOverlapSimilarity(
      cleanContext,
      sentence
    );

    // Use the higher of the two similarities
    const finalSimilarity = Math.max(similarity, contextSimilarity * 0.8); // Weight context slightly lower

    if (finalSimilarity >= minSimilarity) {
      scoredSentences.push({
        sentence: sentence.trim(),
        similarity: finalSimilarity,
        position: index,
      });
    }
  });

  // Sort by similarity (descending) and return top matches
  return scoredSentences
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxSentences);
}

/**
 * Splits text into sentences using multiple delimiters
 *
 * @param text Text to split into sentences
 * @returns Array of sentences
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation, but preserve the punctuation
  return text
    .split(/([.!?]+)/)
    .reduce((sentences: string[], part: string, index: number) => {
      if (index % 2 === 0) {
        // This is text content
        if (part.trim()) {
          sentences.push(part.trim());
        }
      } else {
        // This is punctuation - append to the last sentence
        if (sentences.length > 0) {
          sentences[sentences.length - 1] += part;
        }
      }
      return sentences;
    }, [])
    .filter((sentence) => sentence.trim().length > 0);
}

/**
 * Calculates word overlap similarity between two text strings
 *
 * Uses Jaccard similarity coefficient based on word overlap:
 * similarity = |intersection| / |union|
 *
 * @param text1 First text string
 * @param text2 Second text string
 * @returns Similarity score between 0 and 1
 */
function calculateWordOverlapSimilarity(text1: string, text2: string): number {
  // Normalize and tokenize text
  const words1 = normalizeAndTokenize(text1);
  const words2 = normalizeAndTokenize(text2);

  if (words1.size === 0 && words2.size === 0) {
    return 1.0; // Both empty
  }

  if (words1.size === 0 || words2.size === 0) {
    return 0.0; // One empty
  }

  // Calculate intersection and union
  const intersection = new Set([...words1].filter((word) => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  // Jaccard similarity coefficient
  const jaccardSimilarity = intersection.size / union.size;

  // Also calculate a weighted similarity that considers word frequency
  let weightedScore = 0;
  let _totalWeight = 0;

  for (const word of intersection) {
    // Give higher weight to longer, more meaningful words
    const weight = Math.max(1, word.length - 2); // Minimum weight of 1
    weightedScore += weight;
    _totalWeight += weight;
  }

  // Normalize weighted score
  const maxPossibleWeight = Math.max(
    [...words1].reduce((sum, word) => sum + Math.max(1, word.length - 2), 0),
    [...words2].reduce((sum, word) => sum + Math.max(1, word.length - 2), 0)
  );

  const weightedSimilarity =
    maxPossibleWeight > 0 ? weightedScore / maxPossibleWeight : 0;

  // Combine Jaccard and weighted similarities (favor Jaccard for consistency)
  return jaccardSimilarity * 0.7 + weightedSimilarity * 0.3;
}

/**
 * Normalizes text and extracts meaningful words
 *
 * @param text Input text
 * @returns Set of normalized words
 */
function normalizeAndTokenize(text: string): Set<string> {
  // Convert to lowercase and extract words
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .split(/\s+/)
    .filter((word) => {
      // Filter out very short words and common stop words
      if (word.length < 2) {
        return false; // Lowered from 3 to 2 for better matching
      }

      // Basic English and Vietnamese stop words (reduced set for better recall)
      const stopWords = new Set([
        "the",
        "and",
        "or",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "with",
        "by",
        "is",
        "are",
        "was",
        "were",
        "been",
        "being",
        "have",
        "has",
        "had",
        "this",
        "that",
        "these",
        "those",
        // Vietnamese stop words (reduced)
        "là",
        "của",
        "và",
        "có",
        "được",
        "cho",
        "từ",
        "với",
        "trong",
        "này",
        "đó",
        "các",
        "một",
        "không",
      ]);

      return !stopWords.has(word);
    });

  return new Set(words);
}
