/**
 * Scan Item.xlsx for fitting room skin rows (Type 100/200 or SubType 2000000).
 * Usage: node scripts/scan-fitting-room-skins.mjs <excelWorkspaceRoot>
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { cellStr, parseCellAsInteger } from "../src/lib/xlsxHelpers.ts";
import { resolveItemRowSubTypeColumnIndex, resolveItemRowTypeColumnIndex } from "../src/lib/itemTypeLookup.ts";
import { rowMatchesFittingRoomSkinPreset } from "../src/lib/xlsxHelpers.ts";

const root = process.argv[2];
if (!root?.trim()) {
  console.error("Usage: node scripts/scan-fitting-room-skins.mjs <excelWorkspaceRoot>");
  process.exit(1);
}

const itemPath = path.join(root, "Excel", "Item.xlsx");
if (!fs.existsSync(itemPath)) {
  console.error("Not found:", itemPath);
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(itemPath));
const ws = wb.Sheets.Item ?? wb.Sheets[wb.SheetNames[0]];
const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
const headers = (aoa[0] ?? []).map((h) => cellStr(h));
const typeCol = resolveItemRowTypeColumnIndex(headers);
const subCol = resolveItemRowSubTypeColumnIndex(headers);

if (typeCol < 0 && subCol < 0) {
  console.error("No Type/SubType columns. Headers:", headers.slice(0, 24).join(" | "));
  process.exit(1);
}

let hits = 0;
const typeDist = {};
for (let i = 1; i < aoa.length; i++) {
  const row = aoa[i] ?? [];
  if (!rowMatchesFittingRoomSkinPreset(row, typeCol, subCol)) continue;
  hits++;
  const t = parseCellAsInteger(row[typeCol]);
  const key = t != null ? String(t) : cellStr(row[typeCol]) || "?";
  typeDist[key] = (typeDist[key] || 0) + 1;
}

console.log("Type col:", headers[typeCol] ?? typeCol, "index:", typeCol);
console.log("SubType col:", headers[subCol] ?? subCol, "index:", subCol);
console.log("Fitting room skin rows:", hits);
console.log("Type distribution:", typeDist);
