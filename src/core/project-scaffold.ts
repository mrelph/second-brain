import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { CONFIG_FILENAME, createDefaultConfig, type SecondBrainConfig } from "./config.ts";
import { writeSchemaFile } from "./schema-file.ts";
import { runGitInit } from "../utils/git.ts";
import { type AgentKind, type WikiLinkStyle } from "../templates/schema.ts";
import {
  renderDecisionsTemplate,
  renderFolderReadmeTemplate,
  renderIndexTemplate,
  renderLogTemplate,
  renderWorkspaceReadmeTemplate
} from "../templates/project.ts";

export interface ScaffoldOptions {
  commonQueries?: string[];
  config?: SecondBrainConfig;
  defaultAgent?: AgentKind;
  domain?: string;
  entityTypes?: string[];
  force: boolean;
  initGit: boolean;
  linkStyle?: WikiLinkStyle;
  projectName?: string;
  targetDir: string;
}

export interface ScaffoldResult {
  createdPaths: string[];
  gitInitialized: boolean;
  targetDir: string;
}

interface FileTemplate {
  path: string;
  content: string;
}

const DIRECTORIES = [
  "schema",
  "sources",
  "sources/inbox",
  "sources/archive",
  "wiki",
  "wiki/entities",
  "wiki/concepts",
  "wiki/topics",
  "wiki/drafts",
  "wiki/assets"
] as const;

export async function scaffoldSecondBrainProject(
  options: ScaffoldOptions
): Promise<ScaffoldResult> {
  await ensureTargetDirectory(options.targetDir, options.force);

  const config =
    options.config ??
    createDefaultConfig({
      defaultAgent: options.defaultAgent ?? "codex",
      projectName: options.projectName?.trim() || basename(options.targetDir),
      ...(options.domain ? { domain: options.domain } : {}),
      ...(options.entityTypes ? { entityTypes: options.entityTypes } : {}),
      ...(options.commonQueries ? { commonQueries: options.commonQueries } : {}),
      ...(options.linkStyle ? { linkStyle: options.linkStyle } : {})
    });
  const projectName = config.projectName;
  const createdPaths: string[] = [];

  for (const directory of DIRECTORIES) {
    const fullPath = join(options.targetDir, directory);
    await mkdir(fullPath, { recursive: true });
    createdPaths.push(withTrailingSlash(relative(options.targetDir, fullPath)));
  }

  const files: FileTemplate[] = [
    {
      path: ".second-brain.json",
      content: `${JSON.stringify(config, null, 2)}\n`
    },
    {
      path: "README.md",
      content: renderWorkspaceReadmeTemplate(projectName)
    },
    {
      path: "schema/README.md",
      content: renderFolderReadmeTemplate(
        "Schema",
        "Reserved for supporting schemas, notes, or agent-specific configuration that complements the generated root instruction file."
      )
    },
    {
      path: "wiki/index.md",
      content: renderIndexTemplate(projectName, config.wiki.linkStyle)
    },
    {
      path: "wiki/log.md",
      content: renderLogTemplate()
    },
    {
      path: "wiki/decisions.md",
      content: renderDecisionsTemplate()
    },
    {
      path: "wiki/entities/README.md",
      content: renderFolderReadmeTemplate(
        "Entities",
        "Named people, organizations, tools, projects, places, and other concrete nouns."
      )
    },
    {
      path: "wiki/concepts/README.md",
      content: renderFolderReadmeTemplate(
        "Concepts",
        "Reusable ideas, methods, frameworks, and mental models."
      )
    },
    {
      path: "wiki/topics/README.md",
      content: renderFolderReadmeTemplate(
        "Topics",
        "Broader synthesis pages that combine multiple entities, concepts, and sources."
      )
    },
    {
      path: "sources/inbox/.gitkeep",
      content: ""
    },
    {
      path: "sources/archive/.gitkeep",
      content: ""
    },
    {
      path: "wiki/drafts/.gitkeep",
      content: ""
    },
    {
      path: "wiki/assets/.gitkeep",
      content: ""
    }
  ];

  for (const file of files) {
    const fullPath = join(options.targetDir, file.path);
    await writeFile(fullPath, file.content, "utf8");
    createdPaths.push(relative(options.targetDir, fullPath));
  }

  const generatedSchema = await writeSchemaFile(
    options.targetDir,
    config,
    config.defaultAgent,
    ""
  );
  createdPaths.push(relative(options.targetDir, generatedSchema.path));

  const gitInitialized = options.initGit ? await runGitInit(options.targetDir) : false;

  return {
    createdPaths,
    gitInitialized,
    targetDir: options.targetDir
  };
}

async function ensureTargetDirectory(targetDir: string, force: boolean): Promise<void> {
  await mkdir(targetDir, { recursive: true });

  const entries = await readdir(targetDir);
  if (!force && entries.length > 0) {
    throw new Error(
      `Target directory is not empty: ${targetDir}. Use --force to initialize anyway.`
    );
  }

  if (await pathExists(join(targetDir, CONFIG_FILENAME))) {
    throw new Error(
      `${CONFIG_FILENAME} already exists in ${targetDir}. ` +
        `Refusing to overwrite an existing second-brain project. ` +
        `Use \`second-brain config\` to edit settings, or delete ${CONFIG_FILENAME} first if you truly want to reinitialize.`
    );
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

function withTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}
