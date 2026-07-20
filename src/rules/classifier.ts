import type { PromptType } from "../types";
import { escapeRegExp } from "../utilities/helpers";

/**
 * 17-type keyword dictionary for prompt classification.
 * Multi-word phrases are preferred for higher specificity.
 */
const KEYWORDS: Record<Exclude<PromptType, "General">, string[]> = {
  Coding: ["code", "python", "javascript", "typescript", "c++", "java", "html", "css", "programming", "sql", "query", "database", "api", "frontend", "backend", "script", "json", "syntax", "regex", "plugin", "minecraft", "react", "hooks", "nextjs", "next.js"],
  Debugging: ["bug", "error", "crash", "stack trace", "broken", "not working", "fails", "exception", "debug", "issue in code", "console error", "runtime"],
  Math: ["calculus", "algebra", "math", "mathematics", "geometry", "integral", "derivative", "formula", "statistic", "theorem", "probability", "arithmetic", "equation"],
  Documentation: ["readme", "documentation", "api docs", "user manual", "guide", "code comments", "jsdoc", "reference manual", "docstring", "wiki"],
  Writing: ["creative writing", "story", "dialogue", "character", "novel", "poem", "fiction", "non-fiction", "narrative", "prose", "paragraph", "draft"],
  Essay: ["essay", "thesis statement", "academic writing", "scholar", "term paper", "argumentative essay", "bibliography", "citation"],
  Blog: ["blog post", "newsletter article", "blog article", "medium post", "substack", "wordpress"],
  Resume: ["resume", "cv", "curriculum vitae", "work experience", "job history", "career profile", "linkedin profile"],
  "Cover Letter": ["cover letter", "application letter", "job application", "dear hiring manager"],
  Email: ["email", "mail", "outreach", "subject line", "reply to", "salutation", "inbox", "gmail", "outlook"],
  Translation: ["translate", "bilingual", "translator"],
  Summarization: ["summarize", "summary", "tl;dr", "condense", "briefly explain", "bullet points", "key takeaways", "gist", "nutshell", "digest"],
  Research: ["literature review", "citations", "sources", "empirical", "hypothesis", "findings", "case study", "dataset"],
  Brainstorming: ["brainstorm", "suggestions", "possibilities", "alternatives", "ideate", "innovative"],
  Marketing: ["marketing copy", "ad campaign", "advertisement", "call to action", "cta", "target audience", "sales copy", "social media post", "instagram caption"],
  Business: ["business plan", "executive summary", "proposal", "revenue", "financial model", "pitch deck", "quarterly report", "roi", "client pitch"],
  SEO: ["seo keywords", "search volume", "meta description", "alt text", "backlink", "organic traffic", "search engine optimization", "serp", "seo"]
};

/** Pre-compiled keyword regexes for each category. */
const COMPILED_KEYWORDS: { type: Exclude<PromptType, "General">; regex: RegExp }[] = [];

for (const [type, words] of Object.entries(KEYWORDS)) {
  const promptType = type as Exclude<PromptType, "General">;
  for (const word of words) {
    COMPILED_KEYWORDS.push({
      type: promptType,
      regex: new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi")
    });
  }
}

/**
 * Classifies a prompt into one of 17 supported categories using keyword metrics.
 * Returns "General" if no category scores above 0.
 */
export function classifyPrompt(text: string): PromptType {
  const scores = new Map<Exclude<PromptType, "General">, number>();

  for (const { type, regex } of COMPILED_KEYWORDS) {
    regex.lastIndex = 0;
    const matches = text.match(regex);
    if (matches) {
      scores.set(type, (scores.get(type) || 0) + matches.length);
    }
  }

  let maxScore = 0;
  let bestType: PromptType = "General";

  for (const [type, score] of scores) {
    if (score > maxScore) {
      maxScore = score;
      bestType = type;
    }
  }

  return bestType;
}
