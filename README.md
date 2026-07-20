# OptiPrompt ⚡

**OptiPrompt** is an AI-powered prompt compressor browser extension built with [Plasmo](https://www.plasmo.com/), React, and TypeScript. It integrates directly into popular AI chat platforms, letting you optimize and compress prompts on the fly using free-tier models on OpenRouter. By removing conversational filler, polite verbosity, and redundant phrases, it helps you significantly reduce token usage, lower API usage costs, and achieve faster response times without losing technical constraints or instructions.

---

## 🚀 Key Features

- **Contextual In-Page Injection**: Injects a custom silver-and-black pill button ("Optimize Prompt") directly into active chat forms, positioned next to the file attachment/upload button for seamless access.
- **Smart AI Compression**: Integrates with [OpenRouter](https://openrouter.ai/) APIs to compress prompts. It removes greetings ("hello", "please help"), duplicate phrases, and verbose patterns, keeping crucial code, technical terms, and rules intact.
- **Output Optimization Toggle**: Appends aggressive downstream instructions to your prompt, forcing the receiving LLM to respond concisely without unnecessary intros, explanations, or summaries.
- **17-Category Classifier**: Heuristically classifies prompts into categories like Coding, Math, Essay, Resume, Email, Translation, Summarization, and SEO using a fast keyword-based scoring dictionary in [src/rules/classifier.ts](https://github.com/in-Ayush/OptiPrompt/blob/main/src/rules/classifier.ts).
- **Prompt Quality Score (0–100)**: Evaluates prompts in real-time in [src/rules/score.ts](https://github.com/in-Ayush/OptiPrompt/blob/main/src/rules/score.ts) against metrics like filler word count, verbosity, readability, double punctuation, duplicate words, and tech-term capitalization (e.g., correcting `react hooks` to `React Hooks`).
- **Offline Token Estimator**: Predicts token counts and potential savings offline using a character-length and punctuation-sensitive heuristic in [src/utilities/token-estimator.ts](https://github.com/in-Ayush/OptiPrompt/blob/main/src/utilities/token-estimator.ts).
- **Robust Fallbacks & Safeguards**:
  - Automatically falls back to `Auto (OpenRouter Free)` if a selected free model (like Gemini Flash Free or DeepSeek R1 Free) goes offline or experiences severe rate limits.
  - Prevents accidental paid API usage by blocking requests targeting paid models when configured on presets.

---

## 🛠️ Supported AI Platforms

OptiPrompt auto-injects optimization components into the following chat interfaces:
1. **ChatGPT** (chatgpt.com / chat.openai.com)
2. **Claude** (claude.ai)
3. **Gemini** (gemini.google.com)

---

## 📂 Project Architecture

Here is the directory structure and main files of the extension:

```
OptiPrompt/
├── package.json                   # Project scripts and dependencies
├── postcss.config.js              # Tailwind integration config
├── tailwind.config.js             # Tailwind CSS tokens
├── tsconfig.json                  # TypeScript configurations
├── test-optimizer.ts              # Command-line test suite and Chrome mock
├── src/
│   ├── background.ts              # Background service worker; handles OpenRouter API calls, fallbacks, and settings storage
│   ├── popup.tsx                  # Popup interface (dashboard, score gauge, optimization history, settings panel)
│   ├── style.css                  # Tailwinds CSS directive file
│   ├── assets/                    # Project brand assets and logos
│   ├── components/                # Reusable React components for the popup UI
│   │   ├── MetricCard.tsx         # Cards for displaying token counts, savings percentage, and prompt category
│   │   ├── ScoreGauge.tsx         # Ring gauge visualizing prompt quality score (0-100)
│   │   └── SettingsPanel.tsx      # OpenRouter API configurations and toggle sliders
│   ├── contents/
│   │   └── injector.ts            # Content script that injects "Optimize Prompt" button and communicates with popup
│   ├── hooks/
│   │   └── useSettings.ts         # Hook to load/save settings reactive state
│   ├── optimizer/
│   │   └── index.ts               # Exposes optimization interface communicating with the background script
│   ├── rules/
│   │   ├── classifier.ts          # Regular expression based multi-category classification
│   │   └── score.ts               # Local heuristic calculation for the quality score
│   ├── storage/
│   │   └── settings.ts            # Chrome storage API utility wrapper with localStorage fallback
│   ├── types/
│   │   └── index.ts               # Shared interfaces, typings, and configuration shapes
│   └── utilities/
│       ├── helpers.ts             # Regex escaping helpers
│       ├── sites-config.ts        # DOM selector maps for ChatGPT, Claude, Gemini, etc.
│       └── token-estimator.ts     # Character/punctuation token estimation heuristics
```

---

## 📊 Core Algorithms & Logic

### 1. Classification Heuristics
Located in [src/rules/classifier.ts](https://github.com/in-Ayush/OptiPrompt/blob/main/src/rules/classifier.ts). It matches word boundaries against a dictionary of 17 topics:
- **Coding**: Matches `react`, `hooks`, `typescript`, `nextjs`, etc.
- **Debugging**: Matches `bug`, `stack trace`, `broken`, `crash`, `error`, etc.
- **Email**: Matches `outreach`, `inbox`, `subject line`, `salutation`, etc.
- If no keyword score exceeds zero, the prompt defaults to `General`.

### 2. Prompt Quality Score
Located in [src/rules/score.ts](https://github.com/in-Ayush/OptiPrompt/blob/main/src/rules/score.ts). Starting from a baseline score of `70`, the algorithm applies the following modifications:
- **Filler Word Deduction** (up to `-25`): Deducts `5` points for each occurrence of expressions like `"would you please"`, `"help me"`, `"kindly"`, etc.
- **Verbosity Deduction** (up to `-20`): Deducts `5` points for redundant phrases like `"provide an explanation of"`, `"at the present moment in time"`, `"in order to"`, etc.
- **Formatting Deductions** (up to `-20`): Penalizes duplicate adjacent words (e.g. `write write`), consecutive spaces, and excessive punctuation (e.g. `!!??`).
- **Capitalization Checks** (up to `-15`): Penalizes uncapitalized technology names (e.g. matches `javascript` instead of `JavaScript`, `tailwindcss` instead of `Tailwind CSS`).
- **Sentence Length Deductions** (up to `-24`): Deducts `8` points per sentence exceeding 35 words.
- **Structure Bonus** (`+10`): Adds points for list formatting (bullet points, numbered lists).
- **Length Adjustments**: Deducts `15` points for extremely short text (<15 characters); awards `+5` points for standard length text (50-500 characters).

### 3. Token Estimation
Located in [src/utilities/token-estimator.ts](https://github.com/in-Ayush/OptiPrompt/blob/main/src/utilities/token-estimator.ts). Since full BPE tokenizer libraries are too heavy to run offline inside a lightweight extension, OptiPrompt uses a standard word-length heuristic:
- Punctuation characters count as individual tokens.
- Words are split by whitespace/punctuation, and each word counts as `Math.ceil(word_length / 4)` tokens.

---

## 🔧 Installation & Local Development

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/in-Ayush/OptiPrompt.git
   cd OptiPrompt
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the hot-reloading development server:
   ```bash
   npm run dev
   ```
   This compiles the extension into the `build/chrome-mv3-dev/` directory.

4. Install the extension in your browser (Chrome / Brave / Edge / Opera):
   - Open your browser and navigate to `chrome://extensions/`.
   - Enable **Developer mode** (toggle in top-right corner).
   - Click **Load unpacked** (top-left button).
   - Select the `build/chrome-mv3-dev` directory.

---

## 📦 Production Bundling

To bundle the extension for release:
- **Build the extension**:
  ```bash
  npm run build
  ```
  This creates a production-ready, minified build under the `build/chrome-mv3-prod/` directory.
- **Package as a zip file**:
  ```bash
  npm run package
  ```
  This zips the production build into the `build/` directory, ready to upload to the Chrome Web Store.

---

## 🧪 Running Tests

The test suite validates prompt classification, quality scoring, fallback behaviors, and output optimization configurations. It can run in offline mock mode or online against actual OpenRouter endpoints.

To run the tests:
1. (Optional) Provide your API key for online test validations:
   ```bash
   $env:OPENROUTER_API_KEY="your-key-here"  # PowerShell
   # Or on command prompt: set OPENROUTER_API_KEY="your-key-here"
   ```
2. Run the test script:
   ```bash
   npx ts-node test-optimizer.ts
   ```

---

## 📄 License & Commercial Restrictions

This project is licensed under the **PolyForm Noncommercial License 1.0.0**. This means you are free to download, modify, and run the extension for personal, educational, and research purposes. However, **commercial exploitation, redistribution in proprietary software, or reselling of this extension is strictly prohibited.**

For more details, see the [LICENSE](https://github.com/in-Ayush/OptiPrompt/blob/main/LICENSE) file.
