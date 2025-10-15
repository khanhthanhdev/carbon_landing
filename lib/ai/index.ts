/**
 * AI utilities for the Carbon Market Knowledge Base
 */

// Citation extraction utilities
export {
  extractCitations,
  extractCitedSentences,
  isValidCitationMarker,
  getReferencedSourceIndices,
  getReferencedQuestionNumbers,
  groupCitationsBySource,
  removeCitationMarkers,
  type Citation,
  type CitedSentence,
} from './citations';

// Gemini AI utilities (existing)
export * from './gemini';