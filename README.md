# Redmine Helper

A native Electron desktop app for managing Redmine issues with integrated AI assistance.

## Features

### Issue Management
- View and filter your assigned open issues across projects
- Edit status, assignee, progress, and add notes — batched into a single submit
- Create sub-tasks directly from an issue detail view
- Background polling notifies you of issue changes while you work

### Time Tracking
- Built-in timer for tracking active work sessions
- Log time entries (hours, activity type, comment) directly to Redmine

### AI Panel
AI-powered assistance with streaming output. Supports three backends:

| Mode | What it does |
|---|---|
| Generate Acceptance Criteria | Produces a checklist-format AC from an issue description |
| Generate Sub-tasks | Breaks an issue into implementable sub-tasks |
| Summarize Git Diff | Turns `git diff HEAD` output into a Redmine journal note |
| Analyze Team Tickets | Engineering-manager view of team workload, blockers, and risks |
| Analyze Code + Issue | Reads source files from a directory and suggests code changes to fix an issue |

### Other
- macOS menu bar tray icon
- Spotlight-style quick-access window (`Cmd+Shift+N`)
- Automatic light/dark theme based on system preference
- Encrypted credential storage (OS keychain with AES-256-GCM fallback)

---

## AI Backends

Configure the backend in the AI panel. Each must be installed and authenticated separately.

### Ollama (local, no API key required)
```bash
# Install: https://ollama.com
ollama pull llama3.2
```
Model name is configurable in the UI (default: `llama3.2`).

### Claude CLI
```bash
npm install -g @anthropic-ai/claude-code
claude login
```

### Codex CLI
```bash
npm install -g @openai/codex
codex auth
```

Binary discovery checks: `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `~/.volta/bin`, nvm node version directories, then `$PATH`.

---

## Setup

```bash
npm install
npm start
```

On first launch, go to **Settings** and enter your Redmine URL and API key.

To find your API key: Redmine → My account → API access key.

---

## Build

```bash
npm run build        # current platform
npm run build:mac
npm run build:win
npm run build:linux
```

Requires appropriate signing credentials for distribution builds (see `electron-builder.yml`).

---

## Tech Stack

- [Electron](https://www.electronjs.org/) 41
- [Axios](https://axios-http.com/) — Redmine REST API
- [electron-store](https://github.com/sindresorhus/electron-store) — settings persistence
- [marked](https://marked.js.org/) + [DOMPurify](https://github.com/cure53/DOMPurify) — Markdown rendering

---

## Security Notes

- Credentials are stored encrypted using Electron's `safeStorage` (OS keychain) with a local AES-256-GCM fallback
- Renderer runs with `contextIsolation: true` and `nodeIntegration: false`; all main-process access is via a typed `window.redmine` context bridge
- AI backends run as sandboxed child processes; no network access is granted to AI output
