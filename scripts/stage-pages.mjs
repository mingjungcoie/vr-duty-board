// 執行：node scripts/stage-pages.mjs
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, "index.html"), join(dist, "index.html"));
cpSync(join(root, "src"), join(dist, "src"), { recursive: true });
cpSync(join(root, "assets"), join(dist, "assets"), { recursive: true });
writeFileSync(join(dist, "_headers"), [
  "/index.html",
  "  Cache-Control: no-cache",
  "/src/*",
  "  Cache-Control: no-cache",
  "",
].join("\n"));
console.log(dist);
