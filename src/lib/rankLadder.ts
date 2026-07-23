import { cellStr, parseCellAsInteger, type SheetMatrix } from "./xlsxHelpers.ts";

/** RankGroupID 1~9 展示名（ERank） */
export const RANK_GROUP_DISPLAY_NAMES: Readonly<Record<number, string>> = {
  1: "初心",
  2: "青铜",
  3: "白银",
  4: "黄金",
  5: "白金",
  6: "钻石",
  7: "传奇",
  8: "荣耀",
  9: "至高荣耀",
};

/** S6 各大段进入所需段位分（fallback / golden） */
export const S6_GROUP_SCORE_MIN: Readonly<Record<number, number>> = {
  1: 1,
  2: 300,
  3: 1900,
  4: 4400,
  5: 6900,
  6: 9400,
  7: 11900,
  8: 14400,
  9: 19300,
};

export const S6_SEASON_INITIAL_SCORE = 1;

export type RankRow = {
  rankId: number;
  rankGroupId: number;
  scoreMin: number;
  scoreMax: number | null;
  name: string;
  seasonStart?: string | null;
  seasonEnd?: string | null;
};

export type RankLadderStop = {
  /** 小段位 RankID；大段入口节点也对应该大段最低 RankID */
  rankId: number;
  rankGroupId: number;
  scoreMin: number;
  name: string;
  /** 大段入口节点（进度条大节点） */
  isMajor: boolean;
  groupName: string;
};

export type RankLadder = {
  rows: RankRow[];
  stops: RankLadderStop[];
  source: "excel" | "csv" | "fallback";
  seasonLabel?: string;
  initialScore: number;
};

function headerKey(v: unknown): string {
  return cellStr(v)
    .replace(/^\ufeff/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "");
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  const keys = headers.map((h) => headerKey(h));
  for (const c of candidates) {
    const want = headerKey(c);
    const idx = keys.findIndex((k) => k === want);
    if (idx >= 0) return idx;
  }
  for (const c of candidates) {
    const want = headerKey(c);
    const idx = keys.findIndex((k) => k.includes(want) || want.includes(k));
    if (idx >= 0 && want.length >= 4) return idx;
  }
  return -1;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "," || ch === "\t") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseCsvToMatrix(text: string): SheetMatrix {
  const lines = text
    .replace(/^\ufeff/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  return lines.map((line) => splitCsvLine(line));
}

function defaultMinorName(groupId: number, _rankId: number, indexInGroup: number, groupSize: number): string {
  const groupName = RANK_GROUP_DISPLAY_NAMES[groupId] ?? `段位${groupId}`;
  if (groupId === 1) return indexInGroup === 0 ? "见习" : `${groupName}${groupSize - indexInGroup}`;
  if (groupId === 8) return `${groupName} 星档${indexInGroup + 1}`;
  if (groupId === 9) return groupName;
  const tier = groupSize - indexInGroup;
  return `${groupName}${tier}`;
}

/** 内置 S6 小段位阶梯（约 36 档），无工作区表时使用 */
export function buildS6FallbackRows(): RankRow[] {
  const rows: RankRow[] = [];
  let rankId = 1;

  const pushGroup = (groupId: number, count: number, scoreMin: number, nextGroupMin: number | null) => {
    const span =
      nextGroupMin != null && nextGroupMin > scoreMin
        ? nextGroupMin - scoreMin
        : Math.max(100, count * 100);
    const step = count > 0 ? Math.floor(span / count) : span;
    for (let i = 0; i < count; i++) {
      const min = scoreMin + i * step;
      const max =
        i === count - 1
          ? nextGroupMin != null
            ? nextGroupMin
            : null
          : scoreMin + (i + 1) * step;
      rows.push({
        rankId,
        rankGroupId: groupId,
        scoreMin: min,
        scoreMax: max,
        name: defaultMinorName(groupId, rankId, i, count),
      });
      rankId += 1;
    }
  };

  // RankID 1 见习；2~5 青铜4→1；6~10 白银；11~15 黄金；16~20 白金；21~25 钻石；26~30 传奇；31~35 荣耀；36 至高
  pushGroup(1, 1, 1, 300);
  pushGroup(2, 4, 300, 1900);
  pushGroup(3, 5, 1900, 4400);
  pushGroup(4, 5, 4400, 6900);
  pushGroup(5, 5, 6900, 9400);
  pushGroup(6, 5, 9400, 11900);
  pushGroup(7, 5, 11900, 14400);
  pushGroup(8, 5, 14400, 19300);
  pushGroup(9, 1, 19300, null);
  return rows;
}

export function buildSliderStops(rows: RankRow[]): RankLadderStop[] {
  const sorted = [...rows].sort((a, b) => a.rankId - b.rankId || a.scoreMin - b.scoreMin);
  const seenGroups = new Set<number>();
  const stops: RankLadderStop[] = [];
  for (const row of sorted) {
    const groupName = RANK_GROUP_DISPLAY_NAMES[row.rankGroupId] ?? `段位${row.rankGroupId}`;
    const isMajor = !seenGroups.has(row.rankGroupId);
    if (isMajor) seenGroups.add(row.rankGroupId);
    stops.push({
      rankId: row.rankId,
      rankGroupId: row.rankGroupId,
      scoreMin: row.scoreMin,
      name: row.name || defaultMinorName(row.rankGroupId, row.rankId, 0, 1),
      isMajor,
      groupName,
    });
  }
  return stops;
}

export function scoreMinForRankId(rows: RankRow[], rankId: number): number | null {
  const row = rows.find((r) => r.rankId === rankId);
  return row?.scoreMin ?? null;
}

export function computeRankUpgradeDelta(currentScore: number, targetScoreMin: number): number {
  if (!Number.isFinite(currentScore) || !Number.isFinite(targetScoreMin)) return 0;
  return Math.floor(targetScoreMin) - Math.floor(currentScore);
}

function rowInSeason(row: RankRow, seasonStartIso: string | null): boolean {
  if (!seasonStartIso) return true;
  const start = row.seasonStart?.trim();
  const end = row.seasonEnd?.trim();
  if (!start && !end) return true;
  if (start && seasonStartIso < start) return false;
  if (end && seasonStartIso > end) return false;
  return true;
}

export function parseRankSheet(
  aoa: SheetMatrix,
  opts?: { seasonStartIso?: string | null },
): { ok: true; rows: RankRow[] } | { ok: false; error: string } {
  if (!aoa.length) return { ok: false, error: "Rank 表为空" };
  let headerRow = 0;
  let headers = (aoa[0] ?? []).map((c) => cellStr(c));
  for (let r = 0; r < Math.min(8, aoa.length); r++) {
    const h = (aoa[r] ?? []).map((c) => cellStr(c));
    if (
      findHeaderIndex(h, ["RankID", "rank_id", "段位ID"]) >= 0 &&
      findHeaderIndex(h, ["RankGroupID", "rank_group_id", "大段位ID"]) >= 0
    ) {
      headerRow = r;
      headers = h;
      break;
    }
  }

  const idIdx = findHeaderIndex(headers, ["RankID", "rank_id", "段位ID", "Id"]);
  const groupIdx = findHeaderIndex(headers, ["RankGroupID", "rank_group_id", "大段位ID", "GroupID"]);
  const minIdx = findHeaderIndex(headers, [
    "ScoreMin",
    "score_min",
    "RankScoreMin",
    "MinScore",
    "分数下界",
    "段位分下界",
    "LowerBound",
  ]);
  const maxIdx = findHeaderIndex(headers, [
    "ScoreMax",
    "score_max",
    "RankScoreMax",
    "MaxScore",
    "分数上界",
    "段位分上界",
    "UpperBound",
  ]);
  const nameIdx = findHeaderIndex(headers, ["Name", "name", "段位名", "RankName", "DisplayName", "备注"]);
  const seasonStartIdx = findHeaderIndex(headers, ["SeasonStart", "season_start", "赛季开始"]);
  const seasonEndIdx = findHeaderIndex(headers, ["SeasonEnd", "season_end", "赛季结束"]);

  if (idIdx < 0 || groupIdx < 0 || minIdx < 0) {
    return { ok: false, error: "Rank 表缺少 RankID / RankGroupID / ScoreMin 列" };
  }

  const seasonStartIso = opts?.seasonStartIso ?? null;
  const rows: RankRow[] = [];
  for (let r = headerRow + 1; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    const rankId = parseCellAsInteger(row[idIdx]);
    const rankGroupId = parseCellAsInteger(row[groupIdx]);
    const scoreMin = parseCellAsInteger(row[minIdx]);
    if (rankId == null || rankGroupId == null || scoreMin == null) continue;
    const scoreMax = maxIdx >= 0 ? parseCellAsInteger(row[maxIdx]) : null;
    const nameRaw = nameIdx >= 0 ? cellStr(row[nameIdx]).trim() : "";
    const entry: RankRow = {
      rankId,
      rankGroupId,
      scoreMin,
      scoreMax,
      name: nameRaw || defaultMinorName(rankGroupId, rankId, 0, 1),
      seasonStart: seasonStartIdx >= 0 ? cellStr(row[seasonStartIdx]).trim() || null : null,
      seasonEnd: seasonEndIdx >= 0 ? cellStr(row[seasonEndIdx]).trim() || null : null,
    };
    if (!rowInSeason(entry, seasonStartIso)) continue;
    rows.push(entry);
  }

  if (!rows.length) return { ok: false, error: "Rank 表无有效数据行" };
  rows.sort((a, b) => a.rankId - b.rankId || a.scoreMin - b.scoreMin);
  return { ok: true, rows };
}

export function parseRankingSeasonInfoCsv(text: string): {
  seasonLabel: string | null;
  seasonStartIso: string | null;
  initialScore: number;
} {
  const aoa = parseCsvToMatrix(text);
  if (aoa.length < 2) {
    return { seasonLabel: null, seasonStartIso: null, initialScore: S6_SEASON_INITIAL_SCORE };
  }
  const headers = (aoa[0] ?? []).map((c) => cellStr(c));
  const labelIdx = findHeaderIndex(headers, ["SeasonName", "Name", "赛季", "Season"]);
  const startIdx = findHeaderIndex(headers, ["SeasonStart", "StartTime", "开始", "Start"]);
  const initIdx = findHeaderIndex(headers, ["InitialScore", "InitScore", "初始分", "StartScore"]);

  let best: { seasonLabel: string | null; seasonStartIso: string | null; initialScore: number } | null =
    null;
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    const label = labelIdx >= 0 ? cellStr(row[labelIdx]).trim() : "";
    const start = startIdx >= 0 ? cellStr(row[startIdx]).trim() : "";
    const init = initIdx >= 0 ? parseCellAsInteger(row[initIdx]) : null;
    const candidate = {
      seasonLabel: label || null,
      seasonStartIso: start || null,
      initialScore: init ?? S6_SEASON_INITIAL_SCORE,
    };
    if (!best) {
      best = candidate;
      continue;
    }
    if (candidate.seasonStartIso && (!best.seasonStartIso || candidate.seasonStartIso >= best.seasonStartIso)) {
      best = candidate;
    }
  }
  return best ?? { seasonLabel: null, seasonStartIso: null, initialScore: S6_SEASON_INITIAL_SCORE };
}

export function buildRankLadderFromRows(
  rows: RankRow[],
  source: RankLadder["source"],
  opts?: { seasonLabel?: string; initialScore?: number },
): RankLadder {
  return {
    rows,
    stops: buildSliderStops(rows),
    source,
    seasonLabel: opts?.seasonLabel,
    initialScore: opts?.initialScore ?? S6_SEASON_INITIAL_SCORE,
  };
}

export function buildS6FallbackLadder(): RankLadder {
  return buildRankLadderFromRows(buildS6FallbackRows(), "fallback", {
    seasonLabel: "Season 6 (fallback)",
    initialScore: S6_SEASON_INITIAL_SCORE,
  });
}
