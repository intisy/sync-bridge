// @ts-nocheck
// sync-bridge OpenCode/Claude plugin entry. It exports ONLY the plugin hook:
// OpenCode runs EVERY export as a plugin hook and collects the results, so any
// extra export (the library functions) would register as a bogus hook — and the
// ones returning undefined / throwing make opencode's `resolvePluginProviders`
// crash with "undefined is not an object (evaluating 'hook.auth')". The library
// API (syncPlugins, sync, syncFile, registerSyncFile, homes…) is shipped as a
// SEPARATE bundle, dist/lib.js (see src/lib.ts), for in-process consumers such
// as plugin-updater — never imported through this hook entry.

import { syncFile, sync } from "./sync.js";
import { getSyncConfig } from "./config.js";

// sync every file from sync-bridge.json (`files: [{ name, strategy }]`, defaulting
// to the core-auth account store), plus any library-registered files.
function syncAll() {
  const results = {};
  for (const entry of getSyncConfig().files || []) {
    const name = entry && (entry.name || entry.path);
    if (name) results[name] = syncFile(name, { strategy: entry.strategy || "newest" });
  }
  Object.assign(results, sync());
  return results;
}

// plugin entry — best-effort sync on load, never throws
export const SyncBridgePlugin = async function () {
  try { syncAll(); } catch {}
  return {};
};

export default SyncBridgePlugin;
