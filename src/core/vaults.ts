import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { CONFIG_FILENAME } from "./config.ts";

export const REGISTRY_PATH = join(homedir(), ".second-brain", "vaults.json");
export const REGISTRY_VERSION = 1;

export interface VaultsRegistry {
  version: number;
  vaults: string[];
}

export async function loadRegistry(): Promise<VaultsRegistry> {
  try {
    const raw = await readFile(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<VaultsRegistry>;
    return normalizeRegistry(parsed);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return { version: REGISTRY_VERSION, vaults: [] };
    }
    throw error;
  }
}

export async function saveRegistry(registry: VaultsRegistry): Promise<void> {
  await mkdir(dirname(REGISTRY_PATH), { recursive: true });
  await writeFile(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export async function addVaultToRegistry(
  vaultPath: string
): Promise<{ added: boolean; registry: VaultsRegistry }> {
  const absolute = resolve(vaultPath);
  const registry = await loadRegistry();
  if (registry.vaults.includes(absolute)) {
    return { added: false, registry };
  }
  const next: VaultsRegistry = {
    ...registry,
    vaults: [...registry.vaults, absolute].sort()
  };
  await saveRegistry(next);
  return { added: true, registry: next };
}

export async function removeVaultFromRegistry(
  vaultPath: string
): Promise<{ registry: VaultsRegistry; removed: boolean }> {
  const absolute = resolve(vaultPath);
  const registry = await loadRegistry();
  if (!registry.vaults.includes(absolute)) {
    return { registry, removed: false };
  }
  const next: VaultsRegistry = {
    ...registry,
    vaults: registry.vaults.filter((v) => v !== absolute)
  };
  await saveRegistry(next);
  return { registry: next, removed: true };
}

export async function pathHasConfig(vaultPath: string): Promise<boolean> {
  try {
    await stat(join(vaultPath, CONFIG_FILENAME));
    return true;
  } catch {
    return false;
  }
}

function normalizeRegistry(parsed: Partial<VaultsRegistry>): VaultsRegistry {
  const vaults = Array.isArray(parsed.vaults)
    ? parsed.vaults
        .filter((v): v is string => typeof v === "string")
        .map((v) => resolve(v))
        .filter((v, i, all) => all.indexOf(v) === i)
        .sort()
    : [];
  return {
    version: typeof parsed.version === "number" ? parsed.version : REGISTRY_VERSION,
    vaults
  };
}
