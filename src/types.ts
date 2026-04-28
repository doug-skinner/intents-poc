export type IntentStatus = "none" | "partial" | "complete";

export interface Config {
  github_token_env: string;
  intents_dir: string;
  repos: string[];
}

export interface RelatedItem {
  type: "issue" | "pr";
  number: number;
  title: string;
  repo: string;
  closed_at?: string;
  merged_at?: string;
}

export interface Intent {
  id: string;
  title: string;
  description: string;
  status: IntentStatus;
  related: RelatedItem[];
  last_run?: string;
}

export interface GitHubItem {
  type: "issue" | "pr";
  number: number;
  title: string;
  body: string | null;
  repo: string;
  closed_at?: string;
  merged_at?: string;
}

export interface MatchResult {
  status: IntentStatus;
  matched: RelatedItem[];
  reason: string;
}
