import { getSettings } from "./storage/settings";
import { classifyPrompt } from "./rules/classifier";
import { computePromptScore } from "./rules/score";
import { calculateStats } from "./utilities/token-estimator";
import type { OptimizationResult } from "./types";

// Define the system prompt for prompt compression
const COMPRESSION_SYSTEM_PROMPT = `You are a professional prompt compression engine. Your sole objective is to compress the input prompt into an optimized, highly token-efficient version, following these rules:
1. Preserve Meaning & Intent: Ensure the exact meaning, task, and context of the original prompt are preserved.
2. Keep Important Constraints & Instructions: Never delete or alter specific constraints, requirements, rules, variables, placeholders, JSON, Markdown, YAML, XML, code blocks, URLs, or formatting.
3. Aggressive Token Reduction: Remove polite greetings, conversational filler, repetition, redundant explanations, and verbose phrasing. Replace long phrases with shorter equivalents and merge duplicate/similar instructions.
4. Output Optimization: Modify the prompt to instruct the downstream AI to generate concise, direct, token-efficient responses (e.g., instructing it to respond concisely, skip intros/outros, avoid verbose explanations, and return only the requested result).
5. Strict Output Format: Return ONLY the final optimized prompt. Do not wrap the result in markdown blocks (e.g. \`\`\`), do not add commentary, notes, explanations of what changed, or conversational filler.`;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return;
  }
  if (message.action === "optimizePrompt") {
    const text = message.text || "";
    
    if (!text.trim()) {
      sendResponse({
        success: true,
        result: {
          originalPrompt: text,
          optimizedPrompt: text,
          promptType: "General",
          qualityScore: 0,
          stats: { originalTokens: 0, optimizedTokens: 0, savedTokens: 0, savedPercentage: 0 },
          changesMade: []
        }
      });
      return true;
    }

    getSettings().then(async (settings) => {
      if (!settings.openRouterKey || !settings.openRouterKey.trim()) {
        sendResponse({
          success: false,
          error: "OpenRouter API Key not set. Please go to Settings in the OptiPrompt extension to enter your API key."
        });
        return;
      }

      const model = settings.openRouterModel || "openrouter/free";

      // PRESETS list to identify predefined free models and prevent paid models abuse
      const PRESETS = [
        "openrouter/free",
        "deepseek/deepseek-chat:free",
        "google/gemini-2.5-flash:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-r1:free",
        "nvidia/llama-3.1-nemotron-70b-instruct:free"
      ];

      const isPreset = PRESETS.includes(model);
      const isFreeModel = model === "openrouter/free" || model.endsWith(":free");
      const isPaidModel = !isFreeModel;

      // Rule: Ensure no request is ever sent to a paid model unless the user explicitly enters a custom model ID.
      if (isPaidModel && isPreset) {
        sendResponse({
          success: false,
          error: `Safety block: The model '${model}' is a paid model and cannot be sent as a preset. Please switch to a free model or configure a custom model ID.`
        });
        return;
      }

      // Helper function to send requests to OpenRouter
      const fetchFromOpenRouter = async (modelSlug: string) => {
        const promptInstruction = settings.outputOptimization
          ? "\n\n[Instruction: Compress this prompt aggressively. Also, ensure the compressed prompt instructs the downstream AI to respond concisely, skip intros/outros, return only the direct requested result, and use minimal tokens.]"
          : "\n\n[Instruction: Compress this prompt aggressively for minimal token count while preserving meaning and instructions.]";

        return fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.openRouterKey}`,
            "HTTP-Referer": "https://github.com/OptiPrompt/OptiPrompt",
            "X-Title": "OptiPrompt Prompt Compressor"
          },
          body: JSON.stringify({
            model: modelSlug,
            messages: [
              { role: "system", content: COMPRESSION_SYSTEM_PROMPT },
              { role: "user", content: text + promptInstruction }
            ],
            temperature: 0.1
          })
        });
      };

      try {
        let activeModel = model;
        let response = await fetchFromOpenRouter(activeModel);
        let wasRetried = false;

        // Check if response failed
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData?.error?.message || `HTTP error ${response.status}`;
          const errorLower = errorMsg.toLowerCase();

          const isFreeUnavailable = errorLower.includes("unavailable for free") || errorLower.includes("paid version");

          // Retry once using openrouter/free if a selected free model becomes unavailable
          if (isFreeUnavailable && isFreeModel && activeModel !== "openrouter/free") {
            activeModel = "openrouter/free";
            wasRetried = true;
            response = await fetchFromOpenRouter(activeModel);
            
            if (!response.ok) {
              const retryErrorData = await response.json().catch(() => ({}));
              const retryErrorMsg = retryErrorData?.error?.message || `HTTP error ${response.status}`;
              sendResponse({
                success: false,
                isFreeUnavailable: true,
                error: `The selected model '${model}' is temporarily unavailable for free. Automatically tried fallback to 'Auto (OpenRouter Free)', but that failed too: ${retryErrorMsg}`
              });
              return;
            }
          } else {
            sendResponse({
              success: false,
              isFreeUnavailable: isFreeUnavailable,
              error: isFreeUnavailable
                ? `The selected model '${model}' is no longer available for free. Please switch to 'Auto (OpenRouter Free)' in Settings.`
                : `OpenRouter API returned an error: ${errorMsg}`
            });
            return;
          }
        }

        const data = await response.json();
        let optimizedPrompt = data?.choices?.[0]?.message?.content || "";
        optimizedPrompt = optimizedPrompt.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim();

        if (!optimizedPrompt) {
          sendResponse({
            success: false,
            error: "Received empty response from OpenRouter model. Please try again."
          });
          return;
        }

        // Post-process offline metrics
        const promptType = classifyPrompt(optimizedPrompt);
        const stats = settings.tokenEstimation
          ? calculateStats(text, optimizedPrompt)
          : { originalTokens: 0, optimizedTokens: 0, savedTokens: 0, savedPercentage: 0 };
        const qualityScore = settings.promptScore ? computePromptScore(optimizedPrompt) : 0;

        const changesMade = ["AI prompt compression"];
        if (wasRetried) {
          changesMade.push("Fell back to 'Auto (OpenRouter Free)'");
        }
        if (settings.outputOptimization) {
          changesMade.push("Appended output rules for concise AI response");
        }
        if (stats.savedPercentage > 0) {
          changesMade.push(`Saved ~${stats.savedPercentage}% of tokens`);
        }

        const result: OptimizationResult = {
          originalPrompt: text,
          optimizedPrompt,
          promptType,
          qualityScore,
          stats,
          changesMade
        };

        const storageObject = {
          originalPrompt: text,
          optimizedPrompt,
          promptType,
          qualityScore,
          stats,
          changesMade,
          model: activeModel,
          timestamp: Date.now()
        };

        chrome.storage.local.set({ latestResult: storageObject }, () => {
          // Broadcast in real-time to popup
          chrome.runtime.sendMessage({
            action: "latestResultUpdated",
            result: storageObject
          }).catch(() => {
            // Ignore error if popup is closed and no listeners exist
          });
        });

        sendResponse({
          success: true,
          result,
          wasRetried,
          originalModel: model
        });
      } catch (err: any) {
        sendResponse({
          success: false,
          error: `Network error connecting to OpenRouter: ${err.message || err}`
        });
      }
    });

    // Return true to keep message channel open for asynchronous reply
    return true;
  }
});
