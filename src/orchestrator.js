import { getOpenAIResponse } from "./models/openai.js";
import { getClaudeResponse } from "./models/claude.js";
import { getGeminiResponse } from "./models/gemini.js";

/**
 * @typedef {Object} ModelResult
 * @property {string} model - Display name of the model (e.g. "OpenAI GPT-4o-mini").
 * @property {"fulfilled"|"rejected"} status
 * @property {string} [response] - Present when status is "fulfilled".
 * @property {string} [error] - Present when status is "rejected".
 */

const PROVIDERS = [
  { name: "OpenAI", fn: getOpenAIResponse },
  { name: "Claude", fn: getClaudeResponse },
  { name: "Gemini", fn: getGeminiResponse },
];

/**
 * Sends the same prompt to every configured model in parallel.
 * Failures in one model (missing key, network error, rate limit, etc.)
 * never block the others — each call is isolated via Promise.allSettled.
 *
 * @param {string} prompt
 * @returns {Promise<ModelResult[]>}
 */
export async function collectModelResponses(prompt) {
  const settled = await Promise.allSettled(
    PROVIDERS.map((provider) => provider.fn(prompt))
  );

  return settled.map((outcome, i) => {
    const providerName = PROVIDERS[i].name;
    if (outcome.status === "fulfilled") {
      return { model: providerName, status: "fulfilled", response: outcome.value };
    }
    return {
      model: providerName,
      status: "rejected",
      error: outcome.reason?.message || String(outcome.reason),
    };
  });
}
