import chalk from "chalk";

const WIDTH = 78;

export function divider(char = "─") {
  return chalk.gray(char.repeat(WIDTH));
}

export function sectionHeader(title) {
  return `\n${chalk.bold.cyan(title)}\n${divider()}`;
}

export function printModelResult(result) {
  if (result.status === "fulfilled") {
    console.log(chalk.bold.green(`\n✔ ${result.model}`));
    console.log(chalk.gray(divider("·")));
    console.log(result.response);
  } else {
    console.log(chalk.bold.red(`\n✘ ${result.model} (failed)`));
    console.log(chalk.gray(divider("·")));
    console.log(chalk.red(result.error));
  }
}

export function printFinalAnswer(synthesizedText) {
  console.log(sectionHeader("🏆 FINAL SYNTHESIZED ANSWER"));
  console.log(synthesizedText);
  console.log(divider());
}
