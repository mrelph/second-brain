import { basename, relative, resolve } from "node:path";
import {
  createDefaultConfig,
  findProjectRoot,
  isConfigMissingError,
  loadConfig,
  parseAgentKind,
  saveConfig,
  type SecondBrainConfig
} from "../core/config.ts";
import {
  applyAssistantBlock,
  applyCustomBlock,
  buildSchemaFile,
  readSchemaState,
  writeSchemaFile
} from "../core/schema-file.ts";
import {
  getAgentDisplayName,
  getSchemaFilename,
  type AgentKind,
  SCHEMA_VERSION
} from "../templates/schema.ts";
import { renderLineDiff } from "../utils/diff.ts";
import { closePrompts, prompt } from "../utils/prompt.ts";

export interface UpgradeCommandOptions {
  agent?: AgentKind;
  directory?: string;
  dryRun: boolean;
  yes: boolean;
}

export async function runUpgradeCommand(options: UpgradeCommandOptions): Promise<void> {
  try {
    await runUpgradeCommandInner(options);
  } finally {
    closePrompts();
  }
}

async function runUpgradeCommandInner(options: UpgradeCommandOptions): Promise<void> {
  const baseDir = resolve(process.cwd(), options.directory ?? ".");
  const projectRoot = (await findProjectRoot(baseDir)) ?? baseDir;
  const config = await loadConfigOrDefault(projectRoot);
  const agent = options.agent ?? config.defaultAgent;
  const schemaState = await readSchemaState(projectRoot, agent);
  const generated = buildSchemaFile(projectRoot, config, agent);
  const withCustom = applyCustomBlock(generated.content, schemaState.customContent);
  const nextContent = applyAssistantBlock(withCustom, schemaState.assistantContent);
  const previousContent = schemaState.currentContent ?? "";

  const fileName = getSchemaFilename(agent);
  const assistantName = getAgentDisplayName(agent);

  console.log(`Your ${assistantName} instructions (${fileName}) are on version ${
    schemaState.version === null ? "an older, unversioned release" : schemaState.version
  }.`);
  console.log(`Latest available: version ${SCHEMA_VERSION}.`);
  console.log("");

  if (previousContent === nextContent && schemaState.version === SCHEMA_VERSION) {
    console.log(`${fileName} is already up to date — nothing to change.`);
    return;
  }

  console.log(
    "Here's what would change (your \"Project Customizations\" and \"Assistant Observations\" sections are preserved):"
  );
  console.log("");
  console.log(
    renderLineDiff(
      previousContent,
      nextContent,
      relative(projectRoot, schemaState.filePath) || schemaState.filePath,
      relative(projectRoot, generated.path) || generated.path
    )
  );

  if (options.dryRun) {
    console.log("");
    console.log("Dry run — no files changed.");
    return;
  }

  if (!options.yes && !(await confirm("Apply these changes?"))) {
    console.log("No changes made.");
    return;
  }

  const written = await writeSchemaFile(projectRoot, config, agent, {
    custom: schemaState.customContent,
    assistant: schemaState.assistantContent
  });
  const nextConfig: SecondBrainConfig = {
    ...config,
    defaultAgent: agent,
    schema: {
      ...config.schema,
      version: SCHEMA_VERSION
    }
  };

  await saveConfig(projectRoot, nextConfig);
  console.log("");
  console.log(`Updated ${written.path} to version ${SCHEMA_VERSION}. Your customizations are intact.`);
}

async function confirm(question: string): Promise<boolean> {
  const answer = (await prompt(`${question} [y/N]`)).toLowerCase();
  return answer === "y" || answer === "yes";
}

export function parseUpgradeArgs(args: string[]): UpgradeCommandOptions {
  const options: UpgradeCommandOptions = {
    dryRun: false,
    yes: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      break;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
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

    if (arg === "--directory") {
      options.directory = nextArg(args, index, "--directory");
      index += 1;
      continue;
    }

    if (arg.startsWith("--directory=")) {
      options.directory = arg.slice("--directory=".length);
      continue;
    }

    throw new Error(`Unknown option for upgrade: ${arg}`);
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

function nextArg(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}
