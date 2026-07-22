import Anthropic from "@anthropic-ai/sdk";


export async function getClaudeResponse(prompt, options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in your environment (.env file).");
  }

  const client = new Anthropic({ apiKey });
  const model = options.model || process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

  const message = await client.messages.create({
    model,
    max_tokens: options.maxTokens || 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude returned an empty response.");
  }
  return text;

}
