import Anthropic from "@anthropic-ai/foundry-sdk";
import type { Intent, GitHubItem, MatchResult, RelatedItem } from "./types";

const client = new Anthropic();

interface ClaudeMatchResponse {
  matched: number[];
  status: "none" | "partial" | "complete";
  reason: string;
}

export async function matchIntent(
  intent: Intent,
  activity: GitHubItem[]
): Promise<MatchResult> {
  if (activity.length === 0) {
    return {
      status: "none",
      matched: [],
      reason: "No activity in the last 7 days.",
    };
  }

  const activityText = activity
    .map((item) => {
      const type = item.type === "pr" ? "PR" : "Issue";
      return `[${type} #${item.number} ${item.repo}] ${item.title}`;
    })
    .join("\n");

  const prompt = `You are helping a product owner track whether engineering work is aligned with their declared intentions.

INTENT
Title: ${intent.title}
Description: ${intent.description}

RECENT GITHUB ACTIVITY (last 7 days)
${activityText}

Analyze the activity above and respond with ONLY a valid JSON object (no markdown, no explanation) in this format:
{
  "matched": [42, 17],
  "status": "partial",
  "reason": "Two items address promo code and cart UX, but the intent is broader."
}

Where:
- matched: array of issue/PR numbers related to this intent
- status: "complete" (fully satisfies intent), "partial" (meaningful progress), or "none" (unrelated)
- reason: one sentence explaining the assessment`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const parsed = JSON.parse(content.text) as ClaudeMatchResponse;

  const matched: RelatedItem[] = parsed.matched
    .map((num) => activity.find((item) => item.number === num))
    .filter((item): item is GitHubItem => !!item)
    .map((item) => ({
      type: item.type,
      number: item.number,
      title: item.title,
      repo: item.repo,
      closed_at: item.closed_at,
      merged_at: item.merged_at,
    }));

  return {
    status: parsed.status,
    matched,
    reason: parsed.reason,
  };
}
