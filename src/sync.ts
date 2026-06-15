// @ts-nocheck
// The sync engine: reconcile a relative path across every existing app home.
// Reads each home's copy, runs the chosen merge strategy, and writes the result
// back to every home (atomic temp-rename, skipping homes already up to date).

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, renameSync } from "fs";
import { join, dirname } from "path";
import { randomBytes } from "crypto";
import { existingHomes } from "./homes.js";
import { STRATEGIES, newest } from "./merge.js";

const REGISTERED = new Map();   // relativePath -> options

function readVersion(file) {
  try { if (existsSync(file)) return { file, data: readFileSync(file, "utf8"), mtimeMs: statSync(file).mtimeMs }; } catch {}
  return null;
}

function atomicWrite(file, content) {
  const dir = dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = file + "." + randomBytes(6).toString("hex") + ".tmp";
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, file);
}

// reconcile one relative path (e.g. "config/core-auth-accounts.json") across homes
export function syncFile(relativePath, options) {
  const strategy = STRATEGIES[(options && options.strategy) || "newest"] || newest;
  const homes = existingHomes();
  if (homes.length < 2) return { synced: false, reason: "fewer than two app homes", homes: homes.length, wrote: 0 };
  const files = homes.map((home) => join(home, relativePath));
  const versions = files.map(readVersion).filter(Boolean);
  if (versions.length === 0) return { synced: false, reason: "no versions on any home", homes: homes.length, wrote: 0 };
  const merged = strategy(versions);
  if (merged == null) return { synced: false, reason: "strategy produced nothing", homes: homes.length, wrote: 0 };
  let wrote = 0;
  for (const file of files) {
    const current = readVersion(file);
    if (!current || current.data !== merged) { atomicWrite(file, merged); wrote++; }
  }
  return { synced: true, homes: homes.length, wrote };
}

// register a file so sync() reconciles it; idempotent
export function registerSyncFile(relativePath, options) {
  REGISTERED.set(relativePath, options || {});
}

export function registeredFiles() {
  return [...REGISTERED.entries()].map(([path, options]) => ({ path, options }));
}

// reconcile every registered file; returns a per-file result map
export function sync() {
  const results = {};
  for (const [relativePath, options] of REGISTERED) results[relativePath] = syncFile(relativePath, options);
  return results;
}
