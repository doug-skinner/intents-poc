import { loadConfig } from "./config";
import { fetchClosedIssues, fetchMergedPRs } from "./github";
import { loadIntents, saveIntent } from "./intents";
import { matchIntent } from "./matcher";
import { printReport } from "./reporter";
import type { MatchResult } from "./types";

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("Usage: bun run src/index.ts <config.yml>");
    process.exit(1);
  }

  const config = await loadConfig(configPath);

  const token = process.env[config.github_token_env];
  if (!token) {
    throw new Error(`Environment variable ${config.github_token_env} is not set`);
  }

  const intents = await loadIntents(config.intents_dir);
  if (intents.length === 0) {
    throw new Error(`No intents found in ${config.intents_dir}`);
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch all GitHub activity in parallel
  const activityPromises = config.repos.flatMap((repo) => [
    fetchClosedIssues(repo, since, token),
    fetchMergedPRs(repo, since, token),
  ]);
  const allActivity = (await Promise.all(activityPromises)).flat();

  // Match each intent, tolerate individual failures
  const matchResults = await Promise.allSettled(
    intents.map((intent) => matchIntent(intent, allActivity))
  );

  const results = new Map<string, MatchResult | Error>();
  for (let i = 0; i < intents.length; i++) {
    const outcome = matchResults[i]!;
    if (outcome.status === "fulfilled") {
      results.set(intents[i]!.id, outcome.value);
    } else {
      results.set(intents[i]!.id, outcome.reason as Error);
    }
  }

  // Update intent files and collect successful matches
  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i]!;
    const result = results.get(intent.id);
    if (!result || result instanceof Error) {
      continue;
    }
    intent.status = result.status;
    intent.related = result.matched;
    await saveIntent(config.intents_dir, intent);
  }

  // Print report
  const date = new Date().toISOString().split("T")[0]!;
  printReport(intents, results, config.repos, allActivity.length, date);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});