import { loadConfig } from "./config";
import { loadIntents } from "./intents";
import type { Intent, RelatedItem } from "./types";

const configPath = process.argv[2];
if (!configPath) {
  console.error("Usage: bun run src/viewer.ts <config.yml>");
  process.exit(1);
}

const config = await loadConfig(configPath);
const intents = await loadIntents(config.intents_dir);

intents.sort((a, b) => {
  const order = { complete: 0, partial: 1, none: 2 };
  return order[a.status] - order[b.status];
});

function statusBadge(status: string): string {
  const colors: Record<string, { bg: string; fg: string }> = {
    complete: { bg: "#dcfce7", fg: "#166534" },
    partial: { bg: "#fef9c3", fg: "#854d0e" },
    none: { bg: "#f3f4f6", fg: "#6b7280" },
  };
  const c = colors[status] ?? colors.none;
  return `<span class="badge" style="background:${c.bg};color:${c.fg}">${status}</span>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function itemUrl(item: RelatedItem): string {
  const path = item.type === "pr" ? "pull" : "issues";
  return `https://github.com/${item.repo}/${path}/${item.number}`;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function renderItem(item: RelatedItem): string {
  const label = item.type === "pr" ? "PR" : "Issue";
  const date = item.closed_at ?? item.merged_at;
  const dateStr = date ? relativeDate(date) : "";
  return `<a href="${itemUrl(item)}" target="_blank" class="item">
    <span class="item-type ${item.type}">${label}</span>
    <span class="item-num">#${item.number}</span>
    <span class="item-title">${escapeHtml(item.title)}</span>
    ${dateStr ? `<span class="item-date">${dateStr}</span>` : ""}
  </a>`;
}

function renderIntent(intent: Intent): string {
  const issues = intent.related.filter((r) => r.type === "issue");
  const prs = intent.related.filter((r) => r.type === "pr");

  return `<div class="intent">
    <div class="intent-header">
      ${statusBadge(intent.status)}
      <h2>${escapeHtml(intent.title)}</h2>
    </div>
    <p class="description">${escapeHtml(intent.description).replace(/\n/g, "<br>")}</p>
    <div class="meta">
      ${intent.last_run ? `Last scanned: ${intent.last_run}` : "Never scanned"}
      &middot; ${issues.length} issue${issues.length !== 1 ? "s" : ""}, ${prs.length} PR${prs.length !== 1 ? "s" : ""}
    </div>
    ${intent.related.length > 0 ? `<div class="items">${intent.related.map(renderItem).join("")}</div>` : ""}
  </div>`;
}

const summary = {
  complete: intents.filter((i) => i.status === "complete").length,
  partial: intents.filter((i) => i.status === "partial").length,
  none: intents.filter((i) => i.status === "none").length,
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Intent Tracker — ${escapeHtml(config.repos.join(", "))}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; }
  .container { max-width: 800px; margin: 0 auto; padding: 32px 20px; }
  header { margin-bottom: 32px; }
  header h1 { font-size: 22px; font-weight: 600; }
  header .repos { color: #64748b; font-size: 14px; margin-top: 4px; }
  .summary { display: flex; gap: 16px; margin-bottom: 28px; }
  .summary-card { padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; }
  .summary-card .count { font-size: 28px; font-weight: 700; display: block; }
  .sc-complete { background: #dcfce7; color: #166534; }
  .sc-partial { background: #fef9c3; color: #854d0e; }
  .sc-none { background: #f3f4f6; color: #6b7280; }
  .intent { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
  .intent-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .intent-header h2 { font-size: 17px; font-weight: 600; }
  .badge { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
  .description { color: #475569; font-size: 14px; margin-bottom: 10px; }
  .meta { color: #94a3b8; font-size: 13px; margin-bottom: 12px; }
  .items { display: flex; flex-direction: column; gap: 4px; }
  .item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; text-decoration: none; color: inherit; font-size: 13px; transition: background 0.1s; }
  .item:hover { background: #f1f5f9; }
  .item-type { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 4px; text-transform: uppercase; }
  .item-type.pr { background: #dbeafe; color: #1e40af; }
  .item-type.issue { background: #ede9fe; color: #5b21b6; }
  .item-num { color: #64748b; font-weight: 500; flex-shrink: 0; }
  .item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item-date { color: #94a3b8; font-size: 12px; flex-shrink: 0; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Intent Tracker</h1>
    <div class="repos">${config.repos.map((r) => escapeHtml(r)).join(", ")}</div>
  </header>
  <div class="summary">
    <div class="summary-card sc-complete"><span class="count">${summary.complete}</span>Complete</div>
    <div class="summary-card sc-partial"><span class="count">${summary.partial}</span>Partial</div>
    <div class="summary-card sc-none"><span class="count">${summary.none}</span>None</div>
  </div>
  ${intents.map(renderIntent).join("")}
</div>
</body>
</html>`;

const server = Bun.serve({
  port: 8080,
  fetch() {
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`Viewing intents at http://localhost:${server.port}`);
