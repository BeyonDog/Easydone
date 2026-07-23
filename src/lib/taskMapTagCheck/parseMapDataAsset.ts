import type { MapTaggedRecord, ParsedMapData } from "./types.ts";

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
    out.push(line);
  }
  return out.join("\n");
}

export function parseMapDataAsset(text: string, sceneBase: string): ParsedMapData {
  const chestSection = extractSection(text, "MapChestBoxRecords");
  const lootSection = extractSection(text, "MapLootRecords");
  const triggerSection = extractSection(text, "MapTriggerRecords");

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

  const roomLvlUpInfosEmpty = !/RoomLvlUpInfos:\s*\n\s*-/.test(text);

  return { sceneBase, chestRecords, lootRecords, triggerRecords, roomLvlUpInfosEmpty };
}

export type MapTagKind = "chest_tag" | "chest" | "arrive";

export function mapDataHasTag(data: ParsedMapData, tag: number, kind: MapTagKind): boolean {
  if (kind === "arrive") {
    return data.triggerRecords.some((r) => r.tags.includes(tag));
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
  return [
    ...data.chestRecords.filter((r) => r.tags.includes(tag)),
    ...data.lootRecords.filter((r) => r.tags.includes(tag)),
  ];
}

export function countTagInMapData(data: ParsedMapData, tag: number, kind: MapTagKind): number {
  return findTagRecords(data, tag, kind).length;
}
