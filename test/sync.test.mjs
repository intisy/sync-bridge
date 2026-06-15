import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, utimesSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const dist = pathToFileURL(join(process.cwd(), "dist", "index.js")).href;

function makeHome() {
  const dir = mkdtempSync(join(tmpdir(), "sb-"));
  mkdirSync(join(dir, "config"), { recursive: true });
  return dir;
}

function writeStore(home, store, mtimeSeconds) {
  const file = join(home, "config", "core-auth-accounts.json");
  writeFileSync(file, JSON.stringify(store, null, 2), "utf8");
  if (mtimeSeconds) utimesSync(file, mtimeSeconds, mtimeSeconds);
  return file;
}

function pool(accounts) {
  return { version: 1, providers: { antigravity: { accounts, activeIndex: 0, activeIndexByLane: {} } } };
}

test("syncAccounts unions accounts across both homes, newest fields win", async () => {
  const claude = makeHome();
  const opencode = makeHome();
  process.env.HUB_CLAUDE_DIR = claude;
  process.env.HUB_OPENCODE_DIR = opencode;

  // claude (older): a1, a2(lastUsed 100). opencode (newer): a2(lastUsed 200), a3
  writeStore(claude, pool([
    { id: "a1@x", refresh: "r1", lastUsed: 50 },
    { id: "a2@x", refresh: "r2", lastUsed: 100, meta: { projectId: "p2" } },
  ]), 1000);
  writeStore(opencode, pool([
    { id: "a2@x", refresh: "r2", lastUsed: 200, meta: { managedProjectId: "m2" } },
    { id: "a3@x", refresh: "r3", lastUsed: 300 },
  ]), 2000);

  const mod = await import(dist);
  const result = mod.syncAccounts();
  assert.equal(result.synced, true);
  assert.equal(result.homes, 2);

  for (const home of [claude, opencode]) {
    const store = JSON.parse(readFileSync(join(home, "config", "core-auth-accounts.json"), "utf8"));
    const accounts = store.providers.antigravity.accounts;
    const ids = accounts.map((a) => a.id).sort();
    assert.deepEqual(ids, ["a1@x", "a2@x", "a3@x"], "both homes hold the union");
    const a2 = accounts.find((a) => a.id === "a2@x");
    assert.equal(a2.lastUsed, 200, "newer lastUsed wins");
    assert.equal(a2.meta.projectId, "p2", "older-only meta key preserved");
    assert.equal(a2.meta.managedProjectId, "m2", "newer meta key merged");
  }

  rmSync(claude, { recursive: true, force: true });
  rmSync(opencode, { recursive: true, force: true });
});

test("syncFile newest strategy copies the most recent version", async () => {
  const claude = makeHome();
  const opencode = makeHome();
  process.env.HUB_CLAUDE_DIR = claude;
  process.env.HUB_OPENCODE_DIR = opencode;
  writeFileSync(join(claude, "config", "plug.json"), "OLD", "utf8");
  utimesSync(join(claude, "config", "plug.json"), 1000, 1000);
  writeFileSync(join(opencode, "config", "plug.json"), "NEW", "utf8");
  utimesSync(join(opencode, "config", "plug.json"), 2000, 2000);

  const mod = await import(dist);
  const result = mod.syncFile("config/plug.json", { strategy: "newest" });
  assert.equal(result.synced, true);
  assert.equal(readFileSync(join(claude, "config", "plug.json"), "utf8"), "NEW");

  rmSync(claude, { recursive: true, force: true });
  rmSync(opencode, { recursive: true, force: true });
});

test("no-op when fewer than two homes exist", async () => {
  const only = makeHome();
  process.env.HUB_CLAUDE_DIR = only;
  process.env.HUB_OPENCODE_DIR = join(tmpdir(), "sb-does-not-exist-xyz");
  const mod = await import(dist);
  const result = mod.syncAccounts();
  assert.equal(result.synced, false);
  rmSync(only, { recursive: true, force: true });
});
