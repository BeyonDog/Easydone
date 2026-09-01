import type { MapRoomAnchor, MapTaggedRecord, ParsedMapData } from "./types.ts";

function parsePosition(block: string): { x: number; y: number; z: number } | undefined {
  const m =
    block.match(/Position:\s*\{x:\s*([^,]+),\s*y:\s*([^,]+),\s*z:\s*([^}]+)\}/) ??
    block.match(/pos:\s*\{x:\s*([^,]+),\s*y:\s*([^,]+),\s*z:\s*([^}]+)\}/);
  if (!m) return undefined;
  return { x: Number(m[1]), y: Number(m[2]), z: Number(m[3]) };
}

function parseTags(block: string, field: "InstTags" | "triggerTags"): number[] {
  const tags: number[] = [];
  const re = field === "InstTags" ? /TriggerTag:\s*(\d+)/g : /TriggerTag:\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    tags.push(Number(m[1]));
  }
  return tags;
}

function splitRecords(sectionText: string): string[] {
  const trimmed = sectionText.trim();
  if (!trimmed) return [];
  const text = trimmed.startsWith("-") ? `\n  ${trimmed}` : `\n${trimmed}`;
  return text
    .split(/\n  - /)
    .slice(1)
    .map((b) => `- ${b}`);
}

function extractSection(text: string, sectionName: string): string {
  const lines = text.split(/\n/);
  const start = lines.findIndex((l) => l.trim() === `${sectionName}:`);
  if (start < 0) return "";
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^  \w+Records:\s*$/.test(line.trimEnd())) break;
    if (/^  RoomLvlUpInfos:\s*$/.test(line.trimEnd())) break;
    out.push(line);
  }
  return out.join("\n");
}

function extractInfoSection(text: string, sectionName: string): string {
  const lines = text.split(/\n/);
  const start = lines.findIndex((l) => l.trim() === `${sectionName}:`);
  if (start < 0) return "";
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^  \w+Records:\s*$/.test(line.trimEnd())) break;
    if (/^  RoomLvlUpInfos:\s*$/.test(line.trimEnd())) break;
    if (/^  [A-Z]\w*:\s*$/.test(line.trimEnd())) break;
    out.push(line);
  }
  return out.join("\n");
}

function parseRoomId(block: string): number | undefined {
  const m = block.match(/RoomId:\s*(\d+)/);
  if (!m) return undefined;
  return Number(m[1]);
}

function parseRoomAnchors(sectionText: string): MapRoomAnchor[] {
  const anchors: MapRoomAnchor[] = [];
  for (const block of splitRecords(sectionText)) {
    const position = parsePosition(block);
    if (!position) continue;
    anchors.push({ roomId: parseRoomId(block), position });
  }
  return anchors;
}

export function parseMapDataAsset(text: string, sceneBase: string): ParsedMapData {
  const chestSection = extractSection(text, "MapChestBoxRecords");
  const lootSection = extractSection(text, "MapLootRecords");
  const triggerSection = extractSection(text, "MapTriggerRecords");
  const monsterSection = extractSection(text, "MapMonsterRecords");
  const roomSection = extractInfoSection(text, "RoomLvlUpInfos");

  const chestRecords: MapTaggedRecord[] = splitRecords(chestSection).map((block) => ({
    tags: parseTags(block, "InstTags"),
    position: parsePosition(block),
    recordKind: "chest" as const,
  }));

  const lootRecords: MapTaggedRecord[] = splitRecords(lootSection).map((block) => ({
    tags: parseTags(block, "InstTags"),
    position: parsePosition(block),
    recordKind: "loot" as const,
  }));

  const triggerRecords: MapTaggedRecord[] = splitRecords(triggerSection).map((block) => ({
    tags: parseTags(block, "triggerTags"),
    position: parsePosition(block),
    recordKind: "trigger" as const,
  }));

  const monsterRecords: MapTaggedRecord[] = splitRecords(monsterSection).map((block) => ({
    tags: parseTags(block, "InstTags"),
    position: parsePosition(block),
    recordKind: "monster" as const,
  }));

  const roomAnchors = parseRoomAnchors(roomSection);
  const roomLvlUpInfosEmpty = roomAnchors.length === 0 && !/RoomLvlUpInfos:\s*\n\s*-/.test(text);

  return {
    sceneBase,
    chestRecords,
    lootRecords,
    triggerRecords,
    monsterRecords,
    roomAnchors,
    roomLvlUpInfosEmpty,
  };
}

export type MapTagKind = "chest_tag" | "chest" | "arrive" | "kill";

export function mapDataHasTag(data: ParsedMapData, tag: number, kind: MapTagKind): boolean {
  if (kind === "arrive") {
    return data.triggerRecords.some((r) => r.tags.includes(tag));
  }
  if (kind === "kill") {
    return data.monsterRecords.some((r) => r.tags.includes(tag));
  }
  return (
    data.chestRecords.some((r) => r.tags.includes(tag)) ||
    data.lootRecords.some((r) => r.tags.includes(tag))
  );
}

export function findTagRecords(
  data: ParsedMapData,
  tag: number,
  kind: MapTagKind,
): MapTaggedRecord[] {
  if (kind === "arrive") {
    return data.triggerRecords.filter((r) => r.tags.includes(tag));
  }
  if (kind === "kill") {
    return data.monsterRecords.filter((r) => r.tags.includes(tag));
  }
  return [
    ...data.chestRecords.filter((r) => r.tags.includes(tag)),
    ...data.lootRecords.filter((r) => r.tags.includes(tag)),
  ];
}

export function countTagInMapData(data: ParsedMapData, tag: number, kind: MapTagKind): number {
  return findTagRecords(data, tag, kind).length;
}

/** Plane distance on x/z (meters). */
export function planeDistanceXZ(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export const DEFAULT_NEARBY_RADIUS_M = 1.5;

/** Min x/z distance from pos to any room anchor; null when anchors empty. */
export function nearestRoomDistance(
  pos: { x: number; y: number; z: number },
  anchors: MapRoomAnchor[],
): number | null {
  if (anchors.length === 0) return null;
  let min = Infinity;
  for (const anchor of anchors) {
    const d = planeDistanceXZ(pos, anchor.position);
    if (d < min) min = d;
  }
  return min;
}

function interactRecordsForKind(data: ParsedMapData, kind: MapTagKind): MapTaggedRecord[] {
  if (kind === "arrive") return data.triggerRecords;
  return [...data.chestRecords, ...data.lootRecords];
}

/** Records within radius (x/z) of pos. */
export function findNearbyRecords(
  data: ParsedMapData,
  pos: { x: number; y: number; z: number },
  radius: number,
  kind: MapTagKind,
): Array<{ record: MapTaggedRecord; distance: number }> {
  const out: Array<{ record: MapTaggedRecord; distance: number }> = [];
  for (const record of interactRecordsForKind(data, kind)) {
    if (!record.position) continue;
    const distance = planeDistanceXZ(pos, record.position);
    if (distance <= radius) out.push({ record, distance });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out;
}

/**
 * Nearby interactables that are missing `tag`: empty InstTags, or tags that do not include `tag`.
 * Excludes records that already carry `tag`.
 */
export function findNearbyRecordsMissingTag(
  data: ParsedMapData,
  pos: { x: number; y: number; z: number },
  tag: number,
  kind: MapTagKind,
  radius: number = DEFAULT_NEARBY_RADIUS_M,
): Array<{ record: MapTaggedRecord; distance: number }> {
  return findNearbyRecords(data, pos, radius, kind).filter(
    ({ record }) => !record.tags.includes(tag),
  );
}
