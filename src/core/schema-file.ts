import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type SecondBrainConfig } from "./config.ts";
import {
  ASSISTANT_END,
  ASSISTANT_START,
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

export interface PreservedSchemaContent {
  assistant: string;
  custom: string;
}

export interface SchemaState {
  assistantContent: string;
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
      assistantContent: extractAssistantBlock(currentContent),
      currentContent,
      customContent: extractCustomBlock(currentContent),
      filePath,
      version: extractSchemaVersion(currentContent)
    };
  } catch {
    return {
      assistantContent: "",
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
  preserved: PreservedSchemaContent
): Promise<GeneratedSchemaFile> {
  const generated = buildSchemaFile(projectRoot, config, agent);
  let content = applyCustomBlock(generated.content, preserved.custom);
  content = applyAssistantBlock(content, preserved.assistant);
  await writeFile(generated.path, content, "utf8");

  return {
    content,
    path: generated.path
  };
}

export function applyCustomBlock(content: string, customContent: string): string {
  return spliceBlock(content, CUSTOM_START, CUSTOM_END, customContent, "custom");
}

export function applyAssistantBlock(content: string, assistantContent: string): string {
  return spliceBlock(content, ASSISTANT_START, ASSISTANT_END, assistantContent, "assistant");
}

function spliceBlock(
  content: string,
  startMarker: string,
  endMarker: string,
  preservedBody: string,
  blockName: string
): string {
  const trimmed = preservedBody.trim();
  if (!trimmed) {
    return content;
  }

  const searchFrom = findContentRegionStart(content);
  const startIndex = content.indexOf(startMarker, searchFrom);
  const endIndex = content.indexOf(endMarker, searchFrom);
  const markersValid = startIndex !== -1 && endIndex !== -1 && endIndex > startIndex;

  if (!markersValid) {
    throw new Error(
      `Generated schema file is missing ${blockName}-content markers; refusing to drop preserved content.`
    );
  }

  const replacement = [startMarker, trimmed, endMarker].join("\n");
  return `${content.slice(0, startIndex)}${replacement}${content.slice(endIndex + endMarker.length)}`;
}

export function extractCustomBlock(content: string): string {
  return extractBlock(content, CUSTOM_START, CUSTOM_END);
}

export function extractAssistantBlock(content: string): string {
  return extractBlock(content, ASSISTANT_START, ASSISTANT_END);
}

function extractBlock(content: string, startMarker: string, endMarker: string): string {
  const searchFrom = findContentRegionStart(content);
  const startIndex = content.indexOf(startMarker, searchFrom);
  const endIndex = content.indexOf(endMarker, searchFrom);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return "";
  }

  return content.slice(startIndex + startMarker.length, endIndex).trim();
}

/**
 * The custom and assistant blocks always live AFTER the managed block. Searching
 * from after MANAGED_END means the parser ignores any literal marker strings
 * that happen to appear inside the managed prose itself (e.g., when the prose
 * documents the marker by name).
 */
function findContentRegionStart(content: string): number {
  const managedEndIndex = content.indexOf(MANAGED_END);
  if (managedEndIndex === -1) {
    return 0;
  }
  return managedEndIndex + MANAGED_END.length;
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
