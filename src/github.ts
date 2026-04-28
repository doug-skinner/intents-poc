import type { GitHubItem } from "./types";

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  closed_at: string | null;
  pull_request?: object;
}

interface GitHubPR {
  number: number;
  title: string;
  body: string | null;
  state: string;
  merged_at: string | null;
}

async function fetchPaginated<T>(url: string, token: string): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error ${response.status}: ${await response.text()}`);
    }

    const items = await response.json() as T[];
    results.push(...items);

    const linkHeader = response.headers.get("link");
    nextUrl = null;
    if (linkHeader) {
      for (const link of linkHeader.split(",")) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          nextUrl = match[1];
          break;
        }
      }
    }
  }

  return results;
}

export async function fetchClosedIssues(repo: string, since: Date, token: string): Promise<GitHubItem[]> {
  const url = `https://api.github.com/repos/${repo}/issues?state=closed&since=${since.toISOString()}&per_page=100`;
  const issues = await fetchPaginated<GitHubIssue>(url, token);

  return issues
    .filter((issue) => !issue.pull_request && issue.closed_at && new Date(issue.closed_at) >= since)
    .map((issue) => ({
      type: "issue" as const,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      repo,
      closed_at: issue.closed_at || undefined,
    }));
}

export async function fetchMergedPRs(repo: string, since: Date, token: string): Promise<GitHubItem[]> {
  const url = `https://api.github.com/repos/${repo}/pulls?state=closed&per_page=100`;
  const prs = await fetchPaginated<GitHubPR>(url, token);

  return prs
    .filter((pr) => pr.merged_at && new Date(pr.merged_at) >= since)
    .map((pr) => ({
      type: "pr" as const,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      repo,
      merged_at: pr.merged_at || undefined,
    }));
}
