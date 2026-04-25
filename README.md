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
- `upgrade` — update your assistant's instructions to the latest version; your "Project Customizations" section is preserved
- `config` — show or change project settings in `.second-brain.json`

## Building binaries

Building prebuilt binaries requires [Bun](https://bun.sh).

```sh
bun run build:bin                 # all 5 targets
bun run build:bin:macos-arm64     # just one
```

Outputs land in `dist-bin/`.
