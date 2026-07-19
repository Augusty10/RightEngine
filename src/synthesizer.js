import { getOpenAIResponse} from "./models/openai.js";


/**
 * Builds the evaluator prompt that asks the synthesizer model to compare
 * multiple candidate answers and produce one refined final answer.
 *
 * @param {string} originalPrompt
 * @param {{model: string, response: string}[]} successfulResults - only fulfilled results
 * @returns {string}
 */

function buildSynthesisPrompt(originalPrompt, successfulResults) {
  const candidateBlock = successfulResults
    .map((r, i) => `--- Candidate Answer ${i + 1} (from ${r.model}) ---\n${r.response}`)
    .join("\n\n");

  return `You are acting as a careful evaluator in a self-consistency pipeline. The same question was sent independently to ${successfulResults.length} different AI models. Your job is NOT to pick one of their answers verbatim — it is to reason across all of them and produce a single, best possible final answer.

Original question:
"${originalPrompt}"

Candidate answers:

${candidateBlock}

Instructions:
1. Briefly note where the candidates agree (this signals reliable, consistent information).
2. Briefly note where they disagree or where one candidate is stronger, more accurate, more complete, or more clearly explained than the others.
3. Synthesize a final answer that combines the strongest parts of each candidate, corrects any errors you can identify, and resolves disagreements using your own best judgment.
4. The final answer should read as a standalone, polished response to the original question — not a comparison report.

Format your reply with exactly these two sections, using these headers:

## Comparison Notes
(short bullet points on agreement/disagreement/strengths/weaknesses)

## Final Synthesized Answer
(the polished, standalone final answer to the original question)`;
}

/**
 * Sends all successful candidate answers to the synthesizer model (Claude by
 * default) and returns its structured comparison + final answer.
 *
 * @param {string} originalPrompt
 * @param {{model: string, response: string}[]} successfulResults
 * @returns {Promise<string>} raw synthesizer output containing both sections
 */
export async function synthesizeFinalAnswer(originalPrompt, successfulResults) {
  if (successfulResults.length === 0) {
    throw new Error("No successful model responses were available to synthesize.");
  }

  // If only one model succeeded, there's nothing to compare — still run it
  // through the synthesizer so the user gets a consistently formatted answer,
  // but note the limitation explicitly rather than pretending to compare.
  const synthesizerModel = process.env.SYNTHESIZER_MODEL || process.env.OPENAI_MODEL;

  const prompt = buildSynthesisPrompt(originalPrompt, successfulResults);
  return getOpenAIResponse(prompt, { model: synthesizerModel, maxTokens: 1536 });
}
