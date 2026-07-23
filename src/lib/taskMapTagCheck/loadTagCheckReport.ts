import { invoke } from "@tauri-apps/api/core";
import { readSheetFromWorkbook } from "../xlsxHelpers.ts";
import {
  clientMapDataDir,
  conditionCsvPath,
  mainLevelCsvCandidatePaths,
  masteryCsvCandidatePaths,
  matchMapConfigJsonPath,
  monsterBaseCsvCandidatePaths,
  skillCsvCandidatePaths,
  taskCsvCandidatePaths,
} from "../paths.ts";
import {
  buildMapVariants,
  formatIssueDescription,
  formatIssueReason,
  parseMasteryIdSet,
  parseMatchMapConfigJson,
  parseMonsterCatalog,
  parseSkillIdSet,
  runTagCheck,
  type TagCheckReport,
} from "./index.ts";

async function readTextIfExists(path: string): Promise<string | null> {
  try {
    const ok = await invoke<boolean>("path_is_file", { path });
    if (!ok) return null;
    return await invoke<string>("read_text_file", { path });
  } catch {
    return null;
  }
}

async function resolveFirstText(paths: string[]): Promise<string | undefined> {
  for (const p of paths) {
    const text = await readTextIfExists(p);
    if (text && text.trim().length > 0 && !/^[\r\n]+$/.test(text)) return text;
  }
  return undefined;
}

async function resolveTaskCsvText(root: string): Promise<string> {
  const text = await resolveFirstText(taskCsvCandidatePaths(root));
  if (!text) throw new Error("未找到 Config/task.csv 或 Task.csv");
  return text;
}

export async function loadTagCheckReportFromWorkspace(
  root: string,
  missionXlsxBase64?: string | null,
): Promise<TagCheckReport> {
  const trimmed = root.trim();
  if (!trimmed) throw new Error("工作区路径为空");

  const conditionText = await readTextIfExists(conditionCsvPath(trimmed));
  if (!conditionText) throw new Error("未找到 Config/Condition.csv");

  const taskCsvText = await resolveTaskCsvText(trimmed);

  const matchConfigText = await readTextIfExists(matchMapConfigJsonPath(trimmed));
  if (!matchConfigText) throw new Error("未找到 MatchMapConfigData.json");

  const variants = buildMapVariants(parseMatchMapConfigJson(matchConfigText));
  const mapDataDir = clientMapDataDir(trimmed);
  const mapDataByFileName: Record<string, string> = {};
  const uniqueFiles = [...new Set(variants.map((v) => v.mapDataFileName))];

  for (const fileName of uniqueFiles) {
    const path = `${mapDataDir}\\${fileName}`.replace(/\//g, "\\");
    const altPath = `${mapDataDir}/${fileName}`;
    const text = (await readTextIfExists(path)) ?? (await readTextIfExists(altPath));
    if (text) mapDataByFileName[fileName] = text;
  }

  let missionConditionRows: Array<{ id: string; remark: string; targetTag?: number }> | undefined;
  let missionConditionTextById: Record<string, string> | undefined;
  let missionTaskTextById: Record<string, string> | undefined;
  if (missionXlsxBase64) {
    try {
      const sheet = readSheetFromWorkbook(missionXlsxBase64, "Condition");
      missionConditionRows = [];
      missionConditionTextById = {};
      for (let i = 5; i < sheet.length; i++) {
        const row = sheet[i];
        if (!row) continue;
        const id = String(row[0] ?? "").trim();
        if (!/^\d+$/.test(id)) continue;
        const remark = String(row[1] ?? "").trim();
        missionConditionRows.push({ id, remark });
        const desc = String(row[2] ?? "").trim();
        const blob = [remark, desc].filter(Boolean).join(" ");
        if (blob) missionConditionTextById[id] = blob;
      }
    } catch {
      /* optional */
    }
    try {
      const taskSheet = readSheetFromWorkbook(missionXlsxBase64, "Task");
      missionTaskTextById = {};
      for (let i = 5; i < taskSheet.length; i++) {
        const row = taskSheet[i];
        if (!row) continue;
        const id = String(row[0] ?? "").trim();
        if (!/^\d+$/.test(id)) continue;
        const name = String(row[1] ?? "").trim();
        const desc = String(row[2] ?? "").trim();
        const blob = [name, desc].filter(Boolean).join(" ");
        if (blob) missionTaskTextById[id] = blob;
      }
    } catch {
      /* optional */
    }
  }

  const mainLevelCsvText = await resolveFirstText(mainLevelCsvCandidatePaths(trimmed));
  const monsterText = await resolveFirstText(monsterBaseCsvCandidatePaths(trimmed));
  const skillText = await resolveFirstText(skillCsvCandidatePaths(trimmed));
  const masteryText = await resolveFirstText(masteryCsvCandidatePaths(trimmed));

  return runTagCheck({
    conditionCsvText: conditionText,
    taskCsvText: taskCsvText,
    matchMapConfigJson: matchConfigText,
    mapDataByFileName,
    missionConditionRows,
    missionConditionTextById,
    missionTaskTextById,
    mainLevelCsvText,
    monsterCatalog: monsterText ? parseMonsterCatalog(monsterText) : undefined,
    skillIds: skillText ? parseSkillIdSet(skillText) : undefined,
    masteryIds: masteryText ? parseMasteryIdSet(masteryText) : undefined,
  });
}

export function exportIssuesToCsv(issues: TagCheckReport["issues"]): string {
  const header = ["任务ID", "问题描述", "问题原因"];
  const lines = [header.join(",")];
  for (const i of issues) {
    const desc = formatIssueDescription(i).replace(/"/g, '""');
    const reason = formatIssueReason(i).replace(/"/g, '""');
    lines.push([i.taskId, `"${desc}"`, `"${reason}"`].join(","));
  }
  return lines.join("\n");
}
