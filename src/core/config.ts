import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  AGENT_KINDS,
  PAGE_NAMING_STYLES,
  SCHEMA_VERSION,
  WIKI_LINK_STYLES,
  type AgentKind,
  type PageNamingStyle,
  type WikiLinkStyle
} from "../templates/schema.ts";

export const CONFIG_FILENAME = ".second-brain.json";
export const CONFIG_VERSION = 1;
export const SOURCE_HANDLING_MODES = [
  "leave-in-inbox",
  "archive-after-ingest",
  "user-directed"
] as const;
export type SourceHandlingMode = (typeof SOURCE_HANDLING_MODES)[number];

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
    mode: SourceHandlingMode;
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
  return AGENT_KINDS.includes(value as AgentKind);
}

export function parseAgentKind(value: string, context = "agent"): AgentKind {
  if (isAgentKind(value)) {
    return value;
  }
  throw new Error(`Invalid ${context}: ${value}`);
}

function isWikiLinkStyle(value: unknown): value is WikiLinkStyle {
  return WIKI_LINK_STYLES.includes(value as WikiLinkStyle);
}

function isPageNamingStyle(value: unknown): value is PageNamingStyle {
  return PAGE_NAMING_STYLES.includes(value as PageNamingStyle);
}

function isSourceMode(value: unknown): value is SourceHandlingMode {
  return SOURCE_HANDLING_MODES.includes(value as SourceHandlingMode);
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

export function getConfigJsonSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "second-brain config (.second-brain.json)",
    description:
      "Project configuration consumed by `second-brain init --config` and `second-brain upgrade`. " +
      "Any field omitted falls back to the same defaults used by the wizard.",
    type: "object",
    additionalProperties: false,
    required: ["projectName"],
    properties: {
      version: {
        type: "integer",
        const: CONFIG_VERSION,
        description: "Config file format version. Defaults to the current version if omitted."
      },
      projectName: {
        type: "string",
        minLength: 1,
        description: "Human-readable project name; used in headings and the generated instruction file."
      },
      defaultAgent: {
        enum: [...AGENT_KINDS],
        default: "codex",
        description: "Which AI coding assistant maintains this knowledge base."
      },
      categories: {
        type: "array",
        items: { type: "string", minLength: 1 },
        default: [],
        description:
          "Extra wiki page categories beyond the built-in entities/concepts/topics. Use sparingly."
      },
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          version: { type: "integer", description: "Schema (instruction-file) version this config was authored against." },
          domain: {
            type: "string",
            description: "One-line description of what this knowledge base is about (e.g. 'AI safety research notes')."
          },
          styleGuide: {
            type: "string",
            description: "Preferred prose conventions for wiki pages (tone, headings, link density)."
          },
          entityTypes: {
            type: "array",
            items: { type: "string", minLength: 1 },
            default: [],
            description: "Recurring kinds of things pages will be about (e.g. ['papers', 'authors', 'methods'])."
          },
          commonQueries: {
            type: "array",
            items: { type: "string", minLength: 1 },
            default: [],
            description: "Sample questions the wiki should answer well — shapes how the assistant structures pages."
          }
        }
      },
      sourceHandling: {
        type: "object",
        additionalProperties: false,
        properties: {
          mode: {
            enum: [...SOURCE_HANDLING_MODES],
            default: "user-directed",
            description:
              "How processed sources move between sources/inbox/ and sources/archive/."
          }
        }
      },
      wiki: {
        type: "object",
        additionalProperties: false,
        properties: {
          frontmatter: {
            type: "boolean",
            default: true,
            description: "Whether maintained wiki pages begin with YAML frontmatter."
          },
          linkStyle: {
            enum: [...WIKI_LINK_STYLES],
            default: "wikilinks",
            description: "Internal link style: Obsidian-style [[Page]] vs portable markdown links."
          },
          pageNaming: {
            enum: [...PAGE_NAMING_STYLES],
            default: "title-case",
            description: "Casing convention for page titles."
          }
        }
      }
    }
  };
}
