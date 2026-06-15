// @ts-nocheck
// sync-bridge config + logging. Config at <home>/config/sync-bridge.json (preferred) or <home>/sync-bridge.json (fallback), from whichever home has it (Claude first).

import { existsSync, readFileSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { existingHomes } from "./homes.js";

const NAME = "sync-bridge";
const START_TIME = new Date().toISOString().replace(/:/g, "-").split(".")[0];

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
  try {
    const file = findConfigFile();
    SYNC_CONFIG = file ? JSON.parse(readFileSync(file, "utf8")) : {};
  } catch { SYNC_CONFIG = {}; }
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
