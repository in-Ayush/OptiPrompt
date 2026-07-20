import type { Settings } from "../types";

export const DEFAULT_SETTINGS: Settings = {
  openRouterKey: "",
  openRouterModel: "openrouter/free",
  tokenEstimation: true,
  promptScore: true,
  outputOptimization: true
};

/**
 * Loads settings from chrome.storage.local with fallback to localStorage and defaults.
 * Handles corrupt data gracefully.
 */
export const getSettings = (): Promise<Settings> => {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      // Fallback for tests or standalone web preview
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("optiprompt_settings");
          if (raw) {
            const parsed = JSON.parse(raw);
            resolve({ ...DEFAULT_SETTINGS, ...parsed });
            return;
          }
        } catch {
          // Corrupt data — fall through to defaults
        }
      }
      resolve({ ...DEFAULT_SETTINGS });
      return;
    }

    chrome.storage.local.get("settings", (result) => {
      if (chrome.runtime.lastError) {
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }
      resolve({ ...DEFAULT_SETTINGS, ...result.settings });
    });
  });
};

/**
 * Persists settings to chrome.storage.local with fallback to localStorage.
 */
export const saveSettings = (settings: Settings): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("optiprompt_settings", JSON.stringify(settings));
        } catch {
          // Storage full or unavailable — silently degrade
        }
      }
      resolve();
      return;
    }

    chrome.storage.local.set({ settings }, () => {
      if (chrome.runtime.lastError) {
        // Silently handle write errors
      }
      resolve();
    });
  });
};

/**
 * Reads the currently cached active tab prompt text.
 */
export const getActiveTabPrompt = (): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve("");
      return;
    }
    chrome.storage.local.get("activeTabPrompt", (result) => {
      if (chrome.runtime.lastError) {
        resolve("");
        return;
      }
      resolve(result.activeTabPrompt || "");
    });
  });
};

/**
 * Saves active tab prompt text to chrome.storage.local.
 */
export const saveActiveTabPrompt = (prompt: string): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.set({ activeTabPrompt: prompt }, () => {
      resolve();
    });
  });
};
