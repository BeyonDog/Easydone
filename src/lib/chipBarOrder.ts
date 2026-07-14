/** 顶栏固定 Chip 与「更多」区：saved 有值时以 saved 为顶栏，否则用 defaultPinned；more = allKeys − pinned */
export function splitChipBarPinnedAndMore(
  allKeys: string[],
  savedBarOrder: string[] | null | undefined,
  defaultPinned: string[],
): { pinned: string[]; more: string[] } {
  const allSet = new Set(allKeys);
  const pinned = savedBarOrder?.length
    ? savedBarOrder.filter((k) => allSet.has(k))
    : defaultPinned.filter((k) => allSet.has(k));
  const pinnedSet = new Set(pinned);
  return {
    pinned,
    more: allKeys.filter((k) => !pinnedSet.has(k)),
  };
}
