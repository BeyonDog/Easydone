import {
  attachTasksToConditions,
  isMapConditionKind,
  parseConditionCsv,
  parseTaskCsvForConditions,
  parseTaskMetaById,
} from "./parseConditions.ts";
import { countTagInMapData, DEFAULT_NEARBY_RADIUS_M, findNearbyRecordsMissingTag, findTagRecords, mapDataHasTag, nearestRoomDistance, parseMapDataAsset } from "./parseMapDataAsset.ts";
import { ROOM_ANCHOR_MAX_DIST_M } from "./constants.ts";
import { resolveMapScopeForCondition } from "./resolveMapScope.ts";
import {
  buildMapVariants,
  groupVariantsByLayer,
  parseMainLevelCsv,
  parseMatchMapConfigJson,
} from "./resolveMapVariants.ts";
import type {
  ConfigCheckTarget,
  HighValueZone,
  RunTagCheckInput,
  TagCheckIssue,
  TagCheckReport,
  TaskMapCondition,
} from "./types.ts";

function terrainLabel(t: "ice" | "fire"): string {
  return t === "fire" ? "火" : "冰";
}

function playerLabel(p: "solo" | "multi"): string {
  return p === "solo" ? "单人" : "多人";
}

function tierLabel(t: string): string {
  if (t === "casual") return "普通";
  if (t === "hard") return "挑战";
  if (t === "hell") return "地狱";
  return t;
}

function hvLabel(z: HighValueZone): string {
  if (z === "in") return "在高资";
  if (z === "out") return "不在高资";
  return "高资未知";
}

function formatTaskRef(condition: TaskMapCondition): { taskId: string; taskName: string } {
  const taskId = condition.taskIds[0] ?? "";
  const taskName = condition.taskNames[0] ?? "";
  return { taskId, taskName };
}

function emptyIssueBase(condition: TaskMapCondition): Omit<TagCheckIssue, "severity" | "kind" | "message"> {
  const { taskId, taskName } = formatTaskRef(condition);
  return {
    conditionKind: condition.kind,
    taskId,
    taskName,
    conditionId: condition.conditionId,
    conditionRemark: condition.remark,
    targetTag: condition.targetTag,
    mapId: 0,
    mapName: "",
    variantLabel: "",
    terrain: "ice",
    playerMode: "multi",
    matchTier: "other",
    variantSuffix: "",
    mapDataFile: "",
    layerFilesChecked: [],
    highValueZone: "unknown",
  };
}

function checkCsvXlsxMismatch(input: RunTagCheckInput, conditions: TaskMapCondition[]): TagCheckIssue[] {
  if (!input.missionConditionRows?.length) return [];
  const byId = new Map(input.missionConditionRows.map((r) => [r.id, r]));
  const issues: TagCheckIssue[] = [];
  for (const c of conditions) {
    if (!isMapConditionKind(c.kind)) continue;
    const row = byId.get(c.conditionId);
    if (!row) continue;
    if (row.targetTag != null && row.targetTag !== c.targetTag) {
      issues.push({
        ...emptyIssueBase(c),
        severity: "warn",
        kind: "csv_xlsx_mismatch",
        message: `Condition.csv Tag=${c.targetTag} 与 Mission.xlsx(${row.targetTag}) 不一致`,
      });
    }
  }
  return issues;
}

function configTargetLabel(t: ConfigCheckTarget): string {
  const names: Record<ConfigCheckTarget["kind"], string> = {
    monster_id: "怪物ID",
    monster_type: "怪物类型",
    monster_group: "怪物组",
    monster_tag: "怪物Tag",
    skill_id: "技能ID",
    mastery_id: "精通ID",
  };
  return `${names[t.kind]}=${t.value}`;
}

function checkConfigTargets(input: RunTagCheckInput, condition: TaskMapCondition): TagCheckIssue[] {
  const issues: TagCheckIssue[] = [];
  const monster = input.monsterCatalog;
  const skills = input.skillIds;
  const masteries = input.masteryIds;
  const mapFileNames = Object.keys(input.mapDataByFileName ?? {});
  const hasMapData = mapFileNames.length > 0;

  for (const t of condition.configTargets) {
    let ok = true;
    if (t.kind === "monster_id") ok = monster ? monster.ids.has(t.value) : true;
    else if (t.kind === "monster_type") ok = monster ? monster.types.has(t.value) : true;
    else if (t.kind === "monster_group") ok = monster ? monster.groups.has(t.value) : true;
    else if (t.kind === "monster_tag") {
      // InstTags live on MapMonsterRecords, not MonsterBase.TagGroup
      if (!hasMapData) continue;
      ok = mapFileNames.some((fileName) => {
        const text = input.mapDataByFileName[fileName];
        if (!text) return false;
        const parsed = parseMapDataAsset(text, fileName);
        return mapDataHasTag(parsed, t.value, "kill");
      });
    } else if (t.kind === "skill_id") ok = skills ? skills.has(t.value) : true;
    else if (t.kind === "mastery_id") ok = masteries ? masteries.has(t.value) : true;

    // If catalog not loaded, skip (avoid false positives)
    if (
      ((t.kind === "monster_id" || t.kind === "monster_type" || t.kind === "monster_group") && !monster) ||
      (t.kind === "skill_id" && !skills) ||
      (t.kind === "mastery_id" && !masteries)
    ) {
      continue;
    }

    if (!ok) {
      const missingWhere = t.kind === "monster_tag" ? "MapData 缺少" : "配置表缺少";
      issues.push({
        ...emptyIssueBase(condition),
        severity: "error",
        kind: "config_missing",
        targetTag: t.value,
        message: `${missingWhere} ${configTargetLabel(t)}（任务 ${condition.taskIds[0] ?? "?"} / 条件 ${condition.conditionId}）`,
      });
    }
  }
  return issues;
}

export function runTagCheck(input: RunTagCheckInput): TagCheckReport {
  const conditions = attachTasksToConditions(
    parseConditionCsv(input.conditionCsvText),
    parseTaskCsvForConditions(input.taskCsvText),
  );
  const taskMetaById = parseTaskMetaById(input.taskCsvText);
  const variants = buildMapVariants(parseMatchMapConfigJson(input.matchMapConfigJson));
  const mainLevelById = input.mainLevelCsvText
    ? parseMainLevelCsv(input.mainLevelCsvText)
    : new Map();
  const missionConditionTextById = input.missionConditionTextById
    ? new Map(Object.entries(input.missionConditionTextById))
    : input.missionConditionRows
      ? new Map(input.missionConditionRows.map((r) => [r.id, r.remark]))
      : undefined;
  const missionTaskTextById = input.missionTaskTextById
    ? new Map(Object.entries(input.missionTaskTextById))
    : undefined;

  const parsedMapCache = new Map<string, ReturnType<typeof parseMapDataAsset>>();
  const getParsed = (fileName: string, sceneBase: string) => {
    const cached = parsedMapCache.get(fileName);
    if (cached) return cached;
    const text = input.mapDataByFileName[fileName];
    if (!text) return null;
    const parsed = parseMapDataAsset(text, sceneBase);
    parsedMapCache.set(fileName, parsed);
    return parsed;
  };

  const issues: TagCheckIssue[] = [...checkCsvXlsxMismatch(input, conditions)];
  const applicableGroups = new Set<string>();

  for (const condition of conditions) {
    if (condition.kind === "kill" || condition.kind === "skill_or_mastery") {
      issues.push(...checkConfigTargets(input, condition));
      continue;
    }

    if (!isMapConditionKind(condition.kind)) continue;

    const mapKind = condition.kind === "arrive" ? "arrive" : "chest_tag";
    const scope = resolveMapScopeForCondition(condition, variants, {
      mainLevelById,
      indexIdToLevelId: input.indexIdToLevelId,
      taskMetaById,
      missionConditionTextById,
      missionTaskTextById,
    });
    if (scope.kind === "unresolved") {
      issues.push({
        ...emptyIssueBase(condition),
        severity: "warn",
        kind: "scope_unresolved",
        message: scope.reason,
      });
      continue;
    }
    const filtered = scope.variants;
    const groups = groupVariantsByLayer(filtered);

    for (const group of groups) {
      applicableGroups.add(`${group.variantSuffix}|${group.matchTier}|${group.terrain}|${group.playerMode}`);
      const layerResults = group.layers.map((layer) => {
        const text = input.mapDataByFileName[layer.mapDataFileName];
        if (!text) {
          return { layer, parsed: null as null, missingFile: true };
        }
        return { layer, parsed: getParsed(layer.mapDataFileName, layer.sceneBase), missingFile: false };
      });

      const missingFiles = layerResults.filter((r) => r.missingFile);
      for (const mf of missingFiles) {
        issues.push({
          ...emptyIssueBase(condition),
          severity: "error",
          kind: "file_missing",
          mapId: mf.layer.mapId,
          mapName: mf.layer.mapName,
          variantLabel: mf.layer.modeLabel,
          terrain: group.terrain,
          playerMode: group.playerMode,
          matchTier: group.matchTier,
          variantSuffix: group.variantSuffix,
          mapDataFile: mf.layer.mapDataFileName,
          layerFilesChecked: group.layers.map((l) => l.mapDataFileName),
          sceneFile: mf.layer.sceneRelativePath,
          highValueZone: "unknown",
          message: `${mf.layer.mapName} · ${mf.layer.modeLabel} · MapData 文件缺失：${mf.layer.mapDataFileName}`,
        });
      }

      const available = layerResults.filter((r) => r.parsed != null) as Array<{
        layer: (typeof group.layers)[0];
        parsed: NonNullable<ReturnType<typeof getParsed>>;
        missingFile: false;
      }>;

      if (available.length === 0) continue;

      const unionHasTag = available.some((r) => mapDataHasTag(r.parsed, condition.targetTag, mapKind));

      const liveLayers = available.filter((r) => r.layer.mapId === 204 || /Map204/.test(r.layer.sceneBase));
      const legacyOnlyHit =
        unionHasTag &&
        liveLayers.length > 0 &&
        !liveLayers.some((r) => mapDataHasTag(r.parsed, condition.targetTag, mapKind)) &&
        available.some(
          (r) =>
            (r.layer.mapId === 202 || r.layer.mapId === 203) &&
            mapDataHasTag(r.parsed, condition.targetTag, mapKind),
        );
      if (legacyOnlyHit) {
        const rep = liveLayers[0]!.layer;
        const legacyTrigger = available
          .filter((r) => r.layer.mapId === 202 || r.layer.mapId === 203)
          .flatMap((r) => findTagRecords(r.parsed, condition.targetTag, mapKind))
          .find((rec) => rec.position != null);
        issues.push({
          ...emptyIssueBase(condition),
          severity: condition.kind === "arrive" ? "error" : "warn",
          kind: "live_layer_missing",
          mapId: rep.mapId,
          mapName: rep.mapName,
          variantLabel: rep.modeLabel,
          terrain: group.terrain,
          playerMode: group.playerMode,
          matchTier: group.matchTier,
          variantSuffix: group.variantSuffix,
          mapDataFile: rep.mapDataFileName,
          layerFilesChecked: group.layers.map((l) => l.mapDataFileName),
          sceneFile: rep.sceneRelativePath,
          position: legacyTrigger?.position,
          recordKind: legacyTrigger?.recordKind,
          highValueZone: "unknown",
          message:
            `Tag ${condition.targetTag} 仅在 legacy 分层(Map202/203)存在，live Map204 缺失（${tierLabel(group.matchTier)} · ${playerLabel(group.playerMode)} · ${terrainLabel(group.terrain)}）`,
        });
      }

      if (!unionHasTag) {
        const repLayer = group.layers[0]!;
        issues.push({
          ...emptyIssueBase(condition),
          severity: "error",
          kind: "missing_tag",
          mapId: repLayer.mapId,
          mapName: repLayer.mapName,
          variantLabel: repLayer.modeLabel,
          terrain: group.terrain,
          playerMode: group.playerMode,
          matchTier: group.matchTier,
          variantSuffix: group.variantSuffix,
          mapDataFile: repLayer.mapDataFileName,
          layerFilesChecked: group.layers.map((l) => l.mapDataFileName),
          sceneFile: repLayer.sceneRelativePath,
          highValueZone: "unknown",
          message:
            `${repLayer.mapName} · ${tierLabel(group.matchTier)} · ${playerLabel(group.playerMode)} · ${terrainLabel(group.terrain)} · ${hvLabel("unknown")} · ` +
            `缺少 Tag ${condition.targetTag}（任务 ${condition.taskIds[0] || "?"} / 条件 ${condition.conditionId}${condition.remark ? ` · ${condition.remark}` : ""}）· ` +
            `场景 ${repLayer.sceneRelativePath} · 已检查分层：${group.layers.map((l) => `Map${l.mapId}`).join("、")}`,
        });
      }

      const counts = available.map((r) => ({
        layer: r.layer,
        count: countTagInMapData(r.parsed, condition.targetTag, mapKind),
      }));
      const nonZero = counts.filter((c) => c.count > 0);
      if (nonZero.length > 1) {
        const distinct = new Set(nonZero.map((c) => c.count));
        if (distinct.size > 1) {
          const rep = nonZero[0]!.layer;
          issues.push({
            ...emptyIssueBase(condition),
            severity: "warn",
            kind: "tag_count_mismatch",
            mapId: rep.mapId,
            mapName: rep.mapName,
            variantLabel: rep.modeLabel,
            terrain: group.terrain,
            playerMode: group.playerMode,
            matchTier: group.matchTier,
            variantSuffix: group.variantSuffix,
            mapDataFile: rep.mapDataFileName,
            layerFilesChecked: group.layers.map((l) => l.mapDataFileName),
            sceneFile: rep.sceneRelativePath,
            highValueZone: "unknown",
            message:
              `Tag ${condition.targetTag} 在 ${group.variantSuffix} 各分层数量不一致：` +
              counts.map((c) => `Map${c.layer.mapId}=${c.count}`).join("，"),
          });
        }
      }

      // Orphan arrive trigger: Tag on Map204 but far from any RoomLvlUp anchor
      if (condition.kind === "arrive" && unionHasTag) {
        const orphanSeen = new Set<string>();
        for (const r of available) {
          if (r.layer.mapId !== 204 && !/Map204/.test(r.layer.sceneBase)) continue;
          if (r.parsed.roomLvlUpInfosEmpty || r.parsed.roomAnchors.length === 0) continue;
          for (const rec of findTagRecords(r.parsed, condition.targetTag, "arrive")) {
            if (!rec.position) continue;
            const dist = nearestRoomDistance(rec.position, r.parsed.roomAnchors);
            if (dist == null || dist <= ROOM_ANCHOR_MAX_DIST_M) continue;
            const posKey = `${rec.position.x.toFixed(2)}|${rec.position.z.toFixed(2)}`;
            const dedupeKey = `${r.layer.mapDataFileName}|${condition.targetTag}|${posKey}`;
            if (orphanSeen.has(dedupeKey)) continue;
            orphanSeen.add(dedupeKey);
            issues.push({
              ...emptyIssueBase(condition),
              severity: "error",
              kind: "orphan_arrive_trigger",
              mapId: r.layer.mapId,
              mapName: r.layer.mapName,
              variantLabel: r.layer.modeLabel,
              terrain: group.terrain,
              playerMode: group.playerMode,
              matchTier: group.matchTier,
              variantSuffix: group.variantSuffix,
              mapDataFile: r.layer.mapDataFileName,
              layerFilesChecked: group.layers.map((l) => l.mapDataFileName),
              sceneFile: r.layer.sceneRelativePath,
              position: rec.position,
              recordKind: rec.recordKind,
              highValueZone: "unknown",
              message:
                `${r.layer.mapName} · ${tierLabel(group.matchTier)} · ${playerLabel(group.playerMode)} · ${terrainLabel(group.terrain)} · ` +
                `到达 Trigger ${condition.targetTag} 附近无有效房间（距最近房间 ${dist.toFixed(1)}m，阈值 ${ROOM_ANCHOR_MAX_DIST_M}m）` +
                `（任务 ${condition.taskIds[0] || "?"} / 条件 ${condition.conditionId}）· ` +
                `坐标 (${rec.position.x.toFixed(2)}, ${rec.position.y.toFixed(2)}, ${rec.position.z.toFixed(2)})`,
            });
          }
        }
      }

      // Cross-layer: task interactable present with empty / wrong InstTags near a tagged anchor
      if (unionHasTag && condition.kind === "chest_tag") {
        const anchors: Array<{
          mapId: number;
          pos: { x: number; y: number; z: number };
        }> = [];
        for (const r of available) {
          for (const rec of findTagRecords(r.parsed, condition.targetTag, mapKind)) {
            if (!rec.position) continue;
            anchors.push({ mapId: r.layer.mapId, pos: rec.position });
          }
        }
        const seen = new Set<string>();
        for (const r of available) {
          for (const anchor of anchors) {
            const nearbyMissing = findNearbyRecordsMissingTag(
              r.parsed,
              anchor.pos,
              condition.targetTag,
              mapKind,
              DEFAULT_NEARBY_RADIUS_M,
            );
            if (nearbyMissing.length === 0) continue;
            // Slot already has correct tag on this layer → skip other nearby chests
            const hasCorrectNearby =
              findTagRecords(r.parsed, condition.targetTag, mapKind).some(
                (rec) =>
                  rec.position != null &&
                  Math.hypot(rec.position.x - anchor.pos.x, rec.position.z - anchor.pos.z) <=
                    DEFAULT_NEARBY_RADIUS_M,
              );
            if (hasCorrectNearby) continue;

            const emptyFirst = nearbyMissing.filter((n) => n.record.tags.length === 0);
            const toReport = emptyFirst.length > 0 ? emptyFirst : nearbyMissing;
            for (const hit of toReport) {
              const pos = hit.record.position!;
              const key = `${r.layer.mapId}|${pos.x.toFixed(2)}|${pos.z.toFixed(2)}|${condition.targetTag}`;
              if (seen.has(key)) continue;
              seen.add(key);
              const empty = hit.record.tags.length === 0;
              issues.push({
                ...emptyIssueBase(condition),
                severity: "warn",
                kind: "empty_or_wrong_tag",
                mapId: r.layer.mapId,
                mapName: r.layer.mapName,
                variantLabel: r.layer.modeLabel,
                terrain: group.terrain,
                playerMode: group.playerMode,
                matchTier: group.matchTier,
                variantSuffix: group.variantSuffix,
                mapDataFile: r.layer.mapDataFileName,
                layerFilesChecked: group.layers.map((l) => l.mapDataFileName),
                sceneFile: r.layer.sceneRelativePath,
                position: pos,
                recordKind: hit.record.recordKind,
                highValueZone: "unknown",
                message:
                  `Tag ${condition.targetTag} 在 Map${r.layer.mapId} 同位置交互物${empty ? "未挂 Tag" : `Tag 不含目标（现有 ${hit.record.tags.join(",") || "空"}）`}` +
                  `（参考 Map${anchor.mapId} · 距 ${hit.distance.toFixed(2)}m）`,
              });
            }
          }
        }
      }
    }

    // kill/skill preconditions on map conditions (rare)
    issues.push(...checkConfigTargets(input, condition));
  }

  const taskIds = new Set(conditions.flatMap((c) => c.taskIds));
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warn").length;

  return {
    conditions,
    issues,
    summary: {
      conditionCount: conditions.length,
      taskCount: taskIds.size,
      variantGroupCount: applicableGroups.size,
      errorCount,
      warnCount,
      checkedAt: Date.now(),
    },
  };
}
