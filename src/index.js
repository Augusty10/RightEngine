#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

import { collectModelResponses } from "./orchestrator.js";
import { synthesizeFinalAnswer } from "./synthesizer.js";
import { sectionHeader, divider, printModelResult, printFinalAnswer } from "./utils/format.js";

function printBanner() {
  console.log(chalk.bold.magenta("\n=================================================="));
  console.log(chalk.bold.magenta("  Self-Consistency Multi-Model AI CLI"));
  console.log(chalk.bold.magenta("  OpenAI + Claude + Gemini -> synthesized answer"));
  console.log(chalk.bold.magenta("==================================================\n"));
}

function checkConfiguredProviders() {
  const configured = [];
  const missing = [];
  if (process.env.OPENAI_API_KEY) configured.push("OpenAI"); else missing.push("OpenAI (OPENAI_API_KEY)");
  if (process.env.ANTHROPIC_API_KEY) configured.push("Claude"); else missing.push("Claude (ANTHROPIC_API_KEY)");
  if (process.env.GEMINI_API_KEY) configured.push("Gemini"); else missing.push("Gemini (GEMINI_API_KEY)");
  return { configured, missing };
}

async function runOnce(prompt) {
  const spinner = ora({
    text: "Querying OpenAI, Claude, and Gemini in parallel...",
    color: "cyan",
  }).start();

  let results;
  try {
    results = await collectModelResponses(prompt);
  } catch (err) {
    spinner.fail("Unexpected orchestration error.");
    console.log(chalk.red(err.message));
    return;
  }
  spinner.succeed("Received responses from all configured models.");

  console.log(sectionHeader("📋 INDIVIDUAL MODEL RESPONSES"));
  results.forEach(printModelResult);

  const successful = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => ({ model: r.model, response: r.response }));

  if (successful.length === 0) {
    console.log(chalk.bold.red("\nAll model calls failed — nothing to synthesize."));
    console.log(chalk.yellow("Check your API keys in .env and try again."));
    return;
  }

  const synthSpinner = ora({
    text: "Synthesizing the best final answer from all candidates...",
    color: "yellow",
  }).start();

  try {
    const finalAnswer = await synthesizeFinalAnswer(prompt, successful);
    synthSpinner.succeed("Synthesis complete.");
    printFinalAnswer(finalAnswer);
  } catch (err) {
    synthSpinner.fail("Synthesis step failed.");
    console.log(chalk.red(err.message));
    console.log(
      chalk.yellow(
        "\nFalling back: showing the individual responses above is the best available output."
      )
    );
  }
}

async function main() {
  printBanner();

  const { configured, missing } = checkConfiguredProviders();
  if (missing.length > 0) {
    console.log(chalk.yellow(`⚠ Not configured: ${missing.join(", ")}`));
  }
  if (configured.length === 0) {
    console.log(
      chalk.red(
        "\nNo API keys are configured. Copy .env.example to .env and add at least one key.\n"
      )
    );
    process.exit(1);
  }
  console.log(chalk.green(`✔ Active models: ${configured.join(", ")}\n`));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { prompt } = await inquirer.prompt([
      {
        type: "input",
        name: "prompt",
        message: chalk.bold("Enter your question (or type 'exit' to quit):"),
        validate: (val) => (val.trim().length > 0 ? true : "Please enter a question."),
      },
    ]);

    if (prompt.trim().toLowerCase() === "exit") {
      console.log(chalk.cyan("\nGoodbye!\n"));
      break;
    }

    console.log(divider());
    await runOnce(prompt.trim());
    console.log("\n");
  }
}

main().catch((err) => {
  console.error(chalk.red("\nFatal error:"), err);
  process.exit(1);
});
