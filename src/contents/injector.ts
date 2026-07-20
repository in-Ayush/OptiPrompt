import type { PlasmoCSConfig } from "plasmo";
import { getSiteConfig } from "../utilities/sites-config";
import { optimizePrompt } from "../optimizer";
import { getSettings } from "../storage/settings";
import logoUrl from "data-base64:~assets/optipromptlogo.png";

/**
 * Sets the content of the action button with the branding logo and text.
 * Complies with the Security Audit by using safe textContent/appendChild APIs instead of innerHTML.
 */
function setButtonContent(button: HTMLButtonElement, text: string, showLogo = true): void {
  button.textContent = "";
  
  if (showLogo) {
    const img = document.createElement("img");
    img.src = logoUrl;
    img.style.cssText = "width: 12px; height: 12px; margin-right: 6px; border-radius: 3px; object-fit: contain; pointer-events: none; display: inline-block; vertical-align: middle;";
    img.alt = "OptiPrompt Logo";
    button.appendChild(img);
  }
  
  const span = document.createElement("span");
  span.textContent = text;
  span.style.cssText = "vertical-align: middle;";
  button.appendChild(span);
}

export const config: PlasmoCSConfig = {
  matches: [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://grok.com/*",
    "https://perplexity.ai/*",
    "https://deepseek.com/*",
    "https://*.deepseek.com/*"
  ],
  run_at: "document_end"
};

let originalPromptText = "";
let isCurrentlyOptimizing = false;
let messageListenerBound = false;

/**
 * Injects text into a textarea or contenteditable element,
 * preserving React/Lexical state and browser undo history.
 */
function injectText(inputEl: HTMLElement, text: string): void {
  inputEl.focus();

  if (inputEl.tagName === "TEXTAREA" || inputEl.tagName === "INPUT") {
    const tx = inputEl as HTMLTextAreaElement;
    originalPromptText = tx.value;
    tx.select();
    document.execCommand("insertText", false, text);

    // Dispatch React-compatible change events
    tx.dispatchEvent(new Event("input", { bubbles: true }));
    tx.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    // Contenteditable elements (Claude, Gemini, etc.)
    originalPromptText = inputEl.innerText;

    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(inputEl);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    document.execCommand("insertText", false, text);
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/**
 * Reads the current value from a text input or contenteditable element.
 */
function getPromptValue(inputEl: HTMLElement): string {
  if (inputEl.tagName === "TEXTAREA" || inputEl.tagName === "INPUT") {
    return (inputEl as HTMLTextAreaElement).value;
  }
  return inputEl.innerText || "";
}

/**
 * Sets up the chrome.runtime.onMessage listener for popup communication.
 * Only binds once to prevent duplicate listener leaks.
 */
function setupMessageListener(): void {
  if (messageListenerBound) return;
  messageListenerBound = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;
    // Re-query elements on every message to handle SPA navigation
    const siteConfig = getSiteConfig(window.location.hostname);
    if (!siteConfig) {
      sendResponse({ error: "Site not supported" });
      return true;
    }

    const inputEl = document.querySelector(siteConfig.inputSelector) as HTMLElement | null;

    if (message.action === "getSiteInfo") {
      sendResponse({ siteName: siteConfig.name });
    } else if (message.action === "getCurrentPrompt") {
      sendResponse({ text: inputEl ? getPromptValue(inputEl) : "" });
    } else if (message.action === "setPrompt" && inputEl) {
      injectText(inputEl, message.text);
      sendResponse({ success: true, original: originalPromptText });
    } else if (message.action === "restoreOriginal" && inputEl) {
      if (originalPromptText) {
        injectText(inputEl, originalPromptText);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "No original prompt saved" });
      }
    } else {
      sendResponse({ error: "Unknown action or missing input element" });
    }

    return true;
  });
}

/**
 * Performs local prompt optimization and updates the DOM.
 */
async function performOptimization(inputEl: HTMLElement, button?: HTMLButtonElement): Promise<void> {
  const rawText = getPromptValue(inputEl);
  if (!rawText.trim()) return;

  if (button) {
    setButtonContent(button, "Optimizing...");
    button.style.setProperty("transform", "scale(0.95)", "important");
  }

  isCurrentlyOptimizing = true;
  try {
    const settings = await getSettings();
    if (!settings.openRouterKey || !settings.openRouterKey.trim()) {
      if (button) {
        setButtonContent(button, "API Key Missing!", false);
        button.style.setProperty("border-color", "#ef4444", "important");
        button.style.setProperty("color", "#fca5a5", "important");
      }
      return;
    }

    const result = await optimizePrompt(rawText, settings);

    if (result.optimizedPrompt !== rawText) {
      injectText(inputEl, result.optimizedPrompt);
    }
    
    if (button) {
      setButtonContent(button, "Optimized! ✨");
      button.style.setProperty("border-color", "#10b981", "important");
      button.style.setProperty("color", "#a7f3d0", "important");
    }
  } catch (err: any) {
    if (button) {
      const errMsg = err?.message || "";
      const isFreeUnavailable = errMsg.toLowerCase().includes("unavailable for free") || errMsg.toLowerCase().includes("paid version");
      setButtonContent(button, isFreeUnavailable ? "Model Not Free - Check Settings" : "Error, try again", !isFreeUnavailable);
      button.style.setProperty("border-color", "#ef4444", "important");
      button.style.setProperty("color", "#fca5a5", "important");
    }
  } finally {
    isCurrentlyOptimizing = false;
    if (button) {
      setTimeout(() => {
        setButtonContent(button, "Optimize Prompt");
        button.style.removeProperty("border-color");
        button.style.removeProperty("color");
        button.style.setProperty("transform", "scale(1)", "important");
      }, 3000);
    }
  }
}

// Auto-optimization typing listener has been removed as we migrated to AI-powered manual trigger.

/**
 * Helper to find the "Add files" or "+" attachment button on the target LLM chat interface.
 */
function findAddFilesBtn(siteConfig: any): HTMLElement | null {
  if (siteConfig.addFilesSelector) {
    const btn = document.querySelector(siteConfig.addFilesSelector);
    if (btn) return btn as HTMLElement;
  }
  
  // Generic fallback selectors for file upload / attachment buttons
  const genericSelectors = [
    '[data-testid="composer-attach-button"]',
    'button[aria-label*="Attach"]',
    'button[aria-label*="Upload"]',
    'button[aria-label*="upload"]',
    'button[data-testid*="attach"]',
    'button[data-testid*="upload"]',
    'button:has(input[type="file"])',
    '[class*="upload-btn"]',
    'button:has(svg[class*="attachment"])'
  ];
  
  for (const selector of genericSelectors) {
    const btn = document.querySelector(selector);
    if (btn) return btn as HTMLElement;
  }
  
  return null;
}

function injectButton(inputEl: HTMLElement, sendBtn: HTMLElement, siteConfig: any): void {
  // Try to find the closest form or input wrapper to ensure we check globally for existing buttons
  const parentForm = inputEl.closest("form") || inputEl.parentElement;
  if (!parentForm) return;

  // Prevent multiple injections
  if (parentForm.querySelector(".optiprompt-btn")) return;

  const button = document.createElement("button");
  button.className = "optiprompt-btn";
  button.type = "button";
  setButtonContent(button, "Optimize Prompt");
  button.title = "Optimize prompt text offline";

  // Modern silver and matte black pill styling
  button.style.cssText = `
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 6px 12px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    border-radius: 9999px !important;
    background: #1a1a1a !important;
    border: 1px solid rgba(226, 232, 240, 0.25) !important;
    color: #e2e8f0 !important;
    cursor: pointer !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
    outline: none !important;
    user-select: none !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
    box-sizing: border-box !important;
    height: 32px !important;
  `;

  button.addEventListener("mouseenter", () => {
    button.style.setProperty("transform", "translateY(-1px) scale(1.02)", "important");
    button.style.setProperty("border-color", "rgba(226, 232, 240, 0.6)", "important");
    button.style.setProperty("color", "#ffffff", "important");
    button.style.setProperty("background", "#2a2a2a", "important");
    button.style.setProperty("box-shadow", "0 0 10px rgba(226, 232, 240, 0.2)", "important");
  });

  button.addEventListener("mouseleave", () => {
    button.style.setProperty("transform", "translateY(0) scale(1)", "important");
    button.style.setProperty("border-color", "rgba(226, 232, 240, 0.25)", "important");
    button.style.setProperty("color", "#e2e8f0", "important");
    button.style.setProperty("background", "#1a1a1a", "important");
    button.style.setProperty("box-shadow", "0 2px 6px rgba(0, 0, 0, 0.3)", "important");
  });

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    performOptimization(inputEl, button);
  });

  const addFilesBtn = findAddFilesBtn(siteConfig);

  if (addFilesBtn && addFilesBtn.parentNode) {
    // Positioning: Inlined exactly to the left of the "Add files" / "+" button
    button.style.setProperty("position", "static", "important");
    button.style.setProperty("margin-right", "8px", "important");
    addFilesBtn.parentNode.insertBefore(button, addFilesBtn);
  } else {
    // Fallback: Place absolutely top-right inside inputEl's parent container
    const container = inputEl.parentElement;
    if (container) {
      container.style.setProperty("position", "relative", "important");
      button.style.setProperty("position", "absolute", "important");
      button.style.setProperty("top", "8px", "important");
      button.style.setProperty("right", "12px", "important");
      container.appendChild(button);
    }
  }
}

/**
 * Initializes the content script: detects the site, observes DOM mutations,
 * injects the button, and binds listeners.
 */
function init(): void {
  const siteConfig = getSiteConfig(window.location.hostname);
  if (!siteConfig) return;

  // Bind message listener once at init (not per element detection)
  setupMessageListener();

  const checkElements = (): void => {
    const inputEl = document.querySelector(siteConfig.inputSelector) as HTMLElement | null;
    const sendBtn = document.querySelector(siteConfig.sendButtonSelector) as HTMLElement | null;

    if (inputEl && sendBtn) {
      injectButton(inputEl, sendBtn, siteConfig);
    }
  };

  // Initial check
  checkElements();

  // Observe DOM mutations for SPA navigation / lazy-loaded elements
  const observer = new MutationObserver(checkElements);
  observer.observe(document.body, { childList: true, subtree: true });

  // Cleanup on page unload to prevent memory leaks
  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  }, { once: true });
}

init();
