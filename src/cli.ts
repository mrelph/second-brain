#!/usr/bin/env node

import { parseConfigArgs, runConfigCommand } from "./commands/config.ts";
import { parseInitArgs, runInitCommand } from "./commands/init.ts";
import { parseSchemaArgs, runSchemaCommand } from "./commands/schema.ts";
import { parseUpgradeArgs, runUpgradeCommand } from "./commands/upgrade.ts";

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log("0.1.0");
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

  throw new Error(`Unknown command: ${command}`);
}

function printHelp(): void {
  console.log("second-brain");
  console.log("");
  console.log("Scaffold and manage an LLM Wiki-style personal knowledge base.");
  console.log("");
  console.log("Usage:");
  console.log("  second-brain init [directory] [--name <name>] [--force] [--no-git]");
  console.log("  second-brain schema [--agent <codex|claude-code|opencode|pi|generic>] [options]");
  console.log("  second-brain upgrade [--agent <codex|claude-code|opencode|pi|generic>] [--dry-run]");
  console.log("  second-brain config [show|get|set|init] [...]");
  console.log("");
  console.log("Commands:");
  console.log("  init     Scaffold a second-brain repository");
  console.log("  schema   Generate agent instructions for wiki maintenance");
  console.log("  upgrade  Refresh managed schema instructions to the latest version");
  console.log("  config   Manage .second-brain.json project settings");
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`second-brain: ${message}`);
  process.exitCode = 1;
});
