// @ts-nocheck
// sync-bridge public surface, used either as a library (registerSyncFile + sync, or syncAccounts directly) or as a loadable plugin that syncs registered files on load.

import { syncFile, sync, registerSyncFile, registeredFiles } from "./sync.js";
import { claudeHome, opencodeHome, existingHomes, allHomes } from "./homes.js";
import { getSyncConfig } from "./config.js";

export { syncFile, sync, registerSyncFile, registeredFiles, claudeHome, opencodeHome, existingHomes, allHomes };

// synced by default so one login serves both apps
export const ACCOUNT_STORE = "config/core-auth-accounts.json";

export function syncAccounts() {
  return syncFile(ACCOUNT_STORE, { strategy: "accounts" });
}

// account store + every file in config.files: [{ path, strategy }]
export function syncAll() {
  const results = { [ACCOUNT_STORE]: syncAccounts() };
  for (const entry of getSyncConfig().files || []) {
    if (entry && entry.path) results[entry.path] = syncFile(entry.path, { strategy: entry.strategy || "newest" });
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
