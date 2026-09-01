/** Fixed accents for class-loadout mastery buttons (keyed by ClassGroupID). */

const CLASS_LOADOUT_GROUP_PALETTE: readonly string[] = [
  "#e5484d", // 战士-ish red
  "#0ea5e9", // ice blue
  "#22c55e", // ranger green
  "#64748b", // assassin slate
  "#f59e0b", // priest amber
  "#ef4444", // mage flame
  "#0d9488", // plague teal
  "#c9a227", // cursed gold
  "#e85d04", // ronin orange
  "#5b8cff", // fist blue
];

/** Stable accent for a ClassGroupID (same group → same color). */
export function classLoadoutAccentForGroup(classGroupId: string): string {
  const id = classGroupId.trim();
  if (!id) return CLASS_LOADOUT_GROUP_PALETTE[0]!;
  const n = Number.parseInt(id, 10);
  if (Number.isFinite(n) && n > 0) {
    return CLASS_LOADOUT_GROUP_PALETTE[(n - 1) % CLASS_LOADOUT_GROUP_PALETTE.length]!;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CLASS_LOADOUT_GROUP_PALETTE[hash % CLASS_LOADOUT_GROUP_PALETTE.length]!;
}
