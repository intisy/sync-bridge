// @ts-nocheck
// Resolves the Claude Code and OpenCode home directories. sync-bridge is the one
// component permitted to span BOTH app homes; every other plugin stays inside the
// single home of the app it is running in. Precedence (per project convention):
//   Claude:   ~/.claude          then ~/.config/claude   (direct first)
//   OpenCode: ~/.config/opencode then ~/.opencode         (XDG first)
// Explicit overrides (HUB_CLAUDE_DIR / HUB_OPENCODE_DIR) win and make this testable.

import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

function resolve(override, candidates, fallback) {
  if (override && override.trim()) return override.trim();
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return fallback;
}

export function claudeHome() {
  const home = homedir();
  return resolve(process.env.HUB_CLAUDE_DIR, [join(home, ".claude"), join(home, ".config", "claude")], join(home, ".claude"));
}

export function opencodeHome() {
  const home = homedir();
  return resolve(process.env.HUB_OPENCODE_DIR, [join(home, ".config", "opencode"), join(home, ".opencode")], join(home, ".config", "opencode"));
}

// app homes that exist on disk — the actual sync targets (an absent home means
// that app is not installed, so there is nothing to sync there).
export function existingHomes() {
  const homes = [];
  for (const home of [claudeHome(), opencodeHome()]) {
    if (existsSync(home) && !homes.includes(home)) homes.push(home);
  }
  return homes;
}

// both candidate homes regardless of existence
export function allHomes() {
  const homes = [];
  for (const home of [claudeHome(), opencodeHome()]) if (!homes.includes(home)) homes.push(home);
  return homes;
}
