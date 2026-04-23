# second-brain

`second-brain` is a TypeScript CLI for scaffolding and configuring a persistent, Obsidian-friendly personal knowledge base built around the LLM Wiki pattern.

## Current status

The CLI is the setup and configuration layer only. It does not run wiki ingest, query, lint, or repair logic itself.

Current commands:

- `init`: scaffold the repository structure, starter wiki files, config, and default schema
- `schema`: generate or regenerate agent-specific instructions such as `AGENTS.md` or `CLAUDE.md`
- `upgrade`: refresh a managed schema file to the latest template version while preserving customizations where possible
- `config`: inspect and update project-level settings in `.second-brain.json`
