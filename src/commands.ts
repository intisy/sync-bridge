// @ts-nocheck
// Cross-app slash-commands for sync-bridge plus the CLI actions behind them.
// The commands shell back into the deployed hook bundle (`node <bundle> <action>`),
// so maybeRunCli runs the action and the process exits before the plugin loads.
import { configCommand, runConfigCli, type CommandDef } from "../core/src/index.js";
import { sync, syncFile } from "./sync.js";
import { syncPlugins } from "./pluginsync.js";
import { getSyncConfig } from "./config.js";

export const SYNC_COMMANDS: CommandDef[] = [
  configCommand("sync-bridge"),
  {
    name: "sync",
    description: "Reconcile synced files + mirror sync-enabled plugins across both apps now",
    shell: 'node "{{BUNDLE}}" sync',
    body: "Above is the sync-bridge result (files reconciled + plugins mirrored). Summarize what changed.",
  },
];

// Run a full sync immediately: every configured file plus the plugins.json mirror.
function runSyncAction(): void {
  const files: Record<string, unknown> = {};
  try {
    for (const entry of getSyncConfig().files || []) {
      const name = entry && (entry.name || entry.path);
      if (name) files[name] = syncFile(name, { strategy: entry.strategy || "newest" });
    }
    Object.assign(files, sync());
  } catch (e) {
    console.log(`file sync error: ${e?.message || e}`);
  }
  let plugins: unknown;
  try {
    plugins = syncPlugins();
  } catch (e) {
    console.log(`plugin sync error: ${e?.message || e}`);
  }
  console.log(JSON.stringify({ files, plugins }, null, 2));
}

export async function maybeRunCli(pluginName: string): Promise<boolean> {
  const argv = process.argv.slice(2);
  if (argv[0] === "config") {
    runConfigCli(pluginName, argv.slice(1));
    return true;
  }
  if (argv[0] === "sync") {
    runSyncAction();
    return true;
  }
  return false;
}
