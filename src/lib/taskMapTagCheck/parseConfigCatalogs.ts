import type { MonsterCatalog } from "./types.ts";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function headerIndex(header: string[], ...names: string[]): number {
  const lower = names.map((n) => n.toLowerCase());
  return header.findIndex((h) => lower.includes(h.trim().toLowerCase()));
}

/** Collect numeric IDs from a named column (skips header + remark rows). */
export function parseCsvIdColumn(text: string, ...columnNames: string[]): Set<number> {
  const lines = text.trim().split(/\r?\n/);
  const ids = new Set<number>();
  if (lines.length < 2) return ids;
  const header = parseCsvLine(lines[0]!);
  const idx = headerIndex(header, ...columnNames);
  if (idx < 0) return ids;
  for (let i = 2; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const n = Number(cols[idx]?.trim());
    if (Number.isFinite(n) && n > 0) ids.add(n);
  }
  return ids;
}

export function parseMonsterCatalog(text: string): MonsterCatalog {
  const ids = new Set<number>();
  const types = new Set<number>();
  const groups = new Set<number>();
  const tags = new Set<number>();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { ids, types, groups, tags };
  const header = parseCsvLine(lines[0]!);
  const idIdx = headerIndex(header, "MonsterId", "ID");
  const typeIdx = headerIndex(header, "MonsterType");
  const groupIdx = headerIndex(header, "MonsterGroupId");
  const tagIdx = headerIndex(header, "TagGroup");
  for (let i = 2; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const id = Number(cols[idIdx]?.trim());
    if (Number.isFinite(id) && id > 0) ids.add(id);
    if (typeIdx >= 0) {
      const t = Number(cols[typeIdx]?.trim());
      if (Number.isFinite(t) && t > 0) types.add(t);
    }
    if (groupIdx >= 0) {
      const g = Number(cols[groupIdx]?.trim());
      if (Number.isFinite(g) && g > 0) groups.add(g);
    }
    if (tagIdx >= 0) {
      const raw = cols[tagIdx]?.trim() ?? "";
      for (const part of raw.split(/[;|,]/)) {
        const n = Number(part.trim());
        if (Number.isFinite(n) && n > 0) tags.add(n);
      }
    }
  }
  return { ids, types, groups, tags };
}

export function parseSkillIdSet(text: string): Set<number> {
  return parseCsvIdColumn(text, "SkillId", "ID");
}

export function parseMasteryIdSet(text: string): Set<number> {
  return parseCsvIdColumn(text, "MateryID", "MasteryID", "ID");
}
