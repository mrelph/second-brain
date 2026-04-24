export function renderWorkspaceReadmeTemplate(projectName: string): string {
  return [
    `# ${projectName}`,
    "",
    "This is a `second-brain` workspace: a git-backed, Obsidian-friendly personal knowledge base organized around the LLM Wiki pattern.",
    "",
    "## Structure",
    "",
    "- `sources/`: raw, user-owned inputs",
    "- `wiki/`: maintained markdown knowledge layer",
    "- `.second-brain.json`: project-level configuration for schema generation",
    "- `AGENTS.md` / `CLAUDE.md` / `OPENCODE.md` / `PI.md`: generated instruction file for the chosen coding agent",
    "",
    "## Workflow",
    "",
    "1. Drop new files into `sources/inbox/`.",
    "2. Run `second-brain schema --agent <agent>` to generate or refresh the agent instructions.",
    "3. Let your coding agent do the actual ingest, query, and wiki maintenance work using those instructions.",
    "4. Run `second-brain upgrade` when the CLI ships improved managed instructions.",
    ""
  ].join("\n");
}

export function renderIndexTemplate(
  projectName: string,
  linkStyle: "wikilinks" | "markdown" = "wikilinks"
): string {
  const useWikilinks = linkStyle === "wikilinks";
  const logLink = useWikilinks ? "[[log]]" : "[log](log.md)";
  const entitiesLink = useWikilinks ? "[[entities/README|Entities]]" : "[Entities](entities/README.md)";
  const conceptsLink = useWikilinks ? "[[concepts/README|Concepts]]" : "[Concepts](concepts/README.md)";
  const topicsLink = useWikilinks ? "[[topics/README|Topics]]" : "[Topics](topics/README.md)";

  return [
    `# ${projectName} Index`,
    "",
    "This is the main navigation page for the wiki layer.",
    "",
    "## Core Pages",
    "",
    `- ${logLink}`,
    "",
    "## Areas",
    "",
    `- ${entitiesLink}`,
    `- ${conceptsLink}`,
    `- ${topicsLink}`,
    "",
    "## Open Questions",
    "",
    "- Capture the most important unresolved questions here.",
    "",
    "## Ingest Queue",
    "",
    "- Track high-priority sources waiting to be processed.",
    ""
  ].join("\n");
}

export function renderLogTemplate(): string {
  return [
    "# Wiki Log",
    "",
    "Append short, dated entries describing meaningful wiki updates.",
    "",
    "## Entries",
    "",
    "- YYYY-MM-DD: Initialized wiki scaffold.",
    ""
  ].join("\n");
}

export function renderFolderReadmeTemplate(title: string, description: string): string {
  return [`# ${title}`, "", description, ""].join("\n");
}
