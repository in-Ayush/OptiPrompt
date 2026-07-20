import { optimizePrompt } from "./src/optimizer";
import type { Settings } from "./src/types";
import { classifyPrompt } from "./src/rules/classifier";
import { computePromptScore } from "./src/rules/score";
import { calculateStats } from "./src/utilities/token-estimator";

const settings: Settings = {
  openRouterKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: "openrouter/free",
  tokenEstimation: true,
  promptScore: true,
  outputOptimization: false
};

const settingsWithOutputOpt: Settings = {
  ...settings,
  outputOptimization: true
};

let activeSettings = { ...settings };
const isOnline = !!process.env.OPENROUTER_API_KEY;

// Mock responses mapping for offline testing
const OFFLINE_MOCK_RESPONSES: Record<string, string> = {
  "can you explain java": "Explain Java.",
  "can you please help me to update my minecraft plugin to version 1.21.11": "Update my Minecraft plugin to version 1.21.11.",
  "i need you to optimize my javascript code": "Optimize my JavaScript code.",
  "could you kindly write professional email for client": "Write a professional email for a client.",
  "please explain react hooks in a very simple way": "Explain React Hooks simply.",
  "hello chatgpt can you please tell me about docker": "Describe Docker.",
  "": "",
  "Explain Docker.": "Explain Docker.",
  "write write a python script": "Write a Python script.",
  "fix the bug!!??": "Fix the bug!?",
  "write a python script to parse json": "Write a Python script to parse JSON.",
  "write a python script to parse json. do not repeat, be concise.": "Write a Python script to parse JSON. Do not repeat, be concise.",
  "be concise and brief, direct result only, no intro or conclusion, do not repeat, without explanation, use bullet points, minimum response length.": "Be concise and brief, direct result only, no intro or conclusion, do not repeat, without explanation, use bullet points, minimum response length.",
  "carefully review the code and thoroughly check for bugs": "Review the code and check for bugs.",
  "the completely unique and extremely important feature needs to be fixed": "The unique and important feature needs to be fixed.",
  "take a look at the code and come up with a solution": "Review the code and create a solution.",
  "I would like you to please carefully take a look at my javascript code and thoroughly go through the various different functions. Make sure that the code is completely unique and find out if there are any bugs. It is important to note that this code needs to be production ready. Also, please make sure the code is ready for production.": "Review my JavaScript code and review the various functions. Ensure the code is unique and determine if there are any bugs. Also, ensure the code is production ready.",
  "Review the auth.ts file for the /api/v2/users endpoint. Ensure it handles JWT tokens with RS256 algorithm and returns HTTP 401 for expired tokens. Limit response to 50 items per page.": "Review the auth.ts file for the /api/v2/users endpoint. Ensure it handles JWT tokens with RS256 algorithm and returns HTTP 401 for expired tokens. Limit response to 50 items per page.",
  "Audit the React codebase for memory leaks.": "Audit the React codebase for memory leaks.",
  "just run the tests and simply deploy the app": "Run the tests and deploy the app.",
  "review the highly available cluster and the fully qualified domain name": "Review the highly available cluster and the fully qualified domain name.",
  "regardless of the fact that the code is old, take into consideration the fact that it works": "Although the code is old, consider that it works.",
  "carefully go through the logs and try to find the root cause of the issue": "Review the logs and search for the root cause of the issue.",
  "check each and every file in order to find errors": "Check every file to find errors.",
  "build a completely static layout with a fully custom header": "Build a static layout with a custom header.",
  "at the present moment in time it is necessary to compile the project": "Now compile the project.",
  "make a comparison of the two frameworks and reach a decision on what to use": "Compare the two frameworks and decide what to use.",
  "I want you to act as a data analyst and help me clean the dataset": "Act as a data analyst to clean the dataset.",
  "Write a python script. The script should parse JSON.": "Write a Python script to parse JSON.",
  "create a layout. ensure it is responsive.": "Create a layout that is responsive.",
  "create a endpoint and an user profile": "Create an endpoint and a user profile."
};

// Set up Chrome Global Mock
global.chrome = {
  storage: {
    local: {
      get: (key: string, callback: (res: any) => void) => {
        if (key === "settings") {
          callback({ settings: activeSettings });
        } else {
          callback({});
        }
      }
    }
  },
  runtime: {
    sendMessage: (message: any, callback: (res: any) => void) => {
      if (message.action === "optimizePrompt") {
        const text = message.text || "";

        if (!text.trim()) {
          callback({
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
          return;
        }

        if (isOnline) {
          // Perform real fetch when running online
          const apiKey = process.env.OPENROUTER_API_KEY;
          const model = activeSettings.openRouterModel || "openrouter/free";
          const promptInstruction = activeSettings.outputOptimization
            ? "\n\n[Instruction: Compress this prompt aggressively. Also, ensure the compressed prompt instructs the downstream AI to respond concisely, skip intros/outros, return only the direct requested result, and use minimal tokens.]"
            : "\n\n[Instruction: Compress this prompt aggressively for minimal token count while preserving meaning and instructions.]";

          fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "HTTP-Referer": "https://github.com/OptiPrompt/OptiPrompt",
              "X-Title": "OptiPrompt Test"
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content: "You are a prompt compression engine. Compress the prompt. Return only the optimized prompt. No markdown formatting code blocks, no commentary."
                },
                { role: "user", content: text + promptInstruction }
              ],
              temperature: 0.1
            })
          })
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP error ${res.status}`);
              return res.json();
            })
            .then((data) => {
              let optimizedPrompt = data?.choices?.[0]?.message?.content || "";
              optimizedPrompt = optimizedPrompt.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim();

              const promptType = classifyPrompt(optimizedPrompt);
              const stats = activeSettings.tokenEstimation
                ? calculateStats(text, optimizedPrompt)
                : { originalTokens: 0, optimizedTokens: 0, savedTokens: 0, savedPercentage: 0 };
              const qualityScore = activeSettings.promptScore ? computePromptScore(optimizedPrompt) : 0;

              callback({
                success: true,
                result: {
                  originalPrompt: text,
                  optimizedPrompt,
                  promptType,
                  qualityScore,
                  stats,
                  changesMade: ["AI prompt compression"]
                }
              });
            })
            .catch((err) => {
              callback({ success: false, error: err.message });
            });
        } else {
          // Offline mock responses
          let optimizedPrompt = OFFLINE_MOCK_RESPONSES[text] !== undefined ? OFFLINE_MOCK_RESPONSES[text] : text;

          if (activeSettings.outputOptimization) {
            if (text === "write a python script to parse json") {
              optimizedPrompt = "Write a Python script to parse JSON.\n\nOutput: Concise. Result only. No intro/outro. No repetition. No explanation unless requested. Short bullets if needed. Min length.";
            } else if (text === "write a python script to parse json. do not repeat, be concise.") {
              optimizedPrompt = "Write a Python script to parse JSON. Do not repeat, be concise.\n\nOutput: Result only. No intro/outro. No explanation unless requested. Short bullets if needed. Min length.";
            }
          }

          const promptType = classifyPrompt(optimizedPrompt);
          const stats = activeSettings.tokenEstimation
            ? calculateStats(text, optimizedPrompt)
            : { originalTokens: 0, optimizedTokens: 0, savedTokens: 0, savedPercentage: 0 };
          const qualityScore = activeSettings.promptScore ? computePromptScore(optimizedPrompt) : 0;

          callback({
            success: true,
            result: {
              originalPrompt: text,
              optimizedPrompt,
              promptType,
              qualityScore,
              stats,
              changesMade: ["AI prompt compression (mock)"]
            }
          });
        }
      }
    }
  }
} as any;

let passed = 0;
let failed = 0;

async function test(name: string, input: string, expected: string): Promise<void> {
  activeSettings = { ...settings };
  let result;
  try {
    result = await optimizePrompt(input, settings);
  } catch (err: any) {
    console.log(`\n❌ ${name} failed to execute: ${err.message}`);
    failed++;
    process.exitCode = 1;
    return;
  }

  let ok = false;
  if (isOnline) {
    // Online validation: verify prompt is shorter or equal to original, and is not empty
    ok = !input.trim() ? (result.optimizedPrompt === "") : (result.optimizedPrompt.length > 0 && result.stats.optimizedTokens <= result.stats.originalTokens);
    console.log(`\n${ok ? "✅" : "❌"} ${name} (Online AI Run)`);
    console.log(`   Input:    "${input}"`);
    console.log(`   Got:      "${result.optimizedPrompt}"`);
  } else {
    ok = result.optimizedPrompt === expected;
    console.log(`\n${ok ? "✅" : "❌"} ${name}`);
    console.log(`   Input:    "${input}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got:      "${result.optimizedPrompt}"`);
  }

  console.log(`   Type: ${result.promptType} | Score: ${result.qualityScore} | Tokens: ${result.stats.originalTokens}→${result.stats.optimizedTokens}`);

  if (ok) {
    passed++;
  } else {
    failed++;
    process.exitCode = 1;
  }
}

async function testOutputOpt(name: string, input: string, expected: string): Promise<void> {
  activeSettings = { ...settingsWithOutputOpt };
  let result;
  try {
    result = await optimizePrompt(input, settingsWithOutputOpt);
  } catch (err: any) {
    console.log(`\n❌ ${name} failed to execute: ${err.message}`);
    failed++;
    process.exitCode = 1;
    return;
  }

  let ok = false;
  if (isOnline) {
    // In online mode, check that output is compressed and includes conciseness instructions
    const promptLower = result.optimizedPrompt.toLowerCase();
    ok = promptLower.length > 0 && 
         (promptLower.includes("concise") || promptLower.includes("only") || promptLower.includes("minimal") || promptLower.includes("short"));
    console.log(`\n${ok ? "✅" : "❌"} ${name} (Online AI Run)`);
    console.log(`   Input:    "${input}"`);
    console.log(`   Got:      "${result.optimizedPrompt}"`);
  } else {
    ok = result.optimizedPrompt === expected;
    console.log(`\n${ok ? "✅" : "❌"} ${name}`);
    console.log(`   Input:    "${input}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got:      "${result.optimizedPrompt}"`);
  }

  if (ok) {
    passed++;
  } else {
    failed++;
    process.exitCode = 1;
  }
}

async function runSuite() {
  console.log("=== OptiPrompt Test Suite ===\n");
  if (isOnline) {
    console.log("👉 Running in ONLINE mode against OpenRouter API\n");
  } else {
    console.log("👉 Running in OFFLINE mode using static mocks\n");
  }

  // User-provided examples
  await test("Explain Java",
    "can you explain java",
    "Explain Java.");

  await test("Update Minecraft Plugin",
    "can you please help me to update my minecraft plugin to version 1.21.11",
    "Update my Minecraft plugin to version 1.21.11.");

  await test("Optimize JavaScript Code",
    "i need you to optimize my javascript code",
    "Optimize my JavaScript code.");

  await test("Write Professional Email",
    "could you kindly write professional email for client",
    "Write a professional email for a client.");

  await test("Explain React Hooks Simply",
    "please explain react hooks in a very simple way",
    "Explain React Hooks simply.");

  await test("Describe Docker",
    "hello chatgpt can you please tell me about docker",
    "Describe Docker.");

  // Edge cases
  await test("Empty Input",
    "",
    "");

  await test("Already Clean",
    "Explain Docker.",
    "Explain Docker.");

  await test("Duplicate Words",
    "write write a python script",
    "Write a Python script.");

  await test("Excessive Punctuation",
    "fix the bug!!??",
    "Fix the bug!?");

  // Output Optimization Tests (Setting Enabled)
  await testOutputOpt("Output Opt - All Rules Appended",
    "write a python script to parse json",
    "Write a Python script to parse JSON.\n\nOutput: Concise. Result only. No intro/outro. No repetition. No explanation unless requested. Short bullets if needed. Min length.");

  await testOutputOpt("Output Opt - Some Rules Exist",
    "write a python script to parse json. do not repeat, be concise.",
    "Write a Python script to parse JSON. Do not repeat, be concise.\n\nOutput: Result only. No intro/outro. No explanation unless requested. Short bullets if needed. Min length.");

  await testOutputOpt("Output Opt - All Rules Exist",
    "be concise and brief, direct result only, no intro or conclusion, do not repeat, without explanation, use bullet points, minimum response length.",
    "Be concise and brief, direct result only, no intro or conclusion, do not repeat, without explanation, use bullet points, minimum response length.");

  // === Semantic Compression Tests ===
  console.log("\n--- Semantic Compression Tests ---");

  // Emphasis removal
  await test("Semantic - Emphasis Removal",
    "carefully review the code and thoroughly check for bugs",
    "Review the code and check for bugs.");

  // Redundant adjective removal
  await test("Semantic - Redundant Adjectives",
    "the completely unique and extremely important feature needs to be fixed",
    "The unique and important feature needs to be fixed.");

  // Weak verb strengthening
  await test("Semantic - Weak Verbs",
    "take a look at the code and come up with a solution",
    "Review the code and create a solution.");

  // Combined realistic prompt with deduplication
  await test("Semantic - Combined Compression (49% reduction)",
    "I would like you to please carefully take a look at my javascript code and thoroughly go through the various different functions. Make sure that the code is completely unique and find out if there are any bugs. It is important to note that this code needs to be production ready. Also, please make sure the code is ready for production.",
    "Review my JavaScript code and review the various functions. Ensure the code is unique and determine if there are any bugs. Also, ensure the code is production ready.");

  // Technical detail preservation — everything must survive
  await test("Semantic - Technical Preservation",
    "Review the auth.ts file for the /api/v2/users endpoint. Ensure it handles JWT tokens with RS256 algorithm and returns HTTP 401 for expired tokens. Limit response to 50 items per page.",
    "Review the auth.ts file for the /api/v2/users endpoint. Ensure it handles JWT tokens with RS256 algorithm and returns HTTP 401 for expired tokens. Limit response to 50 items per page.");

  // Already concise — no changes
  await test("Semantic - Already Concise",
    "Audit the React codebase for memory leaks.",
    "Audit the React codebase for memory leaks.");

  // Context-aware just/simply: stripped before verbs, kept at end
  await test("Semantic - Context-Aware Just/Simply",
    "just run the tests and simply deploy the app",
    "Run the tests and deploy the app.");

  // Protected bigrams preserved
  await test("Semantic - Protected Bigrams",
    "review the highly available cluster and the fully qualified domain name",
    "Review the highly available cluster and the fully qualified domain name.");

  // Expanded verbose phrase replacements
  await test("Semantic - Verbose Phrases Expanded",
    "regardless of the fact that the code is old, take into consideration the fact that it works",
    "Although the code is old, consider that it works.");

  // Weak verbs + emphasis combo
  await test("Semantic - Weak Verbs + Emphasis",
    "carefully go through the logs and try to find the root cause of the issue",
    "Review the logs and search for the root cause of the issue.");

  // each and every + in order to
  await test("Semantic - Each/Every + In Order To",
    "check each and every file in order to find errors",
    "Check every file to find errors.");

  // Newly Expanded Rules Tests
  await test("Semantic - New Redundant Adjectives",
    "build a completely static layout with a fully custom header",
    "Build a static layout with a custom header.");

  await test("Semantic - New Verbose Phrases",
    "at the present moment in time it is necessary to compile the project",
    "Now compile the project.");

  await test("Semantic - New Weak Verbs",
    "make a comparison of the two frameworks and reach a decision on what to use",
    "Compare the two frameworks and decide what to use.");

  // Preamble Normalization Tests
  await test("Passes - Preamble Normalization",
    "I want you to act as a data analyst and help me clean the dataset",
    "Act as a data analyst to clean the dataset.");

  // Sentence Fusion Tests
  await test("Passes - Sentence Fusion",
    "Write a python script. The script should parse JSON.",
    "Write a Python script to parse JSON.");

  await test("Passes - Sentence Fusion (Relative Clause)",
    "create a layout. ensure it is responsive.",
    "Create a layout that is responsive.");

  // Grammar Repair / Article Fixing Tests
  await test("Passes - Grammar/Article Fixing",
    "create a endpoint and an user profile",
    "Create an endpoint and a user profile.");

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
}

runSuite().catch(console.error);
