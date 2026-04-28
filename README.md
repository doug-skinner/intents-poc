# Intent Tracker POC

A CLI tool that lets product owners declare high-level intents and automatically tracks engineering progress against them using GitHub activity and Claude for semantic matching.

## How it works

1. A product owner writes intent files — short YAML docs with a title and description of what they want to see happen.
2. The scanner fetches closed issues and merged PRs from the last 7 days across configured GitHub repos.
3. Claude reads each intent and the recent activity, then judges which items are related and whether the intent is `none`, `partial`, or `complete`.
4. Results are written back into the intent YAML files so state accumulates over time.

Status only advances (`none` → `partial` → `complete`) and never regresses, so an intent that was once marked complete stays complete even if there's no new activity.

## Setup

Requires [Bun](https://bun.sh).

```bash
bun install
```

### Configuration

Copy the example config and fill in your values:

```bash
cp config-example.yml config-mine.yml
```

```yaml
github_token_env: GITHUB_PAT # name of the env var holding your GitHub token
intents_dir: ./intents/my-team # where intent YAML files live
repos:
  - owner/repo-a
  - owner/repo-b
```

Config files matching `config-*.yml` are gitignored (except `config-example.yml` and `config-test.yml`).

### Environment variables

- **`GITHUB_PAT`** (or whatever you set in `github_token_env`) — a GitHub personal access token with repo read access.
- Claude credentials — the matcher uses `@anthropic-ai/foundry-sdk` (MS Foundry-hosted Claude). Configure credentials per the Foundry SDK docs.

## Writing intents

Create YAML files in your `intents_dir`. Each file describes one intent:

```yaml
id: checkout-conversion
title: Improve checkout conversion
description: |
  Reduce drop-off at the promo code and payment steps
  of the checkout funnel.
status: none
related: []
```

Required fields: `id`, `title`, `description`, `status`, `related`. Start `status` at `none` and `related` as an empty list — the scanner fills these in.

## Usage

### Scanner

Fetches recent GitHub activity, matches it against intents using Claude, updates the intent files, and prints a report.

```bash
bun run src/index.ts config-mine.yml
```

Example output:

```text
=== Intent Report — 2026-04-28 ===
Scanning: owner/repo-a, owner/repo-b
Activity window: last 7 days (20 items total)

[COMPLETE] Improve checkout conversion
  ✓ PR #42 (owner/repo-a): Fix broken promo code field on cart page
  ✓ Issue #17 (owner/repo-a): Cart abandonment spike
  Reason: Both promo code and payment step issues are addressed.

[NONE    ] API performance improvements
  No related activity found.
  Reason: No activity is clearly related to this intent.
```

### Viewer

Serves a read-only HTML dashboard of current intent status on port 8080.

```bash
bun run src/viewer.ts config-mine.yml
```

The viewer reads intent files once at startup. Restart it to pick up changes from a new scan.

## Project structure

```text
src/
  index.ts      # CLI scanner — orchestrates fetch, match, save, report
  viewer.ts     # Web viewer — serves HTML dashboard via Bun.serve
  config.ts     # Loads and validates config YAML
  github.ts     # GitHub REST API client (paginated)
  intents.ts    # Reads/writes intent YAML files
  matcher.ts    # Claude-based semantic matching
  reporter.ts   # Formats CLI report output
  types.ts      # Shared TypeScript interfaces
```
