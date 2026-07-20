import type { PromptStats } from "../types";

/**
 * Heuristically estimates the token count of a text offline.
 * It counts punctuation marks as individual tokens and breaks down words
 * into tokens based on length (average of ~4 characters per token).
 */
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Count punctuation characters
  const punctuationRegex = /[.,\/#!$%\^&\*;:{}=\-_`~()?"'']/g;
  const punctuationMatches = trimmed.match(punctuationRegex);
  const punctuationCount = punctuationMatches ? punctuationMatches.length : 0;

  // Split by whitespace and punctuation to get raw word chunks
  const words = trimmed.split(/[\s.,\/#!$%\^&\*;:{}=\-_`~()?"'']+/).filter((w) => w.length > 0);

  let tokenCount = punctuationCount;
  for (const word of words) {
    // Standard heuristic: 1 token is roughly 4 characters. A word of length 1-4 is 1 token.
    tokenCount += Math.max(1, Math.ceil(word.length / 4));
  }

  return Math.max(1, tokenCount);
}

/**
 * Calculates prompt stats and token savings.
 */
export function calculateStats(originalText: string, optimizedText: string): PromptStats {
  const originalTokens = estimateTokens(originalText);
  const optimizedTokens = estimateTokens(optimizedText);
  const savedTokens = Math.max(0, originalTokens - optimizedTokens);
  
  let savedPercentage = 0;
  if (originalTokens > 0) {
    savedPercentage = Math.round((savedTokens / originalTokens) * 100);
  }

  return {
    originalTokens,
    optimizedTokens,
    savedTokens,
    savedPercentage
  };
}
