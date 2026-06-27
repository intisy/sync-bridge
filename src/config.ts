// @ts-nocheck
// sync-bridge config + logging. The config search is bespoke (it spans BOTH app
// homes, Claude first, and carries a `files` array), so getSyncConfig stays local;
// the log WRITING is delegated to the shared core library like every other plugin.

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { existingHomes } from "./homes.js";
import { makeWriteLog, ensureConfig } from "../core/src/index.js";

const NAME = "sync-bridge";

// synced out of the box so one login serves both apps; override entirely with a
// `files` array in sync-bridge.json. Each entry is { name, strategy }; `name` is
// resolved per home to config/<name> or <name>, whichever exists.
const DEFAULT_FILES = [{ name: "accounts.json", strategy: "accounts" }];

// materialize config/sync-bridge.json with defaults on load, so it's discoverable
ensureConfig(NAME, { logging: true, files: DEFAULT_FILES });

let SYNC_CONFIG = null;

function findConfigFile() {
  for (const home of existingHomes()) {
    const preferred = join(home, "config", NAME + ".json");
    const fallback = join(home, NAME + ".json");
    if (existsSync(preferred)) return preferred;
    if (existsSync(fallback)) return fallback;
  }
  return null;
}

export function getSyncConfig() {
  if (SYNC_CONFIG !== null) return SYNC_CONFIG;
  let loaded = {};
  try {
    const file = findConfigFile();
    if (file) loaded = JSON.parse(readFileSync(file, "utf8"));
  } catch { loaded = {}; }
  SYNC_CONFIG = { ...loaded, files: Array.isArray(loaded.files) ? loaded.files : DEFAULT_FILES };
  return SYNC_CONFIG;
}

export const writeLog = makeWriteLog(NAME);
