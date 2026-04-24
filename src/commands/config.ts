import { basename, resolve } from "node:path";
import {
  createDefaultConfig,
  findProjectRoot,
  getConfigPath,
  isConfigMissingError,
  loadConfig,
  parseAgentKind as parseAgentKindCore,
  saveConfig,
  type SecondBrainConfig
} from "../core/config.ts";
import { closePrompts, prompt } from "../utils/prompt.ts";

export interface ConfigCommandOptions {
  action: "show" | "get" | "set" | "init";
  directory?: string;
  key?: string;
  value?: string;
}

export async function runConfigCommand(options: ConfigCommandOptions): Promise<void> {
  try {
    await runConfigCommandInner(options);
  } finally {
    closePrompts();
  }
}

async function runConfigCommandInner(options: ConfigCommandOptions): Promise<void> {
  const baseDir = resolve(process.cwd(), options.directory ?? ".");
  const projectRoot = (await findProjectRoot(baseDir)) ?? baseDir;

  if (options.action === "show") {
    const config = await loadOrCreate(projectRoot);
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (options.action === "get") {
    if (!options.key) {
      throw new Error("Missing key for config get");
    }

    const config = await loadOrCreate(projectRoot);
    console.log(formatConfigValue(readConfigValue(config, options.key)));
    return;
  }

  if (options.action === "init") {
    const config = await promptForConfig(await loadOrCreate(projectRoot));
    await saveConfig(projectRoot, config);
    console.log(`Updated ${getConfigPath(projectRoot)}`);
    return;
  }

  if (!options.key || options.value === undefined) {
    throw new Error("Usage: second-brain config set <key> <value>");
  }

  const config = await loadOrCreate(projectRoot);
  const nextConfig = writeConfigValue(config, options.key, options.value);
  await saveConfig(projectRoot, nextConfig);
  console.log(`Updated ${getConfigPath(projectRoot)}`);
}

export function parseConfigArgs(args: string[]): ConfigCommandOptions {
  if (args.length === 0) {
    return { action: "show" };
  }

  const options: ConfigCommandOptions = {
    action: "show"
  };
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      break;
    }

    if (arg === "--directory") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("Missing value for --directory");
      }
      options.directory = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--directory=")) {
      options.directory = arg.slice("--directory=".length);
      continue;
    }

    positionals.push(arg);
  }

  if (positionals.length === 0) {
    return options;
  }

  const [action, key, value] = positionals;
  if (action === "show") {
    return { ...options, action: "show" };
  }

  if (action === "init") {
    return { ...options, action: "init" };
  }

  if (action === "get") {
    if (!key) {
      throw new Error("Usage: second-brain config get <key>");
    }
    return { ...options, action: "get", key };
  }

  if (action === "set") {
    if (!key || value === undefined) {
      throw new Error("Usage: second-brain config set <key> <value>");
    }
    return { ...options, action: "set", key, value };
  }

  throw new Error(`Unknown config action: ${action}`);
}

async function loadOrCreate(projectRoot: string): Promise<SecondBrainConfig> {
  try {
    return await loadConfig(projectRoot);
  } catch (error: unknown) {
    if (!isConfigMissingError(error)) {
      throw error;
    }
    const config = createDefaultConfig({ projectName: basename(projectRoot), defaultAgent: "codex" });
    await saveConfig(projectRoot, config);
    return config;
  }
}

async function promptForConfig(config: SecondBrainConfig): Promise<SecondBrainConfig> {
  const defaultAgent = parseAgentKind(await prompt("Default agent", config.defaultAgent));
  const domain = await prompt("Primary domain/topic", config.schema.domain);
  const styleGuide = await prompt("Preferred conventions/style", config.schema.styleGuide);
  const linkStyle = parseLinkStyle(await prompt("Link style", config.wiki.linkStyle));
  const frontmatter = parseBoolean(await prompt("Use frontmatter", String(config.wiki.frontmatter)));
  const pageNaming = parsePageNaming(await prompt("Page naming", config.wiki.pageNaming));
  const sourceMode = parseSourceMode(await prompt("Source handling mode", config.sourceHandling.mode));
  const categories = parseCategories(
    await prompt("Custom categories (comma-separated)", config.categories.join(", "))
  );

  return {
    ...config,
    categories,
    defaultAgent,
    schema: {
      ...config.schema,
      domain,
      styleGuide
    },
    sourceHandling: {
      mode: sourceMode
    },
    wiki: {
      frontmatter,
      linkStyle,
      pageNaming
    }
  };
}

function readConfigValue(config: SecondBrainConfig, key: string): unknown {
  switch (key) {
    case "defaultAgent":
      return config.defaultAgent;
    case "schema.domain":
      return config.schema.domain;
    case "schema.styleGuide":
      return config.schema.styleGuide;
    case "wiki.linkStyle":
      return config.wiki.linkStyle;
    case "wiki.frontmatter":
      return config.wiki.frontmatter;
    case "wiki.pageNaming":
      return config.wiki.pageNaming;
    case "sourceHandling.mode":
      return config.sourceHandling.mode;
    case "categories":
      return config.categories;
    default:
      throw new Error(`Unknown config key: ${key}`);
  }
}

function writeConfigValue(
  config: SecondBrainConfig,
  key: string,
  value: string
): SecondBrainConfig {
  switch (key) {
    case "defaultAgent":
      return { ...config, defaultAgent: parseAgentKind(value) };
    case "schema.domain":
      return { ...config, schema: { ...config.schema, domain: value.trim() } };
    case "schema.styleGuide":
      return { ...config, schema: { ...config.schema, styleGuide: value.trim() } };
    case "wiki.linkStyle":
      return { ...config, wiki: { ...config.wiki, linkStyle: parseLinkStyle(value) } };
    case "wiki.frontmatter":
      return { ...config, wiki: { ...config.wiki, frontmatter: parseBoolean(value) } };
    case "wiki.pageNaming":
      return { ...config, wiki: { ...config.wiki, pageNaming: parsePageNaming(value) } };
    case "sourceHandling.mode":
      return { ...config, sourceHandling: { mode: parseSourceMode(value) } };
    case "categories":
      return { ...config, categories: parseCategories(value) };
    default:
      throw new Error(`Unknown config key: ${key}`);
  }
}

function parseAgentKind(value: string): ReturnType<typeof parseAgentKindCore> {
  return parseAgentKindCore(value, "defaultAgent");
}

function parseLinkStyle(value: string): SecondBrainConfig["wiki"]["linkStyle"] {
  if (value === "wikilinks" || value === "markdown") {
    return value;
  }

  throw new Error(`Invalid wiki.linkStyle: ${value}`);
}

function parsePageNaming(value: string): SecondBrainConfig["wiki"]["pageNaming"] {
  if (value === "title-case" || value === "sentence-case" || value === "kebab-case") {
    return value;
  }

  throw new Error(`Invalid wiki.pageNaming: ${value}`);
}

function parseSourceMode(value: string): SecondBrainConfig["sourceHandling"]["mode"] {
  if (
    value === "leave-in-inbox" ||
    value === "archive-after-ingest" ||
    value === "user-directed"
  ) {
    return value;
  }

  throw new Error(`Invalid sourceHandling.mode: ${value}`);
}

function parseBoolean(value: string): boolean {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Expected boolean value, received: ${value}`);
}

function parseCategories(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part, index, all) => part.length > 0 && all.indexOf(part) === index);
}

function formatConfigValue(value: unknown): string {
  return Array.isArray(value) ? JSON.stringify(value) : String(value);
}
