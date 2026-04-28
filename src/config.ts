import { resolve, dirname } from "path";
import type { Config } from "./types";

export async function loadConfig(configPath: string): Promise<Config> {
  const raw = await Bun.file(configPath).text();
  const parsed = Bun.YAML.parse(raw) as Record<string, unknown>;

  if (!parsed.github_token_env || typeof parsed.github_token_env !== "string") {
    throw new Error("config: missing or invalid github_token_env");
  }

  if (!parsed.intents_dir || typeof parsed.intents_dir !== "string") {
    throw new Error("config: missing or invalid intents_dir");
  }

  if (!Array.isArray(parsed.repos) || !parsed.repos.every((r) => typeof r === "string")) {
    throw new Error("config: repos must be a list of strings");
  }

  return {
    github_token_env: parsed.github_token_env,
    intents_dir: resolve(dirname(configPath), parsed.intents_dir),
    repos: parsed.repos,
  };
}
