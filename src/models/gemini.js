import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Calls the Google Gemini API with the given prompt.
 * @param {string} prompt - The user's question/prompt.
 * @returns {Promise<string>} The model's text response.
 * @throws {Error} If the API key is missing or the request fails.
 */

export async function getGeminiResponse(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in your environment (.env file).");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent(prompt);
  const text = result.response?.text()?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}
