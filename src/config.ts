// @ts-nocheck
// sync-bridge config + logging. Config at <home>/config/sync-bridge.json (preferred) or <home>/sync-bridge.json (fallback), from whichever home has it (Claude first).

import { existsSync, readFileSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { existingHomes } from "./homes.js";

const NAME = "sync-bridge";
const START_TIME = new Date().toISOString().replace(/:/g, "-").split(".")[0];

// synced out of the box so one login serves both apps; override entirely with a
// `files` array in sync-bridge.json. Each entry is { name, strategy }; `name` is
// resolved per home to config/<name> or <name>, whichever exists.
const DEFAULT_FILES = [{ name: "core-auth-accounts.json", strategy: "accounts" }];

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

export function writeLog(message, isError = false) {
  const loggingEnabled = getSyncConfig().logging !== false;
  try {
    if (loggingEnabled) {
      const date = new Date();
      const home = existingHomes()[0];
      if (home) {
        const logsDir = join(home, "logs", date.toISOString().split("T")[0]);
        if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
        appendFileSync(join(logsDir, NAME + "-" + START_TIME + ".log"), "[" + date.toISOString() + "] " + (isError ? "[ERROR] " : "[INFO] ") + message + "\n");
      }
    }
  } catch {}
  if (isError) console.error(message);
}
