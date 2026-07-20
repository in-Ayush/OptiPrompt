import type { OptimizationResult, Settings } from "../types";

/**
 * Sends the prompt to the background script to be optimized using the OpenRouter AI model.
 * This is an asynchronous function that handles runtime communication.
 */
export async function optimizePrompt(text: string, settings: Settings): Promise<OptimizationResult> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) {
      reject(new Error("OptiPrompt background service is unavailable. Please make sure the extension is active."));
      return;
    }

    chrome.runtime.sendMessage({ action: "optimizePrompt", text }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response && response.success) {
        resolve({
          ...response.result,
          wasRetried: response.wasRetried
        });
      } else {
        reject(new Error(response?.error || "Unknown optimization error"));
      }
    });
  });
}
