/**
 * Escapes special regex characters in a string for safe use in `new RegExp()`.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Maximum input length the optimizer will process (prevents DoS). */
export const MAX_PROMPT_LENGTH = 10_000;

/**
 * Safely truncates input to the maximum allowed length.
 */
export function sanitizeInput(text: string): string {
  if (text.length > MAX_PROMPT_LENGTH) {
    return text.slice(0, MAX_PROMPT_LENGTH);
  }
  return text;
}
