/**
 * Scan Item.xlsx 备注 column for Emote filter buckets.
 * Usage: node scripts/scan-emote-type-remarks.mjs <excelWorkspaceRoot> [config.json path]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import {
  cellStr,
  isDaHongJianShiEmoteTypeRemark,
  resolveRemarkColumnIndex,
  rowMatchesEmotePreset,
  typeRemarkFilterKey,
} from "../src/lib/xlsxHelpers.ts";

const root = process.argv[2];
const configPath = process.argv[3];
if (!root?.trim()) {
  console.error("Usage: node scripts/scan-emote-type-remarks.mjs <excelWorkspaceRoot> [config.json]");
  process.exit(1);
}

let itemRemarkColumn = null;
if (configPath && fs.existsSync(configPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
    itemRemarkColumn = cfg.itemRemarkColumn ?? null;
  } catch {
    console.warn("Could not parse config:", configPath);
  }
} else {
  const defaultCfg = path.join(root, "config.json");
  if (fs.existsSync(defaultCfg)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(defaultCfg, "utf8"));
      itemRemarkColumn = cfg.itemRemarkColumn ?? null;
    } catch {
      /* ignore */
    }
  }
}

const itemPath = path.join(root, "Excel", "Item.xlsx");
if (!fs.existsSync(itemPath)) {
  console.error("Not found:", itemPath);
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(itemPath));
const ws = wb.Sheets.Item ?? wb.Sheets[wb.SheetNames[0]];
if (!ws) {
  console.error("No Item sheet");
  process.exit(1);
}

const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
const headers = (aoa[0] ?? []).map((h) => cellStr(h));
const remarkCol = resolveRemarkColumnIndex(headers, itemRemarkColumn);
if (remarkCol < 0) {
  console.error("No 备注 column. Headers:", headers.slice(0, 24).join(" | "));
  process.exit(1);
}

const keep = new Set();
const exclude = new Set();
const other = new Set();

for (let i = 1; i < aoa.length; i++) {
  const row = aoa[i] ?? [];
  const cell = row[remarkCol];
  const key = typeRemarkFilterKey(cell);
  if (!key.includes("Emote")) continue;
  if (rowMatchesEmotePreset(cell)) keep.add(key);
  else if (isDaHongJianShiEmoteTypeRemark(cell)) exclude.add(key);
  else other.add(key);
}

const headerName = headers[remarkCol] ?? "?";
console.log("备注列:", headerName, "index:", remarkCol);
if (itemRemarkColumn) console.log("config.itemRemarkColumn:", itemRemarkColumn);
console.log("\n=== keep (rowMatchesEmotePreset) ===");
[...keep].sort().forEach((k) => console.log(k));
console.log("\n=== exclude (大红检视类) ===");
[...exclude].sort().forEach((k) => console.log(k));
if (other.size) {
  console.log("\n=== other (含 Emote 但未入 keep/exclude) ===");
  [...other].sort().forEach((k) => console.log(k));
}
console.log("\ncounts:", { keep: keep.size, exclude: exclude.size, other: other.size });
