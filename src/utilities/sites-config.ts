import type { SiteSelectorConfig } from "../types";

export const SUPPORTED_SITES: SiteSelectorConfig[] = [
  {
    name: "ChatGPT",
    hostnames: ["chatgpt.com", "chat.openai.com"],
    inputSelector: "#prompt-textarea",
    sendButtonSelector: '[data-testid="send-button"], button[data-testid="composer-send-button"]',
    addFilesSelector: '[data-testid="composer-attach-button"], button[aria-label*="Attach files"]',
    insertStrategy: "execCommand"
  },
  {
    name: "Claude",
    hostnames: ["claude.ai"],
    inputSelector: '[contenteditable="true"]',
    sendButtonSelector: 'button[aria-label="Send Message"], button:has(svg[fill="none"])',
    addFilesSelector: 'button[aria-label="Upload files"], button[aria-label*="upload"]',
    insertStrategy: "execCommand"
  },
  {
    name: "Gemini",
    hostnames: ["gemini.google.com"],
    inputSelector: '[contenteditable="true"]',
    sendButtonSelector: 'button[aria-label="Send message"]',
    addFilesSelector: 'button[aria-label="Upload image"], button[aria-label*="Upload"]',
    insertStrategy: "execCommand"
  },
  {
    name: "Grok",
    hostnames: ["grok.com", "x.ai"],
    inputSelector: 'textarea, [contenteditable="true"]',
    sendButtonSelector: 'button[type="submit"], button:has(svg)',
    addFilesSelector: 'button[aria-label*="Attach"], button[aria-label*="Upload"]',
    insertStrategy: "execCommand"
  },
  {
    name: "Perplexity",
    hostnames: ["perplexity.ai"],
    inputSelector: 'textarea',
    sendButtonSelector: 'button[type="submit"], button:has(svg)',
    addFilesSelector: 'button[aria-label*="Attach"], button[aria-label*="Upload"]',
    insertStrategy: "execCommand"
  },
  {
    name: "DeepSeek",
    hostnames: ["deepseek.com", "chat.deepseek.com"],
    inputSelector: 'textarea, #chat-input',
    sendButtonSelector: 'button[class*="send-btn"], button[class*="Send"]',
    addFilesSelector: 'button[class*="upload"], button[aria-label*="upload"]',
    insertStrategy: "execCommand"
  }
];

/**
 * Returns site configuration mapping if the hostname matches any supported AI websites.
 */
export function getSiteConfig(hostname: string): SiteSelectorConfig | null {
  const lowerHost = hostname.toLowerCase();
  for (const site of SUPPORTED_SITES) {
    if (site.hostnames.some((domain) => lowerHost.includes(domain))) {
      return site;
    }
  }
  return null;
}
