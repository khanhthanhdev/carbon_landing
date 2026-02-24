/**
 * AI utilities for the Carbon Market Knowledge Base
 */

// Citation extraction utilities
export {
  type Citation,
  type CitedSentence,
  extractCitations,
  extractCitedSentences,
  getReferencedQuestionNumbers,
  getReferencedSourceIndices,
  groupCitationsBySource,
  isValidCitationMarker,
  removeCitationMarkers,
} from "./citations";

// Gemini AI utilities (existing)
export * from "./gemini";
