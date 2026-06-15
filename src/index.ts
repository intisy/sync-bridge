// @ts-nocheck
// sync-bridge public surface. Used two ways:
//  1. As a library (e.g. bundled into core-auth): call registerSyncFile + sync,
//     or syncAccounts() directly, to mirror files across both app homes.
//  2. As a loadable plugin: the OpenCode/Claude entry syncs the registered files
//     (and the core-auth account store + any config-listed files) on load.

import { syncFile, sync, registerSyncFile, registeredFiles } from "./sync.js";
import { claudeHome, opencodeHome, existingHomes, allHomes } from "./homes.js";
import { getSyncConfig } from "./config.js";

export { syncFile, sync, registerSyncFile, registeredFiles, claudeHome, opencodeHome, existingHomes, allHomes };

// the core-auth account pool: synced by default so one login serves both apps
export const ACCOUNT_STORE = "config/core-auth-accounts.json";

export function syncAccounts() {
  return syncFile(ACCOUNT_STORE, { strategy: "accounts" });
}

// reconcile the account store + every file listed in sync-bridge's own config
//   { "files": [{ "path": "config/foo.json", "strategy": "newest" }] }
export function syncAll() {
  const results = { [ACCOUNT_STORE]: syncAccounts() };
  for (const entry of getSyncConfig().files || []) {
    if (entry && entry.path) results[entry.path] = syncFile(entry.path, { strategy: entry.strategy || "newest" });
  }
  Object.assign(results, sync());
  return results;
}

// OpenCode / Claude plugin entry — best-effort sync on load, never throws
export const SyncBridgePlugin = async function () {
  try { syncAll(); } catch {}
  return {};
};

export default SyncBridgePlugin;
