import { basename, resolve } from "node:path";
import {
  createDefaultConfig,
  findProjectRoot,
  isConfigMissingError,
  loadConfig,
  parseAgentKind,
  saveConfig,
  type SecondBrainConfig
} from "../core/config.ts";
import { readSchemaState, writeSchemaFile } from "../core/schema-file.ts";
import {
  getAgentDisplayName,
  getSchemaFilename,
  type AgentKind
} from "../templates/schema.ts";
import { closePrompts, prompt } from "../utils/prompt.ts";

export interface SchemaCommandOptions {
  agent?: AgentKind;
  categories?: string[];
  directory?: string;
  domain?: string;
  frontmatter?: boolean;
  interactive: boolean;
  pageNaming?: SecondBrainConfig["wiki"]["pageNaming"];
  sourceMode?: SecondBrainConfig["sourceHandling"]["mode"];
  styleGuide?: string;
  wikiLinkStyle?: SecondBrainConfig["wiki"]["linkStyle"];
}

export async function runSchemaCommand(options: SchemaCommandOptions): Promise<void> {
  try {
    await runSchemaCommandInner(options);
  } finally {
    closePrompts();
  }
}

async function runSchemaCommandInner(options: SchemaCommandOptions): Promise<void> {
  const baseDir = resolve(process.cwd(), options.directory ?? ".");
  const projectRoot = (await findProjectRoot(baseDir)) ?? baseDir;
  const config = await loadConfigOrDefault(projectRoot);
  const interactive = options.interactive || !options.agent || !options.domain || !options.styleGuide;
  const agent = options.agent ?? (interactive ? await promptForAgent(config.defaultAgent) : config.defaultAgent);
  const domain =
    options.domain ??
    (interactive ? await prompt("Primary domain/topic", config.schema.domain) : config.schema.domain);
  const styleGuide =
    options.styleGuide ??
    (interactive
      ? await prompt("Preferred conventions/style", config.schema.styleGuide)
      : config.schema.styleGuide);
  const existingSchema = await readSchemaState(projectRoot, agent);

  const nextConfig: SecondBrainConfig = {
    ...config,
    categories: options.categories ?? config.categories,
    defaultAgent: agent,
    schema: {
      ...config.schema,
      domain,
      styleGuide
    },
    sourceHandling: {
      mode: options.sourceMode ?? config.sourceHandling.mode
    },
    wiki: {
      frontmatter: options.frontmatter ?? config.wiki.frontmatter,
      linkStyle: options.wikiLinkStyle ?? config.wiki.linkStyle,
      pageNaming: options.pageNaming ?? config.wiki.pageNaming
    }
  };

  const generated = await writeSchemaFile(
    projectRoot,
    nextConfig,
    agent,
    existingSchema.customContent
  );
  await saveConfig(projectRoot, nextConfig);

  const assistantName = getAgentDisplayName(agent);
  const fileName = getSchemaFilename(agent);
  console.log("");
  console.log(`Wrote ${generated.path}`);
  console.log(`  This is the instruction file ${assistantName} reads when you work in this folder.`);
  console.log(`Updated ${resolve(projectRoot, ".second-brain.json")}`);
  console.log("  Your knowledge base settings (domain, style, link format, etc.).");
  console.log("");
  console.log(`Tip: edit the "Project Customizations" section of ${fileName} to add your own`);
  console.log("guidance — it's preserved across upgrades.");
}

export function parseSchemaArgs(args: string[]): SchemaCommandOptions {
  const options: SchemaCommandOptions = {
    interactive: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      break;
    }

    if (arg === "--interactive" || arg === "-i") {
      options.interactive = true;
      continue;
    }

    if (arg === "--agent") {
      options.agent = parseAgentKind(nextArg(args, index, "--agent"));
      index += 1;
      continue;
    }

    if (arg.startsWith("--agent=")) {
      options.agent = parseAgentKind(arg.slice("--agent=".length));
      continue;
    }

    if (arg === "--domain") {
      options.domain = nextArg(args, index, "--domain");
      index += 1;
      continue;
    }

    if (arg.startsWith("--domain=")) {
      options.domain = arg.slice("--domain=".length);
      continue;
    }

    if (arg === "--style") {
      options.styleGuide = nextArg(args, index, "--style");
      index += 1;
      continue;
    }

    if (arg.startsWith("--style=")) {
      options.styleGuide = arg.slice("--style=".length);
      continue;
    }

    if (arg === "--directory") {
      options.directory = nextArg(args, index, "--directory");
      index += 1;
      continue;
    }

    if (arg.startsWith("--directory=")) {
      options.directory = arg.slice("--directory=".length);
      continue;
    }

    if (arg === "--wikilinks") {
      options.wikiLinkStyle = "wikilinks";
      continue;
    }

    if (arg === "--markdown-links") {
      options.wikiLinkStyle = "markdown";
      continue;
    }

    if (arg === "--frontmatter") {
      options.frontmatter = true;
      continue;
    }

    if (arg === "--no-frontmatter") {
      options.frontmatter = false;
      continue;
    }

    if (arg === "--page-naming") {
      options.pageNaming = parsePageNaming(nextArg(args, index, "--page-naming"));
      index += 1;
      continue;
    }

    if (arg.startsWith("--page-naming=")) {
      options.pageNaming = parsePageNaming(arg.slice("--page-naming=".length));
      continue;
    }

    if (arg === "--source-mode") {
      options.sourceMode = parseSourceMode(nextArg(args, index, "--source-mode"));
      index += 1;
      continue;
    }

    if (arg.startsWith("--source-mode=")) {
      options.sourceMode = parseSourceMode(arg.slice("--source-mode=".length));
      continue;
    }

    if (arg === "--categories") {
      options.categories = parseCategories(nextArg(args, index, "--categories"));
      index += 1;
      continue;
    }

    if (arg.startsWith("--categories=")) {
      options.categories = parseCategories(arg.slice("--categories=".length));
      continue;
    }

    throw new Error(`Unknown option for schema: ${arg}`);
  }

  return options;
}

async function loadConfigOrDefault(projectRoot: string): Promise<SecondBrainConfig> {
  try {
    return await loadConfig(projectRoot);
  } catch (error: unknown) {
    if (isConfigMissingError(error)) {
      return createDefaultConfig({ projectName: basename(projectRoot), defaultAgent: "codex" });
    }
    throw error;
  }
}

async function promptForAgent(defaultAgent: AgentKind): Promise<AgentKind> {
  return parseAgentKind(await prompt("Target agent", defaultAgent));
}

function parsePageNaming(value: string): SecondBrainConfig["wiki"]["pageNaming"] {
  if (value === "title-case" || value === "sentence-case" || value === "kebab-case") {
    return value;
  }

  throw new Error(`Invalid page naming style: ${value}`);
}

function parseSourceMode(value: string): SecondBrainConfig["sourceHandling"]["mode"] {
  if (
    value === "leave-in-inbox" ||
    value === "archive-after-ingest" ||
    value === "user-directed"
  ) {
    return value;
  }

  throw new Error(`Invalid source mode: ${value}`);
}

function parseCategories(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part, index, all) => part.length > 0 && all.indexOf(part) === index);
}

function nextArg(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}
