#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseConfigArgs, runConfigCommand } from "./commands/config.ts";
import { parseDoctorArgs, runDoctorCommand } from "./commands/doctor.ts";
import { parseInitArgs, runInitCommand } from "./commands/init.ts";
import { parseSchemaArgs, runSchemaCommand } from "./commands/schema.ts";
import { parseUpgradeArgs, runUpgradeCommand } from "./commands/upgrade.ts";

const CLI_VERSION = resolveCliVersion();

function resolveCliVersion(): string {
  if (process.env.SB_BUILD_VERSION) {
    return process.env.SB_BUILD_VERSION;
  }
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
    return parsed.version;
  } catch {
    return "unknown";
  }
}

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(CLI_VERSION);
    return;
  }

  if (command === "init") {
    await runInitCommand(parseInitArgs(rest));
    return;
  }

  if (command === "schema") {
    await runSchemaCommand(parseSchemaArgs(rest));
    return;
  }

  if (command === "upgrade") {
    await runUpgradeCommand(parseUpgradeArgs(rest));
    return;
  }

  if (command === "config") {
    await runConfigCommand(parseConfigArgs(rest));
    return;
  }

  if (command === "doctor") {
    await runDoctorCommand(parseDoctorArgs(rest));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function printHelp(): void {
  console.log("second-brain — a personal knowledge base your AI assistant can maintain.");
  console.log("");
  console.log("Drop notes, documents, and links into a folder. Point your coding");
  console.log("assistant (Claude Code, Codex, etc.) at it. It'll organize them into a");
  console.log("searchable wiki you own.");
  console.log("");
  console.log("Commands:");
  console.log("  init      Set up a new knowledge base in this folder (runs a short wizard)");
  console.log("  doctor    Show a summary of your knowledge base and any suggested next steps");
  console.log("  schema    Refresh your assistant's instructions — change agent, domain, style");
  console.log("  upgrade   Update your assistant's instructions to the latest version");
  console.log("  config    Show or change your knowledge base settings");
  console.log("");
  console.log("Quick start:");
  console.log("  second-brain init                   # guided setup");
  console.log("  second-brain init --agent claude-code --name \"My Notes\"");
  console.log("  second-brain doctor                 # check status + get suggestions");
  console.log("  second-brain upgrade --dry-run      # preview changes before applying");
  console.log("");
  console.log("Full options:");
  console.log("  init      [directory] [--name <name>] [--agent <kind>] [--domain <text>]");
  console.log("            [--wikilinks|--markdown-links] [--force] [--no-git] [-i]");
  console.log("  schema    [--agent <kind>] [--domain <text>] [--style <text>]");
  console.log("            [--wikilinks|--markdown-links] [--interactive]");
  console.log("  upgrade   [--agent <kind>] [--dry-run] [--yes]");
  console.log("  config    [show|get|set|init] [key] [value]");
  console.log("  doctor    [--directory <path>]");
  console.log("");
  console.log("  Assistants: claude-code, codex, opencode, pi, generic");
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`second-brain: ${message}`);
  process.exitCode = 1;
});
