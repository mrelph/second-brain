import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  type AgentKind,
  type PageNamingStyle,
  type WikiLinkStyle,
  SCHEMA_VERSION
} from "../templates/schema.ts";

export const CONFIG_FILENAME = ".second-brain.json";
export const CONFIG_VERSION = 1;

export interface SecondBrainConfig {
  categories: string[];
  defaultAgent: AgentKind;
  projectName: string;
  schema: {
    commonQueries: string[];
    domain: string;
    entityTypes: string[];
    styleGuide: string;
    version: number;
  };
  sourceHandling: {
    mode: "leave-in-inbox" | "archive-after-ingest" | "user-directed";
  };
  version: number;
  wiki: {
    frontmatter: boolean;
    linkStyle: WikiLinkStyle;
    pageNaming: PageNamingStyle;
  };
}

export interface CreateDefaultConfigOptions {
  commonQueries?: string[];
  defaultAgent?: AgentKind;
  domain?: string;
  entityTypes?: string[];
  linkStyle?: WikiLinkStyle;
  projectName: string;
}

export function createDefaultConfig(
  options: CreateDefaultConfigOptions
): SecondBrainConfig {
  return {
    categories: [],
    defaultAgent: options.defaultAgent ?? "codex",
    projectName: options.projectName,
    schema: {
      commonQueries: cleanStringList(options.commonQueries),
      domain: options.domain?.trim() || `${options.projectName} knowledge base`,
      entityTypes: cleanStringList(options.entityTypes),
      styleGuide:
        "Concise, factual markdown with clear headings, durable page titles, and explicit cross-links.",
      version: SCHEMA_VERSION
    },
    sourceHandling: {
      mode: "user-directed"
    },
    version: CONFIG_VERSION,
    wiki: {
      frontmatter: true,
      linkStyle: options.linkStyle ?? "wikilinks",
      pageNaming: "title-case"
    }
  };
}

export async function findProjectRoot(startDir: string): Promise<string | null> {
  let currentDir = resolve(startDir);

  while (true) {
    const configPath = join(currentDir, CONFIG_FILENAME);

    try {
      await readFile(configPath, "utf8");
      return currentDir;
    } catch {
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        return null;
      }
      currentDir = parentDir;
    }
  }
}

export async function loadConfig(projectRoot: string): Promise<SecondBrainConfig> {
  const configPath = join(projectRoot, CONFIG_FILENAME);
  const raw = await readFile(configPath, "utf8");
  let parsed: Partial<SecondBrainConfig>;
  try {
    parsed = JSON.parse(raw) as Partial<SecondBrainConfig>;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${configPath}: ${detail}`);
  }
  return normalizeConfig(projectRoot, parsed);
}

export function isConfigMissingError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
}

export async function saveConfig(projectRoot: string, config: SecondBrainConfig): Promise<void> {
  await writeFile(join(projectRoot, CONFIG_FILENAME), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function getConfigPath(projectRoot: string): string {
  return join(projectRoot, CONFIG_FILENAME);
}

export function normalizeConfig(
  projectRoot: string,
  config: Partial<SecondBrainConfig>
): SecondBrainConfig {
  const projectName = cleanString(config.projectName) || basename(projectRoot);

  return {
    categories: Array.isArray(config.categories)
      ? config.categories
          .map((value) => String(value).trim())
          .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index)
      : [],
    defaultAgent: isAgentKind(config.defaultAgent) ? config.defaultAgent : "codex",
    projectName,
    schema: {
      commonQueries: cleanStringList(config.schema?.commonQueries),
      domain: cleanString(config.schema?.domain) || `${projectName} knowledge base`,
      entityTypes: cleanStringList(config.schema?.entityTypes),
      styleGuide:
        cleanString(config.schema?.styleGuide) ||
        "Concise, factual markdown with clear headings, durable page titles, and explicit cross-links.",
      version:
        typeof config.schema?.version === "number" ? config.schema.version : SCHEMA_VERSION
    },
    sourceHandling: {
      mode: isSourceMode(config.sourceHandling?.mode)
        ? config.sourceHandling.mode
        : "user-directed"
    },
    version: typeof config.version === "number" ? config.version : CONFIG_VERSION,
    wiki: {
      frontmatter:
        typeof config.wiki?.frontmatter === "boolean" ? config.wiki.frontmatter : true,
      linkStyle: isWikiLinkStyle(config.wiki?.linkStyle) ? config.wiki.linkStyle : "wikilinks",
      pageNaming: isPageNamingStyle(config.wiki?.pageNaming)
        ? config.wiki.pageNaming
        : "title-case"
    }
  };
}

export function isAgentKind(value: unknown): value is AgentKind {
  return (
    value === "codex" ||
    value === "claude-code" ||
    value === "opencode" ||
    value === "pi" ||
    value === "generic"
  );
}

export function parseAgentKind(value: string, context = "agent"): AgentKind {
  if (isAgentKind(value)) {
    return value;
  }
  throw new Error(`Invalid ${context}: ${value}`);
}

function isWikiLinkStyle(value: unknown): value is WikiLinkStyle {
  return value === "wikilinks" || value === "markdown";
}

function isPageNamingStyle(value: unknown): value is PageNamingStyle {
  return value === "title-case" || value === "sentence-case" || value === "kebab-case";
}

function isSourceMode(
  value: unknown
): value is SecondBrainConfig["sourceHandling"]["mode"] {
  return (
    value === "leave-in-inbox" || value === "archive-after-ingest" || value === "user-directed"
  );
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => String(item).trim())
    .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index);
}
