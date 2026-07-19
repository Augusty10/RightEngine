import OpenAI from "openai";

/**
 * Calls the OpenAI Chat Completions API with the given prompt.
 * @param {string} prompt - The user's question/prompt.
 * @returns {Promise<string>} The model's text response.
 * @throws {Error} If the API key is missing or the request fails.
 */
export async function getOpenAIResponse(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in your environment (.env file).");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const text = completion.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }
  return text;
}
