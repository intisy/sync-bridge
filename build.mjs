// Bundle into a SINGLE self-contained ESM file. OpenCode/Claude deploy each
// plugin as one file (plugin/<name>.js), so sibling modules must be inlined —
// plain tsc output fails at load with "Cannot find module './sync.js'".
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "dist/index.js",
  logLevel: "info",
});

console.log("Bundled sync-bridge -> dist/index.js");
