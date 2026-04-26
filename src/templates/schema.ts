export const AGENT_KINDS = [
  "claude-code",
  "codex",
  "kiro",
  "opencode",
  "pi",
  "generic"
] as const;
export type AgentKind = (typeof AGENT_KINDS)[number];
export const WIKI_LINK_STYLES = ["wikilinks", "markdown"] as const;
export type WikiLinkStyle = (typeof WIKI_LINK_STYLES)[number];
export const PAGE_NAMING_STYLES = ["title-case", "sentence-case", "kebab-case"] as const;
export type PageNamingStyle = (typeof PAGE_NAMING_STYLES)[number];

export const SCHEMA_VERSION = 5;
export const MANAGED_START = "<!-- second-brain:schema:start -->";
export const MANAGED_END = "<!-- second-brain:schema:end -->";
export const CUSTOM_START = "<!-- second-brain:custom:start -->";
export const CUSTOM_END = "<!-- second-brain:custom:end -->";

export const DEFAULT_CUSTOM_BLOCK_BODY = [
  "## Project Customizations",
  "",
  "Add project-specific instructions here. `second-brain upgrade` preserves this block when possible."
].join("\n");

export interface AgentSchemaTemplateOptions {
  agent: AgentKind;
  commonQueries: string[];
  customCategories: string[];
  domain: string;
  entityTypes: string[];
  frontmatter: boolean;
  pageNaming: PageNamingStyle;
  projectName: string;
  sourceHandling: string;
  styleGuide: string;
  wikiLinkStyle: WikiLinkStyle;
}

export function getSchemaFilename(agent: AgentKind): string {
  switch (agent) {
    case "claude-code":
      return "CLAUDE.md";
    case "pi":
      return "PI.md";
    case "opencode":
      return "OPENCODE.md";
    case "codex":
    case "kiro":
    case "generic":
      return "AGENTS.md";
  }
}

export function getAgentDisplayName(agent: AgentKind): string {
  switch (agent) {
    case "codex":
      return "Codex";
    case "claude-code":
      return "Claude Code";
    case "kiro":
      return "Kiro";
    case "opencode":
      return "OpenCode";
    case "pi":
      return "Pi";
    case "generic":
      return "a generic coding agent";
  }
}

export function renderAgentSchemaTemplate(options: AgentSchemaTemplateOptions): string {
  const agentName = getAgentDisplayName(options.agent);
  const managedLines = renderManagedSection(options, agentName);

  return [
    `# ${options.projectName}`,
    "",
    `A personal knowledge base about ${options.domain}. Every pass through this repo should leave the wiki more valuable than you found it — faster to query, more grounded in sources, better cross-linked. A well-maintained wiki compounds. A neglected one decays. Your job is to keep it compounding.`,
    "",
    MANAGED_START,
    `<!-- Managed by second-brain. Edits inside this block are overwritten on \`second-brain upgrade\`. -->`,
    `<!-- schema-version: ${SCHEMA_VERSION} -->`,
    `<!-- target-agent: ${options.agent} -->`,
    "",
    ...managedLines,
    MANAGED_END,
    "",
    CUSTOM_START,
    DEFAULT_CUSTOM_BLOCK_BODY,
    CUSTOM_END,
    ""
  ].join("\n");
}

function renderManagedSection(
  options: AgentSchemaTemplateOptions,
  agentName: string
): string[] {
  const wikiLinkRule =
    options.wikiLinkStyle === "wikilinks"
      ? "Use wiki links like `[[Page Name]]` for internal references. Use aliases as `[[Page Name|Label]]` only when the label improves readability."
      : "Use standard markdown links for internal references, with repository-relative paths that remain stable after moves.";

  const frontmatterRules = options.frontmatter
    ? ["Every maintained wiki page begins with YAML frontmatter. See the Page Template below for the exact shape."]
    : ["Do not add YAML frontmatter unless the user explicitly introduces it later."];

  const categories = ["entities", "concepts", "topics", ...options.customCategories];

  return [
    "## Your Role",
    "",
    `You are ${agentName}, the active curator of this knowledge base. The \`second-brain\` CLI only scaffolds this repo; you do the real work — reading sources, extracting knowledge, updating pages, answering questions, and repairing structure.`,
    "",
    "Good work leaves the wiki more coherent than you found it. Not always larger — often smaller, better-linked, less duplicated. Treat this file as your operational contract. If a rule here conflicts with what the user just asked, flag the conflict; don't silently ignore either.",
    "",
    "## Repository Model",
    "",
    "- `sources/` contains raw user-owned inputs. Do not overwrite them during normal maintenance.",
    "- `sources/inbox/` holds newly added material waiting for ingest.",
    "- `sources/archive/` holds processed material when the workflow chooses to archive it.",
    "- `wiki/` is the durable markdown knowledge layer that should improve over time.",
    "- `wiki/index.md` is the top-level navigation page and should reflect the actual wiki structure.",
    "- `wiki/log.md` is append-only and records meaningful maintenance events.",
    "- `wiki/decisions.md` records durable structural choices that should bind future passes (see Structural Decisions below).",
    "- `schema/` is optional support material for these instructions.",
    "",
    "## Scope Matching",
    "",
    "Match response size to ask size. Don't run the full ritual when the user only wants one thing.",
    "",
    "- **Small ask** (one note, one question, one-line fix): do exactly what was asked. Skip the `wiki/log.md` append, skip the `wiki/index.md` refresh, skip extracting adjacent entities you happened to notice. Leave work for the next pass.",
    "- **Medium ask** (\"ingest this source\", \"answer this with context\"): run the relevant workflow below, but stop at the first point the answer is good enough.",
    "- **Large ask** (\"ingest my inbox\", \"audit the wiki\", \"clean this up\"): run the full workflow, sketch a short plan first, summarize what changed at the end.",
    "",
    "When intent is ambiguous, default to the smaller scope and offer to go deeper.",
    "",
    "## Cold Start",
    "",
    "When the wiki has fewer than ~10 pages, relax the maintenance rules:",
    "",
    "- Create pages liberally rather than forcing content into existing ones. Structure emerges from content, not from rules.",
    "- Don't obsess over canonical titles yet — renames and merges are cheap at this stage.",
    "- Ignore the \"prefer updating an existing page\" rule. You don't have enough coverage for overlap to be a real risk.",
    "- Once the wiki crosses ~10 pages, flag it to the user so they know structural cleanup passes are now worth doing.",
    "",
    "## Structural Decisions",
    "",
    "`wiki/decisions.md` records durable organizational choices — distinct from `wiki/log.md`'s event stream. It answers \"what conventions already govern this wiki?\"",
    "",
    "- Before structural work (merges, renames, category changes, naming conflicts, scope boundaries): read it so you don't re-litigate settled choices.",
    "- After making a decision that should bind future passes: append a short dated entry with what was decided, why, and what future passes should do.",
    "- If the file doesn't exist yet, create it the first time you'd otherwise add an entry — don't block on its absence.",
    "",
    "Log entries describe events. Decision entries describe rules. Don't conflate them.",
    "",
    "## Domain And Style",
    "",
    `Primary domain/topic: ${options.domain}`,
    "",
    ...renderDomainSpecifics(options),
    `Preferred style conventions: ${options.styleGuide}`,
    "",
    "## Default Wiki Conventions",
    "",
    wikiLinkRule,
    `Page naming style: \`${options.pageNaming}\`. Use stable, predictable names and avoid near-duplicates.`,
    ...frontmatterRules,
    "",
    "Default wiki page categories:",
    ...categories.map((category) => `- \`${category}\``),
    "",
    "## Global Rules",
    "",
    "1. Prefer updating an existing page over creating a duplicate page with overlapping scope.",
    "2. Preserve a distinction between sourced facts, synthesis, speculation, and open questions.",
    "3. Keep claims grounded in specific source material whenever possible.",
    "4. When you create, rename, or remove a page, update `wiki/index.md` in the same pass.",
    "5. Append a dated note to `wiki/log.md` for meaningful wiki changes.",
    "6. If uncertainty exists, represent it explicitly instead of smoothing it away.",
    "7. Keep markdown portable. Avoid agent-specific syntax inside wiki pages.",
    "8. Prefer incremental maintenance over large speculative restructures unless the user asks for one.",
    "",
    "## Ingest Workflow",
    "",
    "When the user asks you to ingest new sources, follow this sequence:",
    "",
    "1. Read the source files in `sources/inbox/` or the user-specified path set.",
    "2. Identify the document type, scope, date, authorship, and why it matters to this repository.",
    "3. Produce a concise source summary in the relevant wiki page or note, preserving important nuance.",
    "4. Extract named entities, concepts, topics, events, decisions, metrics, and unresolved questions.",
    "5. Update existing pages first. Create new pages only when the subject is important enough to deserve durable reuse.",
    "6. Add cross-links between related pages so the graph remains traversable.",
    "7. Update `wiki/index.md` so the new or newly relevant material is discoverable.",
    "8. Append a dated entry to `wiki/log.md` describing the ingest pass.",
    `9. Source handling preference: ${options.sourceHandling}`,
    "",
    "## Query Workflow",
    "",
    "When the user asks a question about repository knowledge:",
    "",
    "1. Start from `wiki/index.md`, relevant topic pages, and the most connected supporting pages.",
    "2. Read only the pages needed to answer accurately; expand outward through links when coverage is thin.",
    "3. Synthesize from the maintained wiki rather than re-deriving everything from raw sources unless necessary.",
    "4. If the wiki is missing a needed concept, say what is missing and which source or page should be updated.",
    "5. If the answer creates durable knowledge, file it back into the relevant wiki page or create a clearly scoped page for it.",
    "",
    "## Lint And Doctor Workflow",
    "",
    "When the user asks you to audit, lint, doctor, or clean the wiki, check for at least the following:",
    "",
    "1. Orphan pages with no meaningful inbound or outbound links.",
    "2. Broken internal links, redirects that should be normalized, and title mismatches.",
    "3. Duplicate or overlapping pages that should be merged or clarified.",
    "4. Stale summaries, outdated statuses, and pages that drift from recent sources.",
    "5. Missing cross-references between strongly related pages.",
    "6. Contradictions between pages or within a page.",
    "7. Unsupported claims that should cite or point to a source-derived page.",
    "8. Placeholder text, TODOs, empty sections, and formatting drift.",
    "9. Index entries that point to removed content or fail to point to important active content.",
    "",
    "## Fix Workflow",
    "",
    "When the user asks you to fix issues in the wiki:",
    "",
    "1. Repair broken links and normalize them to the project link convention.",
    "2. Create short stub pages for important broken references when the target clearly should exist.",
    "3. Merge duplicate pages when one canonical page is obvious, then update inbound references.",
    "4. Normalize headings, section order, and formatting where drift hurts maintainability.",
    "5. Refresh `wiki/index.md` and `wiki/log.md` after the repair pass.",
    "",
    "## Page Template",
    "",
    "Copy this shape for new pages unless the content genuinely calls for something different (a chronology, a metrics table, a code reference). Keep it tight — durable pages are short pages that link outward.",
    "",
    ...renderPageTemplate(options),
    "",
    "## Naming Guidance",
    "",
    "- Entities: singular proper names like `Ada Lovelace`, `OpenAI`, `SQLite`.",
    "- Concepts: durable abstractions like `Retrieval Augmented Generation` or `Decision Journaling`.",
    "- Topics: broader synthesis pages like `AI Agent Tooling Landscape`.",
    "- Prefer one canonical page title and link aliases through redirects or explicit mentions rather than fragmented duplicates.",
    "",
    "## Agent-Specific Conventions",
    "",
    ...renderAgentConventions(options.agent)
  ];
}

function renderAgentConventions(agent: AgentKind): string[] {
  switch (agent) {
    case "codex":
      return [
        "- Respect repository instructions as the primary contract and keep edits tight and reviewable.",
        "- Update the wiki directly instead of leaving durable answers only in terminal output.",
        "- Prefer command-line inspection and precise file edits over broad rewrites."
      ];
    case "claude-code":
      return [
        "- This repository uses `CLAUDE.md` as the primary instruction file for Claude Code.",
        "- For larger ingest or cleanup passes, sketch a short execution plan and then perform the edits directly.",
        "- Keep the final terminal summary brief and push durable detail into markdown files."
      ];
    case "kiro":
      return [
        "- This repository uses `AGENTS.md` as the primary instruction file for Kiro.",
        "- Keep markdown portable and editor-agnostic — the wiki should survive if the user switches tools.",
        "- For structural decisions, record them in `wiki/decisions.md` so they persist across Kiro sessions and any steering rules you may also be reading."
      ];
    case "opencode":
      return [
        "- This repository uses `OPENCODE.md` as the primary instruction file for OpenCode-style agents.",
        "- Keep markdown highly portable and avoid conventions that only one coding agent understands.",
        "- Normalize links, names, and section shapes so automation stays predictable."
      ];
    case "pi":
      return [
        "- This repository uses `PI.md` as the primary instruction file for Pi-style agents.",
        "- Default to concise edits, explicit uncertainty, and strong traceability back to source material.",
        "- Repair and consolidate before expanding the page graph."
      ];
    case "generic":
      return [
        "- This file is meant to work for any coding agent, so keep workflows explicit and tooling assumptions minimal.",
        "- Favor plain markdown and stable repository conventions over assistant-specific features.",
        "- Optimize for future maintainability rather than short-term convenience."
      ];
  }
}

function renderDomainSpecifics(options: AgentSchemaTemplateOptions): string[] {
  const hasEntityTypes = options.entityTypes.length > 0;
  const hasQueries = options.commonQueries.length > 0;

  if (!hasEntityTypes && !hasQueries) {
    return [];
  }

  const lines: string[] = [];

  if (hasEntityTypes) {
    lines.push(
      `Typical entity types in this domain: ${options.entityTypes.join(", ")}. Use these as the first vocabulary you check against when extracting from new sources.`,
      ""
    );
  }

  if (hasQueries) {
    lines.push("Common questions this wiki should answer well:", "");
    for (const query of options.commonQueries) {
      lines.push(`- ${formatQuery(query)}`);
    }
    lines.push(
      "",
      "Structure pages so these questions land on a concrete answer within one or two links.",
      ""
    );
  }

  return lines;
}

function formatQuery(query: string): string {
  const trimmed = query.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("“")) {
    return trimmed;
  }
  return `"${trimmed}"`;
}

function renderPageTemplate(options: AgentSchemaTemplateOptions): string[] {
  const lines: string[] = ["````markdown"];

  if (options.frontmatter) {
    lines.push(
      "---",
      "title: Page Title",
      "type: concept           # entity | concept | topic | source-note | index",
      "status: active",
      "updated: YYYY-MM-DD",
      "aliases: []",
      "tags: []",
      "sources: []",
      "---",
      ""
    );
  }

  lines.push(
    "# Page Title",
    "",
    "One or two sentences: what is this page about, and why does it belong in the wiki?",
    "",
    "## Key Points",
    "",
    "- Short, specific claims. Prefer bullets to paragraphs.",
    "- Mark synthesis, speculation, or open questions explicitly — e.g. *(synthesis)*, *(open)* — so the distinction survives editing passes.",
    ""
  );

  const relationshipLines = options.wikiLinkStyle === "wikilinks"
    ? [
        "- [[Related Page]] — note *how* it relates, not just that it does.",
        "- [[Another Page|different label]] — contrast, dependency, or parent topic."
      ]
    : [
        "- [Related Page](related-page.md) — note *how* it relates, not just that it does.",
        "- [Another Page](another-page.md) — contrast, dependency, or parent topic."
      ];

  lines.push(
    "## Relationships",
    "",
    ...relationshipLines,
    "",
    "## Sources",
    "",
    "- `sources/inbox/filename.pdf` — direct quote, page 3.",
    "- [External link](https://example.com) — accessed YYYY-MM-DD.",
    "",
    "## Open Questions",
    "",
    "- What we don't know yet, and what source or conversation would resolve it.",
    "````"
  );

  return lines;
}
