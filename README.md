# second-brain

`second-brain` sets up a personal knowledge base in a folder — a place to drop notes, documents, and links that your AI coding assistant (Claude Code, Codex, Kiro, OpenCode, Pi, or any generic agent) can help you organize into a searchable wiki over time.

The CLI is the setup and configuration layer only. It writes the contract (an `AGENTS.md` or `CLAUDE.md` file) that tells your assistant how to maintain the wiki. Your assistant does the actual ingest, query, and cleanup work.

## Install

Pick whichever fits best.

### Option 1 — Prebuilt binary (no runtime required)

Download the binary for your platform from the latest [GitHub release](https://github.com/mrelph/second-brain/releases), move it onto your PATH, and run it:

```sh
# example (macOS Apple Silicon)
curl -L -o second-brain https://github.com/mrelph/second-brain/releases/latest/download/second-brain-macos-arm64
chmod +x second-brain
mv second-brain /usr/local/bin/
second-brain init
```

Available targets: `macos-arm64`, `macos-x64`, `linux-x64`, `linux-arm64`, `windows-x64.exe`.

### Option 2 — Install from GitHub with npm (requires Node ≥ 20.10)

```sh
npm install -g github:mrelph/second-brain
second-brain init
```

The `prepare` script compiles TypeScript on install, so no manual build step is needed.

### Option 3 — Run from source (for development)

```sh
git clone https://github.com/mrelph/second-brain.git
cd second-brain
npm install          # `prepare` also builds dist/ here
npm link             # exposes `second-brain` globally
# or use the dev entry point (no build step):
npm run dev -- init
```

## Quick start

```sh
second-brain init                       # guided wizard
second-brain doctor                     # dashboard of your knowledge base
second-brain schema --agent claude-code # change your AI assistant
second-brain upgrade                    # pull in latest instruction updates
```

Run `second-brain --help` for the full command list.

## Commands

- `init` — set up a new knowledge base (runs a short wizard by default)
- `doctor` — show a summary of your knowledge base and next steps
- `schema` — refresh your assistant's instructions (`AGENTS.md` / `CLAUDE.md` / etc.)
- `upgrade` — update your assistant's instructions to the latest version; your "Project Customizations" and "Assistant Observations" sections are preserved
- `config` — show or change project settings in `.second-brain.json`

## What's in the instruction file

The generated `AGENTS.md` / `CLAUDE.md` has three blocks:

- **Managed block** (`<!-- second-brain:schema:start --> ... :end -->`) — the workflows, rules, and templates `second-brain` ships. Overwritten on `upgrade`.
- **Project Customizations block** (`<!-- second-brain:custom:start --> ... :end -->`) — *yours*. Add your own preferences and project-specific instructions here. Preserved across upgrades.
- **Assistant Observations block** (`<!-- second-brain:assistant:start --> ... :end -->`) — *the assistant's working memory*. The assistant maintains this with durable observations: recurring entity types it sees, style preferences it's inferred, drift signals worth flagging. Preserved across upgrades.

The managed block also includes a "Pre-flight" instruction telling the assistant to glance at `wiki/log.md`, the Assistant Observations block, and `.second-brain.json` at the start of a session and surface drift to you — so the contract stays honest as the wiki evolves.

## Setup from a script or AI agent

`init` and `doctor` are both LLM-friendly so a coding agent or wrapper script can set up and inspect a knowledge base without driving the wizard.

```sh
# Get the JSON Schema for .second-brain.json (so an LLM can produce a valid config)
second-brain init --print-schema

# Initialize from a complete config file (or stdin) — no wizard, no prompts
second-brain init --config setup.json --no-git
echo '{"projectName":"My KB","defaultAgent":"claude-code"}' | second-brain init --config - --no-git

# Force the wizard off even when no flags are passed
second-brain init --non-interactive --name "My KB"

# Read knowledge-base status as structured JSON
second-brain doctor --json
```

`.second-brain.json` is the contract: anything you can configure can be expressed there, and `init --config` will scaffold a project that fully reflects it. The conventional flow for an LLM-driven setup is interview-or-ingest → write JSON → `init --config <file>`.

## Building binaries

Building prebuilt binaries requires [Bun](https://bun.sh).

```sh
bun run build:bin                 # all 5 targets
bun run build:bin:macos-arm64     # just one
```

Outputs land in `dist-bin/`.
