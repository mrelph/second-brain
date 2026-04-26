import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  findProjectRoot,
  isConfigMissingError,
  loadConfig,
  type SecondBrainConfig
} from "../core/config.ts";
import { readSchemaState, type SchemaState } from "../core/schema-file.ts";
import {
  DEFAULT_CUSTOM_BLOCK_BODY,
  getAgentDisplayName,
  getSchemaFilename,
  SCHEMA_VERSION
} from "../templates/schema.ts";

export interface DoctorCommandOptions {
  directory?: string;
  json?: boolean;
}

interface ContentSurvey {
  archiveCount: number;
  conceptsCount: number;
  draftsCount: number;
  entitiesCount: number;
  hasGit: boolean;
  hasIndex: boolean;
  hasLog: boolean;
  inboxCount: number;
  logEntries: number;
  topicsCount: number;
}

interface Finding {
  level: "OK" | "TIP" | "WARN";
  message: string;
}

export async function runDoctorCommand(options: DoctorCommandOptions): Promise<void> {
  const baseDir = resolve(process.cwd(), options.directory ?? ".");
  const projectRoot = await findProjectRoot(baseDir);

  if (!projectRoot) {
    if (options.json) {
      console.log(JSON.stringify({ status: "no-project", searchedFrom: baseDir }, null, 2));
      return;
    }
    console.log("No second-brain knowledge base found here (or in any parent folder).");
    console.log("Run `second-brain init` to create one.");
    return;
  }

  let config: SecondBrainConfig;
  try {
    config = await loadConfig(projectRoot);
  } catch (error: unknown) {
    if (isConfigMissingError(error)) {
      if (options.json) {
        console.log(JSON.stringify({ status: "no-config", projectRoot }, null, 2));
        return;
      }
      console.log("No .second-brain.json found. Run `second-brain init` here to set one up.");
      return;
    }
    throw error;
  }

  const schemaState = await readSchemaState(projectRoot, config.defaultAgent);
  const content = await surveyContent(projectRoot);
  const findings = collectFindings(config, schemaState, content);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          status: "ok",
          projectRoot,
          projectName: config.projectName,
          agent: config.defaultAgent,
          instructionsFile: getSchemaFilename(config.defaultAgent),
          schemaVersion: schemaState.version,
          latestSchemaVersion: SCHEMA_VERSION,
          domain: config.schema.domain,
          linkStyle: config.wiki.linkStyle,
          categories: config.categories,
          content,
          findings
        },
        null,
        2
      )
    );
    return;
  }

  printSummary(projectRoot, config);
  console.log("");
  printContent(content);
  console.log("");
  printHealth(findings);
}

export function parseDoctorArgs(args: string[]): DoctorCommandOptions {
  const options: DoctorCommandOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      break;
    }

    if (arg === "--directory") {
      const value = args[index + 1];
      if (value === undefined) {
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

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    throw new Error(`Unknown option for doctor: ${arg}`);
  }

  return options;
}

function printSummary(projectRoot: string, config: SecondBrainConfig): void {
  const agent = config.defaultAgent;
  const assistantName = getAgentDisplayName(agent);
  const fileName = getSchemaFilename(agent);
  const linkDescription =
    config.wiki.linkStyle === "wikilinks"
      ? "Obsidian-style shortcuts ([[Page Name]])"
      : "regular markdown links ([Page](page.md))";

  console.log(`Your knowledge base: ${config.projectName}`);
  console.log(`  Location:   ${projectRoot}`);
  console.log(`  Assistant:  ${assistantName} (${fileName})`);
  console.log(`  Focus:      ${config.schema.domain}`);
  console.log(`  Link style: ${linkDescription}`);
  if (config.categories.length > 0) {
    console.log(`  Extra tags: ${config.categories.join(", ")}`);
  }
}

function printContent(content: ContentSurvey): void {
  console.log("Content:");
  console.log(`  ${pluralize(content.inboxCount, "source")} waiting in sources/inbox/`);
  console.log(`  ${pluralize(content.archiveCount, "source")} in sources/archive/`);
  const totalWiki = content.entitiesCount + content.conceptsCount + content.topicsCount;
  console.log(
    `  ${pluralize(totalWiki, "wiki page")} (${content.entitiesCount} in entities, ${content.conceptsCount} in concepts, ${content.topicsCount} in topics)`
  );
  console.log(`  ${pluralize(content.draftsCount, "draft")} in progress`);
  console.log(`  ${pluralize(content.logEntries, "log entry", "log entries")}`);
}

function printHealth(findings: Finding[]): void {
  console.log("Health:");
  if (findings.length === 0) {
    console.log("  OK    Everything looks good.");
    return;
  }
  const labelWidth = 6;
  for (const finding of findings) {
    const indentedMessage = finding.message.replace(/\n/g, `\n${" ".repeat(labelWidth + 2)}`);
    console.log(`  ${finding.level.padEnd(labelWidth - 2)}  ${indentedMessage}`);
  }
}

function collectFindings(
  config: SecondBrainConfig,
  schemaState: SchemaState,
  content: ContentSurvey
): Finding[] {
  const findings: Finding[] = [];
  const fileName = getSchemaFilename(config.defaultAgent);

  if (schemaState.currentContent === null) {
    findings.push({
      level: "WARN",
      message: `${fileName} is missing. Run \`second-brain schema\` to regenerate it.`
    });
  } else if (schemaState.version === null) {
    findings.push({
      level: "WARN",
      message: `${fileName} is on an older, unversioned release. Run \`second-brain upgrade\`.`
    });
  } else if (schemaState.version < SCHEMA_VERSION) {
    findings.push({
      level: "TIP",
      message: `${fileName} is on version ${schemaState.version}. Latest is ${SCHEMA_VERSION} — run \`second-brain upgrade\` to refresh.`
    });
  } else {
    findings.push({
      level: "OK",
      message: `Assistant instructions up to date (version ${schemaState.version}).`
    });
  }

  const customized =
    schemaState.customContent.trim().length > 0 &&
    schemaState.customContent.trim() !== DEFAULT_CUSTOM_BLOCK_BODY.trim();
  if (schemaState.currentContent && !customized) {
    findings.push({
      level: "TIP",
      message: `No personal guidance yet. Edit the "Project Customizations" section of ${fileName} to tailor your assistant.`
    });
  }

  if (content.hasGit) {
    findings.push({ level: "OK", message: "Git repo initialized — your history is tracked." });
  } else {
    findings.push({
      level: "TIP",
      message: "No git repo here. Run `git init` to track changes — highly recommended."
    });
  }

  if (content.inboxCount > 0) {
    findings.push({
      level: "TIP",
      message: `${pluralize(content.inboxCount, "source")} in the inbox. Ask your assistant to "ingest my inbox" to process them.`
    });
  }

  if (!content.hasIndex) {
    findings.push({
      level: "WARN",
      message: "wiki/index.md is missing — your assistant uses this as the navigation page."
    });
  }
  if (!content.hasLog) {
    findings.push({
      level: "WARN",
      message: "wiki/log.md is missing — your assistant uses this to record changes."
    });
  }

  return findings;
}

async function surveyContent(projectRoot: string): Promise<ContentSurvey> {
  const [
    inboxCount,
    archiveCount,
    entitiesCount,
    conceptsCount,
    topicsCount,
    draftsCount,
    logEntries,
    hasIndex,
    hasLog,
    hasGit
  ] = await Promise.all([
    countSourceFiles(join(projectRoot, "sources/inbox")),
    countSourceFiles(join(projectRoot, "sources/archive")),
    countMarkdownPages(join(projectRoot, "wiki/entities")),
    countMarkdownPages(join(projectRoot, "wiki/concepts")),
    countMarkdownPages(join(projectRoot, "wiki/topics")),
    countMarkdownPages(join(projectRoot, "wiki/drafts")),
    countLogEntries(join(projectRoot, "wiki/log.md")),
    pathExists(join(projectRoot, "wiki/index.md")),
    pathExists(join(projectRoot, "wiki/log.md")),
    pathExists(join(projectRoot, ".git"))
  ]);

  return {
    archiveCount,
    conceptsCount,
    draftsCount,
    entitiesCount,
    hasGit,
    hasIndex,
    hasLog,
    inboxCount,
    logEntries,
    topicsCount
  };
}

async function countSourceFiles(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir);
    return entries.filter(
      (entry) => entry !== ".gitkeep" && !entry.startsWith(".git")
    ).length;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return 0;
    }
    throw error;
  }
}

async function countMarkdownPages(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir);
    return entries.filter((entry) => entry.endsWith(".md") && entry !== "README.md").length;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return 0;
    }
    throw error;
  }
}

async function countLogEntries(logPath: string): Promise<number> {
  try {
    const content = await readFile(logPath, "utf8");
    return content.split("\n").filter((line) => /^\s*-\s+\d{4}-\d{2}-\d{2}/.test(line)).length;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return 0;
    }
    throw error;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
