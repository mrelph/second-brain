#!/usr/bin/env node

import { parseInitArgs, runInitCommand } from "./commands/init.ts";

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

  throw new Error(`Unknown command: ${command}`);
}

function printHelp(): void {
  console.log("second-brain");
  console.log("");
  console.log("Scaffold and manage an LLM Wiki-style personal knowledge base.");
  console.log("");
  console.log("Usage:");
  console.log("  second-brain init [directory] [--name <name>] [--force] [--no-git]");
  console.log("");
  console.log("Planned commands:");
  console.log("  ingest   Process a new source into the wiki layer");
  console.log("  query    Answer questions from the wiki layer");
  console.log("  lint     Check wiki health and structure");
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`second-brain: ${message}`);
  process.exitCode = 1;
});
