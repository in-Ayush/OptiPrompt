import { escapeRegExp } from "../utilities/helpers";

/** Pre-compiled filler phrases for score deduction. */
const FILLER_PHRASES = [
  "would you please", "could you please", "can you please",
  "i would like you to", "i want you to", "i need you to",
  "thank you very much", "thanks in advance", "please help",
  "can you", "could you", "would you", "help me", "please", "kindly"
];
const FILLER_REGEXES = FILLER_PHRASES.map((p) => new RegExp(`\\b${escapeRegExp(p)}\\b`, "gi"));

/** Pre-compiled verbose phrases for score deduction. */
const VERBOSE_PHRASES = [
  "give me an explanation of", "provide an explanation of", "give me an explanation",
  "provide an explanation", "make a list of", "tell me about", "how can i",
  "in a very simple way", "step by step explanation", "with detailed explanation",
  "at this point in time", "in order to", "due to the fact that", "for the purpose of",
  "has the ability to", "is able to", "it is important to note that", "it should be noted that",
  "please make sure", "a large number of", "a small number of", "with the exception of",
  "prior to", "subsequent to", "utilize", "commence", "terminate", "assist", "demonstrate",
  "purchase", "approximately", "that is to say", "regardless of the fact that",
  "as a matter of fact", "at the end of the day", "it goes without saying that",
  "it goes without saying", "take into consideration", "take into account",
  "over and over again", "time and time again", "in the near future", "on a regular basis",
  "in the process of", "with respect to", "with regard to", "in the event that",
  "in addition to", "on the other hand", "as a result of", "in the case of",
  "a great deal of", "bring to a close", "few and far between", "first and foremost",
  "each and every", "one and only", "by means of", "a variety of", "in spite of",
  "on account of", "in terms of", "the fact that", "at all times", "as well as",
  "at the present moment in time", "at this moment in time", "at the present time"
];
const VERBOSE_REGEXES = VERBOSE_PHRASES.map((p) => new RegExp(`\\b${escapeRegExp(p)}\\b`, "gi"));

/** Pre-compiled tech naming checks for capitalization deduction. */
const TECH_LIST = [
  { search: "react hooks", replace: "React Hooks" },
  { search: "next.js", replace: "Next.js" },
  { search: "nextjs", replace: "Next.js" },
  { search: "vue.js", replace: "Vue.js" },
  { search: "vuejs", replace: "Vue.js" },
  { search: "tailwindcss", replace: "Tailwind CSS" },
  { search: "node.js", replace: "Node.js" },
  { search: "nodejs", replace: "Node.js" },
  { search: "javascript", replace: "JavaScript" },
  { search: "typescript", replace: "TypeScript" },
  { search: "docker", replace: "Docker" },
  { search: "python", replace: "Python" },
  { search: "html", replace: "HTML" },
  { search: "css", replace: "CSS" },
  { search: "json", replace: "JSON" },
  { search: "api", replace: "API" },
  { search: "apis", replace: "APIs" },
  { search: "github", replace: "GitHub" },
  { search: "minecraft", replace: "Minecraft" }
];
const TECH_REGEXES = TECH_LIST.map((r) => ({
  regex: new RegExp(`\\b${escapeRegExp(r.search)}\\b`, "g"),
  expected: r.replace
}));

/**
 * Computes a quality score from 0 to 100 based on multiple vectors:
 * filler presence, verbosity, duplicates, capitalization, readability, and conciseness.
 */
export function computePromptScore(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  if (trimmed.length < 10) return 20;

  let score = 70;

  // 1. Filler words penalty (max -25)
  let fillerCount = 0;
  for (const regex of FILLER_REGEXES) {
    regex.lastIndex = 0;
    if (regex.test(trimmed)) fillerCount++;
  }
  score -= Math.min(25, fillerCount * 5);

  // 2. Verbosity penalty (max -20)
  let verboseCount = 0;
  for (const regex of VERBOSE_REGEXES) {
    regex.lastIndex = 0;
    if (regex.test(trimmed)) verboseCount++;
  }
  score -= Math.min(20, verboseCount * 5);

  // 3. Duplicates penalty (max -20)
  let dupDeduction = 0;
  if (/\b(\w+)\s+\1\b/i.test(trimmed)) dupDeduction += 10;
  if (/[ \t]{2,}/.test(trimmed)) dupDeduction += 5;
  if (/,,+/.test(trimmed) || /\?{2,}/.test(trimmed) || /!{2,}/.test(trimmed)) dupDeduction += 5;
  score -= Math.min(20, dupDeduction);

  // 4. Tech naming penalty (max -15)
  let grammarDeduction = 0;
  for (const { regex, expected } of TECH_REGEXES) {
    regex.lastIndex = 0;
    const matches = trimmed.match(regex) || [];
    grammarDeduction += matches.filter((m) => m !== expected).length * 3;
  }
  score -= Math.min(15, grammarDeduction);

  // 5. Readability — long sentence penalty (max -24)
  const sentences = trimmed.split(/(?<=[\.!\?])\s+/).filter((s) => s.length > 0);
  let longCount = 0;
  for (const sentence of sentences) {
    if (sentence.split(/\s+/).length > 35) longCount++;
  }
  score -= Math.min(24, longCount * 8);

  // 6. Structure bonus
  if (/^\s*[-*+•]\s+/m.test(trimmed) || /^\s*\d+\.\s+/m.test(trimmed)) score += 10;

  // 7. Conciseness
  if (trimmed.length < 15) {
    score -= 15;
  } else if (trimmed.length > 50 && trimmed.length < 500) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}
