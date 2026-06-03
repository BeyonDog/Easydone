/**
 * Fix topbar log toggle button label: 删除 -> 日志
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(root, "src", "App.tsx");
let src = fs.readFileSync(appPath, "utf8");

const re =
  /(setLogPanelOpen\(\(o\) => !o\);\s*\}\}\s*>\s*\n\s*)删除(\s*\n\s*<\/button>\s*\n\s*\{logPanelOpen)/;

if (!re.test(src)) {
  console.error("patch-topbar-log-label: pattern not found");
  process.exit(1);
}

src = src.replace(re, "$1日志$2");
fs.writeFileSync(appPath, src, "utf8");
console.log("patch-topbar-log-label: OK");
