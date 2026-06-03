import { build } from "esbuild";
import { rmSync } from "fs";

// Clean dist
try {
  rmSync("./dist", { recursive: true, force: true });
} catch {}

await build({
  entryPoints: ["index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outdir: "dist",
  sourcemap: true,
  // Treat all node_modules as external (don't bundle them)
  packages: "external",
  // esbuild handles .ts imports natively
  loader: { ".ts": "ts" },
});

console.log("✅ Build complete");
