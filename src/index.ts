// @ts-nocheck
// sync-bridge public surface, used either as a library (registerSyncFile + sync) or
// as a loadable plugin that syncs the files from sync-bridge.json on load.

import { syncFile, sync, registerSyncFile, registeredFiles } from "./sync.js";
import { claudeHome, opencodeHome, existingHomes, allHomes } from "./homes.js";
import { getSyncConfig } from "./config.js";

export { syncFile, sync, registerSyncFile, registeredFiles, claudeHome, opencodeHome, existingHomes, allHomes };

// sync every file from sync-bridge.json (`files: [{ name, strategy }]`, defaulting
// to the core-auth account store). Each name is resolved per home to config/<name>
// or <name>, whichever exists. Library-registered files sync too.
export function syncAll() {
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
