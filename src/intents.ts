import type { Intent, RelatedItem } from "./types";

export async function loadIntents(intentsDir: string): Promise<Intent[]> {
  try {
    const entries = await import("fs").then((fs) => fs.promises.readdir(intentsDir));
    const intents: Intent[] = [];

    for (const entry of entries) {
      if (entry.endsWith(".yml") || entry.endsWith(".yaml")) {
        try {
          const content = await Bun.file(`${intentsDir}/${entry}`).text();
          const intent = Bun.YAML.parse(content) as Intent;
          intents.push(intent);
        } catch (err) {
          console.warn(`Failed to load intent from ${entry}: ${err}`);
        }
      }
    }

    return intents;
  } catch {
    return [];
  }
}

export async function saveIntent(intentsDir: string, intent: Intent): Promise<void> {
  const path = `${intentsDir}/${intent.id}.yml`;

  // Read existing intent to preserve and merge related items
  let existing: Intent | null = null;
  try {
    const existingContent = await Bun.file(path).text();
    existing = Bun.YAML.parse(existingContent) as Intent;
  } catch {
    // File doesn't exist yet
  }

  if (existing) {
    // Merge related items, avoid duplicates
    const newRelated = new Map<string, RelatedItem>();

    for (const item of existing.related) {
      const key = `${item.type}:${item.number}:${item.repo}`;
      newRelated.set(key, item);
    }

    for (const item of intent.related) {
      const key = `${item.type}:${item.number}:${item.repo}`;
      newRelated.set(key, item);
    }

    intent.related = Array.from(newRelated.values());

    // Status only advances: none → partial → complete
    if (existing.status === "complete") {
      intent.status = "complete";
    } else if (existing.status === "partial" && intent.status === "none") {
      intent.status = "partial";
    }
  }

  intent.last_run = new Date().toISOString().split("T")[0];
  const yaml = Bun.YAML.stringify(intent);
  await Bun.write(path, yaml);
}
