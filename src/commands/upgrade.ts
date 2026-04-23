import { basename, relative, resolve } from "node:path";
import {
  createDefaultConfig,
  findProjectRoot,
  loadConfig,
  saveConfig,
  type SecondBrainConfig
} from "../core/config.ts";
import {
  applyCustomBlock,
  buildSchemaFile,
  readSchemaState,
  writeSchemaFile
} from "../core/schema-file.ts";
import { type AgentKind, SCHEMA_VERSION } from "../templates/schema.ts";
import { renderLineDiff } from "../utils/diff.ts";

export interface UpgradeCommandOptions {
  agent?: AgentKind;
  directory?: string;
  dryRun: boolean;
}

export async function runUpgradeCommand(options: UpgradeCommandOptions): Promise<void> {
  const baseDir = resolve(process.cwd(), options.directory ?? ".");
  const projectRoot = (await findProjectRoot(baseDir)) ?? baseDir;
  const config = await loadConfigOrDefault(projectRoot);
  const agent = options.agent ?? config.defaultAgent;
  const schemaState = await readSchemaState(projectRoot, agent);
  const generated = buildSchemaFile(projectRoot, config, agent);
  const nextContent = applyCustomBlock(generated.content, schemaState.customContent);
  const previousContent = schemaState.currentContent ?? "";

  console.log(
    schemaState.version === null
      ? `Current schema version: legacy/unversioned. Latest: ${SCHEMA_VERSION}.`
      : `Current schema version: ${schemaState.version}. Latest: ${SCHEMA_VERSION}.`
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
    console.log("Dry run only. No files changed.");
    return;
  }

  const written = await writeSchemaFile(projectRoot, config, agent, schemaState.customContent);
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
  console.log(`Upgraded ${written.path}`);
}

export function parseUpgradeArgs(args: string[]): UpgradeCommandOptions {
  const options: UpgradeCommandOptions = {
    dryRun: false
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

    if (arg === "--agent") {
      options.agent = parseAgent(nextArg(args, index, "--agent"));
      index += 1;
      continue;
    }

    if (arg.startsWith("--agent=")) {
      options.agent = parseAgent(arg.slice("--agent=".length));
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
  } catch {
    return createDefaultConfig({ projectName: basename(projectRoot), defaultAgent: "codex" });
  }
}

function parseAgent(value: string): AgentKind {
  if (
    value === "codex" ||
    value === "claude-code" ||
    value === "opencode" ||
    value === "pi" ||
    value === "generic"
  ) {
    return value;
  }

  throw new Error(`Invalid agent: ${value}`);
}

function nextArg(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}
