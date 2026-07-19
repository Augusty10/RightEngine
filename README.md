# Self-Consistency Multi-Model AI CLI

A CLI tool that implements the **self-consistency** technique for GenAI apps:
the same prompt is sent to multiple independent models (OpenAI, Claude,
Gemini), and a final evaluator model (Claude) compares all the answers and
writes a single, refined final response — rather than just returning one
model's raw output.

```
User prompt
    │
    ├──► OpenAI  ──┐
    ├──► Claude  ──┼──► (parallel, isolated failures) ──► Claude (evaluator)
    └──► Gemini  ──┘                                          │
                                                                ▼
                                                     Synthesized final answer
```

## Features

- **Parallel orchestration** — all three models are called concurrently with
  `Promise.allSettled`, so one slow/failed call never blocks the others.
- **Graceful degradation** — if a provider's API key is missing or a call
  fails, that model is skipped and clearly marked as failed; synthesis
  proceeds with whatever succeeded (as long as at least one model responds).
- **True synthesis, not selection** — the evaluator prompt explicitly asks
  Claude to compare agreement/disagreement across candidates and produce a
  new answer that combines the strongest parts, not to copy one candidate.
- **Clear CLI output** — spinners while waiting, color-coded per-model
  results, and a distinct "Final Synthesized Answer" section.
- **Configurable models** — override any model ID via `.env` without touching
  code.

## Project structure

```
self-consistency-cli/
├── src/
│   ├── index.js          # CLI entry point (input loop, spinners, output)
│   ├── orchestrator.js    # Fans prompt out to all 3 models, isolates errors
│   ├── synthesizer.js     # Builds the evaluator prompt, calls Claude
│   ├── models/
│   │   ├── openai.js      # OpenAI Chat Completions wrapper
│   │   ├── claude.js      # Anthropic Messages API wrapper
│   │   └── gemini.js      # Google Gemini wrapper
│   └── utils/
│       └── format.js      # Terminal output formatting helpers
├── package.json
├── .env.example
├── Dockerfile
└── README.md
```

## Setup

**Requirements:** Node.js 18+

```bash
cd self-consistency-cli
npm install
cp .env.example .env
```

Edit `.env` and add whichever API keys you have. You don't need all three —
the app will run with any subset (skipping providers with no key), but you
need **at least one** key configured, and for a meaningful synthesis step you
need `ANTHROPIC_API_KEY` set (Claude is the default evaluator).

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

## Running locally

```bash
npm start
```

You'll be prompted to enter a question. The app will:

1. Show which providers are active based on your `.env`.
2. Query all configured models in parallel (with a loading spinner).
3. Print each model's raw response, labeled and color-coded (green = success,
   red = failed with the error message).
4. Send all successful responses to Claude for comparison and synthesis.
5. Print the final synthesized answer.

Type `exit` at the prompt to quit.

### Run it globally as a command

```bash
npm link
self-consistency
```

## Deployment

This is a CLI tool, so "deploying" it means making it runnable somewhere
other than your own machine. Two supported paths:

### Option A — Docker (recommended for servers / CI)

```bash
docker build -t self-consistency-cli .
docker run -it --env-file .env self-consistency-cli
```

This packages the app and its dependencies into an image; only the API keys
are supplied at runtime via `--env-file`, so no secrets are baked into the
image.

### Option B — npm package / GitHub

Push this project to a GitHub repository, then anyone can install and run it
with:

```bash
git clone <your-repo-url>
cd self-consistency-cli
npm install
cp .env.example .env   # add your own keys
npm start
```

If you want it installable via `npx` without cloning, publish it to npm
(`npm publish`, after picking a unique package name), then run:

```bash
npx self-consistency-cli
```

## Error handling notes

- Missing API key for a provider → that provider is skipped with a clear
  warning; other providers still run.
- A provider's API call throwing (rate limit, network error, invalid model
  ID, etc.) → caught individually via `Promise.allSettled`, shown as a failed
  result, doesn't crash the app.
- All providers fail → the app tells you to check your `.env` and does not
  attempt synthesis (since there's nothing to synthesize).
- Synthesis step itself fails (e.g. Claude key missing/invalid) → the app
  falls back to showing the individual raw responses already printed, with a
  clear message that synthesis could not be completed.

## Extending

- **Add another model**: create `src/models/<provider>.js` exporting an
  async `getXResponse(prompt)` function, then add it to the `PROVIDERS` array
  in `src/orchestrator.js`.
- **Change the evaluator model**: set `SYNTHESIZER_MODEL` in `.env`, or swap
  `getClaudeResponse` in `src/synthesizer.js` for a different provider's
  wrapper if you'd rather use OpenAI or Gemini as the judge.
- **Multiple samples per model (classic self-consistency)**: call each
  provider's function N times with a non-zero temperature and pass all N×3
  responses into the synthesizer instead of just 3 — the synthesizer prompt
  already scales to any number of candidates.
