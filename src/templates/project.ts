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
  const decisionsLink = useWikilinks ? "[[decisions]]" : "[decisions](decisions.md)";
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
    `- ${decisionsLink}`,
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

export function renderDecisionsTemplate(): string {
  return [
    "# Wiki Decisions",
    "",
    "Durable structural choices about how this wiki is organized. Read this before structural work (merges, renames, category changes) so past conventions aren't re-litigated. Append a new entry when you make a decision that should bind future sessions.",
    "",
    "Decisions are different from log entries:",
    "",
    "- `wiki/log.md` records *what happened* (\"Ingested 3 papers on YYYY-MM-DD\").",
    "- `wiki/decisions.md` records *what should keep happening* (\"Treat 'Transformers' and 'Transformer Architecture' as the same page going forward\").",
    "",
    "## Entries",
    "",
    "Append newest first. Keep each entry to 2–4 lines: what was decided, why, and what future passes should do.",
    "",
    "<!-- Example shape (delete once you have real entries):",
    "",
    "### YYYY-MM-DD — Example decision title",
    "",
    "**Decision:** Short statement of what was decided.",
    "**Why:** The reason — user preference, overlap observation, naming conflict.",
    "**Scope:** What future passes should do differently.",
    "",
    "-->",
    ""
  ].join("\n");
}

export function renderFolderReadmeTemplate(title: string, description: string): string {
  return [`# ${title}`, "", description, ""].join("\n");
}
