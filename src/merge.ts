// @ts-nocheck
// Merge strategies for synced files. A strategy takes the per-home versions
// ([{ data: fileText, mtimeMs }]) and returns the reconciled file text to write
// to every home. "newest" is the generic default; "accounts" unions the core-auth
// account store so a login in either app is never lost.

export function newest(versions) {
  let best = null;
  for (const version of versions) if (!best || version.mtimeMs > best.mtimeMs) best = version;
  return best ? best.data : null;
}

function parse(text) {
  try { return typeof text === "string" ? JSON.parse(text) : text; } catch { return null; }
}

// b is the newer entry; prefer its scalar fields, but never lose rate-limit lanes
// or meta keys present only on the older copy.
function mergeAccount(a, b) {
  const lanes = { ...(a.rateLimitResetTimes || {}) };
  for (const [lane, reset] of Object.entries(b.rateLimitResetTimes || {})) {
    lanes[lane] = Math.max(lanes[lane] || 0, reset || 0);
  }
  return { ...a, ...b, rateLimitResetTimes: lanes, meta: { ...(a.meta || {}), ...(b.meta || {}) } };
}

// union the core-auth account store across homes: { version, providers: { id: { accounts, ... } } }
export function accounts(versions) {
  const out = { version: 1, providers: {} };
  const ordered = [...versions].sort((a, b) => a.mtimeMs - b.mtimeMs); // oldest first so newest wins
  for (const version of ordered) {
    const store = parse(version.data);
    if (!store || !store.providers) continue;
    for (const [providerId, pool] of Object.entries(store.providers)) {
      const target = out.providers[providerId] || (out.providers[providerId] = { accounts: [], activeIndex: 0, activeIndexByLane: {} });
      const byId = new Map(target.accounts.map((account) => [account.id, account]));
      for (const account of pool.accounts || []) {
        const existing = byId.get(account.id);
        byId.set(account.id, existing ? mergeAccount(existing, account) : account);
      }
      target.accounts = [...byId.values()];
      if (typeof pool.activeIndex === "number") target.activeIndex = pool.activeIndex;
      target.activeIndexByLane = { ...target.activeIndexByLane, ...(pool.activeIndexByLane || {}) };
    }
  }
  return JSON.stringify(out, null, 2);
}

export const STRATEGIES = { newest, accounts };
