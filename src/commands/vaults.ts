import { resolve } from "node:path";
import {
  addVaultToRegistry,
  loadRegistry,
  pathHasConfig,
  removeVaultFromRegistry,
  REGISTRY_PATH
} from "../core/vaults.ts";

export interface VaultsCommandOptions {
  action: "list" | "add" | "remove";
  json?: boolean;
  path?: string;
}

export async function runVaultsCommand(options: VaultsCommandOptions): Promise<void> {
  if (options.action === "list") {
    await runList(options.json ?? false);
    return;
  }

  if (options.action === "add") {
    await runAdd(options.path);
    return;
  }

  if (options.action === "remove") {
    await runRemove(options.path);
    return;
  }
}

async function runList(asJson: boolean): Promise<void> {
  const registry = await loadRegistry();

  if (asJson) {
    console.log(
      JSON.stringify(
        { registryPath: REGISTRY_PATH, version: registry.version, vaults: registry.vaults },
        null,
        2
      )
    );
    return;
  }

  if (registry.vaults.length === 0) {
    console.log("No second-brain vaults registered on this machine.");
    console.log("Add one with: second-brain vaults add <path>");
    console.log(`Registry: ${REGISTRY_PATH}`);
    return;
  }

  console.log(`Registered vaults (${registry.vaults.length}):`);
  for (const path of registry.vaults) {
    const exists = await pathHasConfig(path);
    const marker = exists ? "  " : "  (missing) ";
    console.log(`${marker}${path}`);
  }
  console.log(`Registry: ${REGISTRY_PATH}`);
}

async function runAdd(path: string | undefined): Promise<void> {
  if (!path) {
    throw new Error("Usage: second-brain vaults add <path>");
  }
  const absolute = resolve(path);
  if (!(await pathHasConfig(absolute))) {
    throw new Error(
      `${absolute} is not a second-brain vault (no .second-brain.json found). ` +
        `Run \`second-brain init --directory ${absolute}\` to create one — ` +
        `it will be auto-registered on success.`
    );
  }
  const { added } = await addVaultToRegistry(absolute);
  console.log(added ? `Added: ${absolute}` : `Already registered: ${absolute}`);
}

async function runRemove(path: string | undefined): Promise<void> {
  if (!path) {
    throw new Error("Usage: second-brain vaults remove <path>");
  }
  const absolute = resolve(path);
  const { removed } = await removeVaultFromRegistry(absolute);
  console.log(removed ? `Removed: ${absolute}` : `Not registered: ${absolute}`);
}

export function parseVaultsArgs(args: string[]): VaultsCommandOptions {
  if (args.length === 0) {
    return { action: "list" };
  }

  let action: VaultsCommandOptions["action"] | undefined;
  let json = false;
  let path: string | undefined;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (action === undefined) {
      if (arg === "list" || arg === "add" || arg === "remove") {
        action = arg;
        continue;
      }
      throw new Error(`Unknown vaults action: ${arg}`);
    }
    if (path === undefined) {
      path = arg;
      continue;
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  if (action === undefined) {
    return { action: "list", json };
  }
  if (action === "list") {
    return { action, json };
  }
  return path !== undefined ? { action, json, path } : { action, json };
}
