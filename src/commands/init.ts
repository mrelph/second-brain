import { resolve } from "node:path";
import { parseAgentKind } from "../core/config.ts";
import { scaffoldSecondBrainProject, type ScaffoldOptions } from "../core/project-scaffold.ts";
import {
  getAgentDisplayName,
  getSchemaFilename,
  type AgentKind,
  type WikiLinkStyle
} from "../templates/schema.ts";
import { closePrompts, prompt } from "../utils/prompt.ts";

export interface InitCommandOptions {
  commonQueries?: string[];
  defaultAgent?: AgentKind;
  directory?: string;
  domain?: string;
  entityTypes?: string[];
  force: boolean;
  git: boolean;
  interactive?: boolean;
  linkStyle?: WikiLinkStyle;
  name?: string;
}

const AGENT_CHOICES: readonly AgentKind[] = [
  "claude-code",
  "codex",
  "kiro",
  "opencode",
  "pi",
  "generic"
] as const;

export async function runInitCommand(options: InitCommandOptions): Promise<void> {
  try {
    await runInitCommandInner(options);
  } finally {
    closePrompts();
  }
}

async function runInitCommandInner(options: InitCommandOptions): Promise<void> {
  const wizardRequested = options.interactive === true;
  const noFlagsPassed =
    options.name === undefined &&
    options.defaultAgent === undefined &&
    options.linkStyle === undefined &&
    options.domain === undefined &&
    options.entityTypes === undefined &&
    options.commonQueries === undefined &&
    options.directory === undefined;
  const useWizard = wizardRequested || (noFlagsPassed && Boolean(process.stdin.isTTY));

  const answers = useWizard ? await runWizard(options) : options;
  const targetDir = resolve(process.cwd(), answers.directory ?? ".");

  const scaffoldOptions: ScaffoldOptions = {
    targetDir,
    force: answers.force,
    initGit: answers.git,
    ...(answers.name !== undefined ? { projectName: answers.name } : {}),
    ...(answers.defaultAgent !== undefined ? { defaultAgent: answers.defaultAgent } : {}),
    ...(answers.domain !== undefined ? { domain: answers.domain } : {}),
    ...(answers.entityTypes !== undefined ? { entityTypes: answers.entityTypes } : {}),
    ...(answers.commonQueries !== undefined ? { commonQueries: answers.commonQueries } : {}),
    ...(answers.linkStyle ? { linkStyle: answers.linkStyle } : {})
  };

  const result = await scaffoldSecondBrainProject(scaffoldOptions);
  const agent = scaffoldOptions.defaultAgent ?? "codex";
  const instructionsFile = getSchemaFilename(agent);
  const assistantName = getAgentDisplayName(agent);

  console.log("");
  console.log(`Your knowledge base is ready in ${result.targetDir}`);
  console.log("");
  console.log("Here's what's in it:");
  console.log("  sources/inbox/          Drop new notes, PDFs, or links here");
  console.log("  sources/archive/        Older material, once processed");
  console.log("  wiki/                   Where your organized notes will live");
  console.log("  wiki/decisions.md       Structural rulings your assistant should remember between sessions");
  console.log(`  ${instructionsFile.padEnd(24)}The instructions your AI assistant (${assistantName}) will read`);
  console.log("  .second-brain.json      Your settings — change them with `second-brain config`");
  if (result.gitInitialized) {
    console.log("  .git/                   Git history, so you can undo changes later");
  }
  console.log("");
  console.log("What to do next:");
  console.log("  1. Drop any notes, documents, or links into sources/inbox/");
  console.log(`  2. Open this folder in ${assistantName}`);
  console.log("  3. Ask it to \"ingest my inbox\" or \"what do we know about X?\"");
  console.log("");
  console.log(
    `${assistantName} will read ${instructionsFile} to know how to help you. You can edit`
  );
  console.log(
    `the \"Project Customizations\" section of that file anytime to add your own`
  );
  console.log("preferences — they'll be preserved when you upgrade.");
  console.log("");
  console.log("Run `second-brain doctor` anytime to see a summary and next steps.");
}

async function runWizard(options: InitCommandOptions): Promise<InitCommandOptions> {
  console.log("");
  console.log("Welcome to second-brain.");
  console.log("");
  console.log("This will set up a folder for your personal knowledge base — a place to");
  console.log("drop notes, documents, and links that an AI coding assistant can help you");
  console.log("organize into a searchable wiki over time.");
  console.log("");

  const directory = options.directory ?? (await prompt("Where should we set it up?", "."));
  const name = options.name ?? (await prompt("What should we call it?", directory === "." ? undefined : directory));
  const domain =
    options.domain ??
    (await prompt(
      "What will you keep here? (e.g. research papers, journal, work notes)",
      undefined
    ));

  const entityTypes =
    options.entityTypes ??
    parseEntityTypes(
      await prompt(
        "What kinds of things will pages usually be about? (comma-separated — e.g. \"papers, authors, methods\" — or press enter to skip)",
        undefined
      )
    );

  const commonQueries =
    options.commonQueries ??
    parseCommonQueries(
      await prompt(
        "What's a question you'll want to answer from this? (e.g. \"What has X said about Y?\" — press enter to skip)",
        undefined
      )
    );

  console.log("");
  console.log("Which AI assistant will help you maintain this?");
  const defaultAgent = options.defaultAgent ?? (await promptAgent());

  console.log("");
  console.log("How should notes link to each other?");
  console.log("  • Obsidian-style shortcuts like [[Page Name]] — easy if you use Obsidian");
  console.log("  • Regular markdown links like [Page](page.md) — more portable");
  const linkStyle = options.linkStyle ?? (await promptLinkStyle());

  console.log("");
  const gitAnswer =
    options.git === false
      ? "n"
      : (await prompt("Start a git repository? (lets you undo changes)", "Y")).toLowerCase();
  const git = gitAnswer !== "n" && gitAnswer !== "no";

  console.log("");
  console.log("Setting up your knowledge base…");

  return {
    ...options,
    defaultAgent,
    directory,
    ...(domain ? { domain } : {}),
    ...(entityTypes.length > 0 ? { entityTypes } : {}),
    ...(commonQueries.length > 0 ? { commonQueries } : {}),
    git,
    linkStyle,
    name
  };
}

function parseEntityTypes(input: string): string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseCommonQueries(input: string): string[] {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return [];
  }
  // Allow pipe-separated multi-question input; otherwise treat as single query.
  if (trimmed.includes("|")) {
    return trimmed
      .split("|")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
  return [trimmed];
}

async function promptAgent(): Promise<AgentKind> {
  for (let i = 0; i < AGENT_CHOICES.length; i += 1) {
    const kind = AGENT_CHOICES[i]!;
    const label = i === AGENT_CHOICES.length - 1 ? "Any / not sure yet" : getAgentDisplayName(kind);
    console.log(`  ${i + 1}. ${label}`);
  }
  const answer = await prompt("Pick a number or name", "1");
  const asNumber = Number.parseInt(answer, 10);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= AGENT_CHOICES.length) {
    return AGENT_CHOICES[asNumber - 1]!;
  }
  return parseAgentKind(answer, "assistant");
}

async function promptLinkStyle(): Promise<WikiLinkStyle> {
  const answer = (await prompt("Use Obsidian-style shortcuts?", "Y")).toLowerCase();
  if (answer === "n" || answer === "no" || answer === "markdown") {
    return "markdown";
  }
  return "wikilinks";
}

export function parseInitArgs(args: string[]): InitCommandOptions {
  const options: InitCommandOptions = {
    force: false,
    git: true
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      break;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--no-git") {
      options.git = false;
      continue;
    }

    if (arg === "--git") {
      options.git = true;
      continue;
    }

    if (arg === "--interactive" || arg === "-i") {
      options.interactive = true;
      continue;
    }

    if (arg === "--wikilinks") {
      options.linkStyle = "wikilinks";
      continue;
    }

    if (arg === "--markdown-links") {
      options.linkStyle = "markdown";
      continue;
    }

    if (arg === "--name") {
      options.name = takeValue(args, index, "--name");
      index += 1;
      continue;
    }

    if (arg.startsWith("--name=")) {
      options.name = arg.slice("--name=".length);
      continue;
    }

    if (arg === "--agent") {
      options.defaultAgent = parseAgentKind(takeValue(args, index, "--agent"));
      index += 1;
      continue;
    }

    if (arg.startsWith("--agent=")) {
      options.defaultAgent = parseAgentKind(arg.slice("--agent=".length));
      continue;
    }

    if (arg === "--domain") {
      options.domain = takeValue(args, index, "--domain");
      index += 1;
      continue;
    }

    if (arg.startsWith("--domain=")) {
      options.domain = arg.slice("--domain=".length);
      continue;
    }

    if (arg === "--entity-types") {
      options.entityTypes = parseEntityTypes(takeValue(args, index, "--entity-types"));
      index += 1;
      continue;
    }

    if (arg.startsWith("--entity-types=")) {
      options.entityTypes = parseEntityTypes(arg.slice("--entity-types=".length));
      continue;
    }

    if (arg === "--common-queries") {
      options.commonQueries = parseCommonQueries(takeValue(args, index, "--common-queries"));
      index += 1;
      continue;
    }

    if (arg.startsWith("--common-queries=")) {
      options.commonQueries = parseCommonQueries(arg.slice("--common-queries=".length));
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option for init: ${arg}`);
    }

    if (!options.directory) {
      options.directory = arg;
      continue;
    }

    throw new Error(`Unexpected argument for init: ${arg}`);
  }

  return options;
}

function takeValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}
