export function renderAgentsTemplate(projectName: string): string {
  return [
    "# AGENTS.md",
    "",
    `This repository is a persistent personal knowledge base named \"${projectName}\" following the LLM Wiki pattern.`,
    "",
    "## Purpose",
    "",
    "Maintain a durable, markdown-native wiki that captures stable understanding from user-provided source material. The system should improve over time instead of re-deriving everything from scratch for each query.",
    "",
    "## Repository Layout",
    "",
    "- `sources/`: immutable source material supplied by the user",
    "- `sources/inbox/`: newly added sources awaiting processing",
    "- `sources/archive/`: sources that have already been ingested",
    "- `wiki/index.md`: top-level wiki map and navigation hub",
    "- `wiki/log.md`: append-only operational log of wiki updates",
    "- `wiki/entities/`: pages for people, organizations, projects, places, tools, and named things",
    "- `wiki/concepts/`: pages for concepts, frameworks, methods, and recurring ideas",
    "- `wiki/topics/`: broader synthesis pages spanning multiple sources",
    "- `wiki/drafts/`: temporary working pages during larger refactors or synthesis passes",
    "- `wiki/assets/`: images and auxiliary files referenced by wiki pages",
    "",
    "## Layer Model",
    "",
    "1. Raw sources: never overwrite user source documents.",
    "2. Wiki: maintain interlinked markdown pages using Obsidian wikilinks.",
    "3. Schema: keep this file aligned with how the wiki should be maintained.",
    "",
    "## Editing Rules",
    "",
    "1. Prefer updating existing wiki pages over creating duplicates.",
    "2. Use Obsidian wikilinks like `[[Page Name]]` for important cross-references.",
    "3. Preserve a clear distinction between extracted facts, inferred synthesis, and open questions.",
    "4. Keep claims grounded in specific source documents whenever possible.",
    "5. Append a concise note to `wiki/log.md` for meaningful wiki changes.",
    "6. Keep `wiki/index.md` current as the primary navigation page.",
    "7. When a new entity or concept becomes important across multiple notes, promote it into its own page.",
    "8. If information is uncertain, say so explicitly instead of flattening ambiguity.",
    "",
    "## Source Handling",
    "",
    "1. Treat files in `sources/` as immutable inputs.",
    "2. During ingest, summarize the source, extract entities/concepts, and update relevant wiki pages.",
    "3. Move or copy processed material from `sources/inbox/` to `sources/archive/` only if the workflow requires it; do not delete the original content without explicit instruction.",
    "",
    "## Query Behavior",
    "",
    "1. Answer questions primarily from the wiki layer.",
    "2. If the wiki is insufficient, identify the gap and optionally recommend an ingest or update pass.",
    "3. When a query produces durable insight, consider filing it back into the wiki.",
    "",
    "## Lint Goals",
    "",
    "Check for:",
    "",
    "- orphaned pages with no inbound or outbound links",
    "- duplicate pages covering the same concept",
    "- stale index entries",
    "- unsupported claims or missing source references",
    "- unresolved placeholders, TODOs, and contradictory summaries",
    "",
    "## Style",
    "",
    "- Markdown-first, readable in plain text and Obsidian",
    "- Concise sections with explicit headings",
    "- Use bullets and tables only when they materially improve scanability",
    "- Prefer stable page titles over clever ones",
    ""
  ].join("\n");
}

export function renderWorkspaceReadmeTemplate(projectName: string): string {
  return [
    `# ${projectName}`,
    "",
    "This is a `second-brain` workspace: a git-backed, Obsidian-friendly personal knowledge base organized around the LLM Wiki pattern.",
    "",
    "## Structure",
    "",
    "- `sources/`: raw, user-owned inputs",
    "- `wiki/`: generated and maintained markdown knowledge layer",
    "- `AGENTS.md`: operating schema for coding agents and assistants",
    "",
    "## Workflow",
    "",
    "1. Drop new files into `sources/inbox/`.",
    "2. Run future `second-brain ingest` commands to update the wiki.",
    "3. Use future `second-brain query` and `second-brain lint` commands to explore and maintain the knowledge base.",
    ""
  ].join("\n");
}

export function renderIndexTemplate(projectName: string): string {
  return [
    `# ${projectName} Index`,
    "",
    "This is the main navigation page for the wiki layer.",
    "",
    "## Core Pages",
    "",
    "- [[log]]",
    "",
    "## Areas",
    "",
    "- [[entities/README|Entities]]",
    "- [[concepts/README|Concepts]]",
    "- [[topics/README|Topics]]",
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

export function renderGitKeep(): string {
  return "";
}
