import type { Intent, MatchResult } from "./types";

export function printReport(
  intents: Intent[],
  results: Map<string, MatchResult | Error>,
  repos: string[],
  totalActivity: number,
  date: string
): void {
  console.log(`\n=== Intent Report — ${date} ===`);
  console.log(`Scanning: ${repos.join(", ")}`);
  console.log(`Activity window: last 7 days (${totalActivity} items total)\n`);

  for (const intent of intents) {
    const result = results.get(intent.id);

    if (result instanceof Error) {
      console.log(`[ERROR]    ${intent.title}`);
      console.log(`  Claude call failed: ${result.message}\n`);
      continue;
    }

    const status = result.status.toUpperCase().padEnd(8);
    console.log(`[${status}] ${intent.title}`);

    if (result.matched.length > 0) {
      for (const item of result.matched) {
        const type = item.type === "pr" ? "PR" : "Issue";
        console.log(`  ✓ ${type} #${item.number} (${item.repo}): ${item.title}`);
      }
    } else {
      console.log(`  No related activity found.`);
    }

    console.log(`  Reason: ${result.reason}\n`);
  }
}
