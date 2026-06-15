// @ts-nocheck
// Resolves the Claude and OpenCode home dirs; sync-bridge is the only component permitted to span both. Precedence: Claude ~/.claude before ~/.config/claude (direct first); OpenCode ~/.config/opencode before ~/.opencode (XDG first). HUB_CLAUDE_DIR / HUB_OPENCODE_DIR override.

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

// app homes that exist on disk; an absent home means that app isn't installed
export function existingHomes() {
  const homes = [];
  for (const home of [claudeHome(), opencodeHome()]) {
    if (existsSync(home) && !homes.includes(home)) homes.push(home);
  }
  return homes;
}

export function allHomes() {
  const homes = [];
  for (const home of [claudeHome(), opencodeHome()]) if (!homes.includes(home)) homes.push(home);
  return homes;
}
