# second-brain

TypeScript CLI that scaffolds and maintains an LLM-friendly personal knowledge base ("vault"). The CLI is setup/config only — it writes the instruction contract (`CLAUDE.md`/`AGENTS.md` inside a vault) that tells an AI assistant how to maintain the wiki. Zero runtime dependencies; Node >= 20.10.

## Commands

- `npm run build` — compile TypeScript to `dist/` (`tsc -p tsconfig.json`)
- `npm run check` — typecheck only (`tsc --noEmit`)
- `npm run dev -- <cmd>` — run from source without building (e.g. `npm run dev -- init`), uses `node --experimental-strip-types`
- `npm run build:bin` — build standalone binaries with Bun into `dist-bin/` (requires `bun`)
- No test suite or linter is configured.

CLI subcommands (dispatched in `src/cli.ts`): `init`, `doctor`, `schema`, `upgrade`, `config`, `vaults`.

## Architecture

- `src/cli.ts` — entry point; parses argv and dispatches to command modules.
- `src/commands/*.ts` — one module per subcommand, each exporting `parseXArgs` + `runXCommand`.
- `src/core/project-scaffold.ts` — creates the vault directory tree (`schema/`, `sources/inbox|archive/`, `wiki/entities|concepts|topics|drafts|assets/`) and seed files.
- `src/core/schema-file.ts` + `src/templates/schema.ts` — generate the vault's instruction file (`CLAUDE.md`, `AGENTS.md`, etc., per agent kind). The file has three marker-delimited blocks: managed (overwritten on `upgrade`), custom (user's, preserved), assistant observations (assistant's memory, preserved). `SCHEMA_VERSION` lives in `src/templates/schema.ts`.
- `src/core/config.ts` — reads/writes a vault's `.second-brain.json` (the config contract; `init --print-schema` emits its JSON Schema).
- `src/core/vaults.ts` — per-machine vault registry at `~/.second-brain/vaults.json`.
- `src/utils/prompt.ts` — readline wizard helpers; `init` also supports non-interactive `--config` / `--non-interactive` for agent-driven setup.

Supported agent kinds (`AGENT_KINDS` in `src/templates/schema.ts`): `claude-code`, `codex`, `kiro`, `opencode`, `pi`, `generic`.

## Conventions

- ESM (`"type": "module"`); imports use `.ts` extensions (tsconfig `rewriteRelativeImportExtensions` rewrites them on build).
- Strict TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` all on.
- No third-party runtime deps — keep it that way; only `node:` built-ins.
- Bumping template content requires bumping `SCHEMA_VERSION` so `upgrade` can detect stale vaults.

## Gotchas

- `Documents/` at repo root is a locally generated test vault (output of running `second-brain init` here), gitignored — never commit generated vaults or edit them as if they were source.
- The `CLAUDE.md` inside `Documents/Vault/` is generated output for end-user vaults; this root file is the one for developing the CLI. Don't confuse the two.
- User data lives outside the repo: vault registry at `~/.second-brain/vaults.json`; each vault carries its own `.second-brain.json`.
- `npm install` triggers `prepare` → full build, so `dist/` appears automatically.
- `upgrade` must preserve the custom and assistant blocks in generated instruction files — changes to block markers or merge logic in `src/core/schema-file.ts` are high-risk.
