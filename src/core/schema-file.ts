import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type SecondBrainConfig } from "./config.ts";
import {
  CUSTOM_END,
  CUSTOM_START,
  getSchemaFilename,
  MANAGED_END,
  MANAGED_START,
  renderAgentSchemaTemplate,
  type AgentKind
} from "../templates/schema.ts";

export interface GeneratedSchemaFile {
  content: string;
  path: string;
}

export interface SchemaState {
  currentContent: string | null;
  customContent: string;
  filePath: string;
  version: number | null;
}

export function buildSchemaFile(
  projectRoot: string,
  config: SecondBrainConfig,
  agent: AgentKind
): GeneratedSchemaFile {
  const fileName = getSchemaFilename(agent);
  const path = join(projectRoot, fileName);
  const content = renderAgentSchemaTemplate({
    agent,
    commonQueries: config.schema.commonQueries,
    customCategories: config.categories,
    domain: config.schema.domain,
    entityTypes: config.schema.entityTypes,
    frontmatter: config.wiki.frontmatter,
    pageNaming: config.wiki.pageNaming,
    projectName: config.projectName,
    sourceHandling: renderSourceHandling(config.sourceHandling.mode),
    styleGuide: config.schema.styleGuide,
    wikiLinkStyle: config.wiki.linkStyle
  });

  return { content, path };
}

export async function readSchemaState(
  projectRoot: string,
  agent: AgentKind
): Promise<SchemaState> {
  const filePath = join(projectRoot, getSchemaFilename(agent));

  try {
    const currentContent = await readFile(filePath, "utf8");
    return {
      currentContent,
      customContent: extractCustomBlock(currentContent),
      filePath,
      version: extractSchemaVersion(currentContent)
    };
  } catch {
    return {
      currentContent: null,
      customContent: "",
      filePath,
      version: null
    };
  }
}

export async function writeSchemaFile(
  projectRoot: string,
  config: SecondBrainConfig,
  agent: AgentKind,
  preservedCustomContent: string
): Promise<GeneratedSchemaFile> {
  const generated = buildSchemaFile(projectRoot, config, agent);
  const content = applyCustomBlock(generated.content, preservedCustomContent);
  await writeFile(generated.path, content, "utf8");

  return {
    content,
    path: generated.path
  };
}

export function applyCustomBlock(content: string, customContent: string): string {
  const trimmed = customContent.trim();
  const startIndex = content.indexOf(CUSTOM_START);
  const endIndex = content.indexOf(CUSTOM_END);
  const markersValid = startIndex !== -1 && endIndex !== -1 && endIndex > startIndex;

  if (!trimmed) {
    return content;
  }

  if (!markersValid) {
    throw new Error(
      "Generated schema file is missing custom-content markers; refusing to drop preserved customizations."
    );
  }

  const replacement = [CUSTOM_START, trimmed, CUSTOM_END].join("\n");
  return `${content.slice(0, startIndex)}${replacement}${content.slice(endIndex + CUSTOM_END.length)}`;
}

export function extractCustomBlock(content: string): string {
  const startIndex = content.indexOf(CUSTOM_START);
  const endIndex = content.indexOf(CUSTOM_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return "";
  }

  return content.slice(startIndex + CUSTOM_START.length, endIndex).trim();
}

export function extractSchemaVersion(content: string): number | null {
  const startIndex = content.indexOf(MANAGED_START);
  const endIndex = content.indexOf(MANAGED_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null;
  }

  const managedSection = content.slice(startIndex + MANAGED_START.length, endIndex);
  const match = managedSection.match(/schema-version:\s*(\d+)/);
  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function renderSourceHandling(mode: SecondBrainConfig["sourceHandling"]["mode"]): string {
  switch (mode) {
    case "leave-in-inbox":
      return "Leave processed sources in `sources/inbox/` unless the user explicitly asks you to archive them.";
    case "archive-after-ingest":
      return "After a successful ingest pass, move or copy processed sources into `sources/archive/` while preserving user data.";
    case "user-directed":
      return "Do not archive or move sources automatically; follow the user’s instructions for inbox versus archive handling.";
  }
}
