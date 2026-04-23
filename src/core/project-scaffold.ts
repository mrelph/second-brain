import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { createDefaultConfig } from "./config.ts";
import { writeSchemaFile } from "./schema-file.ts";
import { runGitInit } from "../utils/git.ts";
import {
  renderFolderReadmeTemplate,
  renderGitKeep,
  renderIndexTemplate,
  renderLogTemplate,
  renderWorkspaceReadmeTemplate
} from "../templates/project.ts";

export interface ScaffoldOptions {
  force: boolean;
  initGit: boolean;
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

  const projectName = options.projectName?.trim() || basename(options.targetDir);
  const config = createDefaultConfig({
    defaultAgent: "codex",
    projectName
  });
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
      content: renderIndexTemplate(projectName)
    },
    {
      path: "wiki/log.md",
      content: renderLogTemplate()
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
      content: renderGitKeep()
    },
    {
      path: "sources/archive/.gitkeep",
      content: renderGitKeep()
    },
    {
      path: "wiki/drafts/.gitkeep",
      content: renderGitKeep()
    },
    {
      path: "wiki/assets/.gitkeep",
      content: renderGitKeep()
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
}

function withTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}
