// @ts-nocheck
// sync-bridge OpenCode/Claude plugin entry. It exports ONLY the plugin hook:
// OpenCode runs EVERY export as a plugin hook and collects the results, so any
// extra export (the library functions) would register as a bogus hook — and the
// ones returning undefined / throwing make opencode's `resolvePluginProviders`
// crash with "undefined is not an object (evaluating 'hook.auth')". The library
// API (syncPlugins, sync, syncFile, registerSyncFile, homes…) is shipped as a
// SEPARATE bundle, dist/lib.js (see src/lib.ts), for in-process consumers such
// as plugin-updater — never imported through this hook entry.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { syncFile, sync } from "./sync.js";
import { getSyncConfig } from "./config.js";
import { deployCommands } from "../core/src/index.js";
import { SYNC_COMMANDS, maybeRunCli } from "./commands.js";
import { claudeHome } from "./homes.js";

// When invoked as `node <bundle> <action>` (from a slash-command), run the action
// and exit before the plugin/hook logic. On a normal load, keep the slash-commands
// deployed to both apps (idempotent, best-effort).
if (await maybeRunCli("sync-bridge")) {
  process.exit(0);
}
try {
  deployCommands("sync-bridge", SYNC_COMMANDS);
} catch {
  /* best-effort */
}

// Path for the debounce timestamp; stored in the Claude config dir (always present
// as the primary home) so it persists across runs without requiring both apps.
function lastsyncedPath() {
  const dir = join(claudeHome(), "config");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, "sync-bridge.lastsynced");
}

// Returns true if a successful sync happened within `seconds` seconds. 0 = skip check.
function isWithinDebounce(seconds) {
  if (!seconds || seconds <= 0) return false;
  try {
    const ts = parseFloat(readFileSync(lastsyncedPath(), "utf8"));
    return !isNaN(ts) && (Date.now() - ts) < seconds * 1000;
  } catch {
    return false;
  }
}

function markSynced() {
  try { writeFileSync(lastsyncedPath(), String(Date.now()), "utf8"); } catch {}
}

// sync every file from sync-bridge.json (`files: [{ name, strategy }]`, defaulting
// to the core-auth account store), plus any library-registered files.
function syncAll() {
  const cfg = getSyncConfig();
  const defaultStrategy = cfg.default_strategy || "newest";
  const results = {};
  for (const entry of cfg.files || []) {
    const name = entry && (entry.name || entry.path);
    if (name) results[name] = syncFile(name, { strategy: entry.strategy || defaultStrategy });
  }
  Object.assign(results, sync());
  markSynced();
  return results;
}

// plugin entry — best-effort sync on load, never throws
export const SyncBridgePlugin = async function () {
  try {
    const cfg = getSyncConfig();
    if (cfg.enabled !== false && !isWithinDebounce(cfg.debounce_seconds)) syncAll();
  } catch {}
  return {};
};

export default SyncBridgePlugin;