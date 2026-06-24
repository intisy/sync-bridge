# sync-bridge

[![npm version](https://img.shields.io/npm/v/sync-bridge)](https://www.npmjs.com/package/sync-bridge)
[![npm downloads](https://img.shields.io/npm/dm/sync-bridge)](https://www.npmjs.com/package/sync-bridge)
[![CI](https://github.com/intisy/sync-bridge/actions/workflows/publish.yml/badge.svg)](https://github.com/intisy/sync-bridge/actions/workflows/publish.yml)

Syncs config and account files between the Claude Code and OpenCode home directories. Every other plugin in the ecosystem stays inside the single home of the app it is running in; **sync-bridge is the one component permitted to span both homes**, so an account logged in (or a config changed) in one app is mirrored to the other. It is consumed two ways: as its own **plugin hook** (reconciles configured files on load — by default the core-auth account store), and as an **in-process library** (`dist/lib.js`) that [plugin-updater](https://github.com/intisy/plugin-updater) loads to run `syncPlugins()`, mirroring `plugins.json` entries flagged `sync: true` into the other app.

## Under-the-Hood Architecture

```mermaid
flowchart TD
    subgraph Homes
        CLAUDE["Claude home<br/>~/.claude → ~/.config/claude"]
        OPENCODE["OpenCode home<br/>~/.config/opencode → ~/.opencode"]
    end

    subgraph Bridge [sync-bridge]
        HOOK["plugin hook (dist/index.js)<br/>reconciles configured files on load"]
        LIB["library (dist/lib.js)<br/>syncFile / sync / syncPlugins / homes"]
        RECONCILE["reconcile: read each home → merge → write all homes"]
        STRAT["strategies: newest | accounts (union)<br/>plugins: per-home union of sync:true entries"]
        HOOK --> RECONCILE
        LIB --> RECONCILE --> STRAT
    end

    CLAUDE <--> RECONCILE
    OPENCODE <--> RECONCILE
    UPDATER["plugin-updater"] -->|syncPlugins() each launch| LIB
```

Each home is resolved by precedence (Claude prefers `~/.claude`; OpenCode prefers `~/.config/opencode`), overridable via `HUB_CLAUDE_DIR` / `HUB_OPENCODE_DIR`. A relative path (e.g. `config/core-auth-accounts.json`) is read from every existing home, reconciled by a merge strategy, and written back atomically to all homes. The `accounts` strategy unions the core-auth account store by account id so no login is ever lost; `newest` copies the most-recently-modified version.

## Structure

- `src/` — TypeScript source (`homes`, `merge`, `sync`, `pluginsync`, `config`, `index` = hook, `lib` = library entry)
- `dist/` — Compiled output (generated; not committed): `index.js` (plugin hook) + `lib.js` (in-process library)
- `test/` — Node test runner specs

## Installation

### Via plugin-updater (recommended)
Add to `~/.config/opencode/config/plugins.json`:
```json
[{ "name": "sync-bridge", "url": "https://github.com/intisy/sync-bridge", "enabled": true }]
```

### Via npm
```bash
npm install sync-bridge
```

## API

The package main (`dist/index.js`) is the plugin hook and intentionally exports **only** `SyncBridgePlugin` — OpenCode runs every export as a hook, so the library functions live in a separate bundle. In-process consumers import from `sync-bridge/dist/lib.js`:

```ts
import { syncPlugins, syncFile, registerSyncFile, sync, existingHomes } from "sync-bridge/dist/lib.js";

syncPlugins();                                    // mirror plugins.json entries flagged sync:true across apps
syncFile("core-auth-accounts.json", { strategy: "accounts" }); // union the account store
syncFile("config/plugins.json", { strategy: "newest" });
registerSyncFile("config/plugins.json", { strategy: "newest" });
sync();                                           // reconcile everything registered
```

### Cross-app plugin sync (`sync: true`)

Give any `plugins.json` entry a `sync: true` flag and it is mirrored into the other app's `plugins.json` on the next `plugin-updater` run, so installing a plugin in one app installs it in the other. It is a **per-home union** (each app keeps its own non-synced entries) and **additive** (never removes).

```json
[{ "name": "antigravity-auth", "url": "https://github.com/intisy/antigravity-auth", "enabled": true, "autoUpdate": false, "sync": true }]
```

## Configuration

Config file: `~/.config/opencode/config/sync-bridge.json` (preferred) or `~/.config/opencode/sync-bridge.json` (fallback); same under `~/.claude` for Claude Code.

```json
{
  "logging": true,
  "files": [{ "path": "config/plugins.json", "strategy": "newest" }]
}
```

The core-auth account store (`config/core-auth-accounts.json`) is always synced; `files` adds more.

## Logging

Logs are written to `<home>/logs/YYYY-MM-DD/sync-bridge-HH-MM-SS.log`. Set `"logging": false` to disable.

## License

MIT
