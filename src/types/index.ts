export type PromptType =
  | "Coding"
  | "Writing"
  | "Email"
  | "Translation"
  | "Summarization"
  | "Research"
  | "Debugging"
  | "Math"
  | "Brainstorming"
  | "Marketing"
  | "Business"
  | "Resume"
  | "Cover Letter"
  | "Essay"
  | "Blog"
  | "SEO"
  | "Documentation"
  | "General";

export interface Settings {
  openRouterKey: string;
  openRouterModel: string;
  tokenEstimation: boolean;
  promptScore: boolean;
  outputOptimization: boolean;
}

export interface PromptStats {
  originalTokens: number;
  optimizedTokens: number;
  savedTokens: number;
  savedPercentage: number;
}

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  promptType: PromptType;
  qualityScore: number;
  stats: PromptStats;
  changesMade: string[];
  wasRetried?: boolean;
}

export interface SiteSelectorConfig {
  name: string;
  hostnames: string[];
  inputSelector: string;
  sendButtonSelector: string;
  containerSelector?: string;
  addFilesSelector?: string;
  insertStrategy?: "execCommand" | "nativeEvent" | "value";
}
