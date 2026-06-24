export type PinnedRowOrderState = { item: number[]; task: number[] };

/** Move toAdd to the front of pinned order (selectionOrder first), keep rest deduped. */
export function pinSelectionToFront(
  existing: number[],
  toAdd: number[],
  selectionOrder: number[],
): number[] {
  if (toAdd.length === 0) return existing;
  const toAddSet = new Set(toAdd);
  const front: number[] = [];
  const seen = new Set<number>();

  for (const di of selectionOrder) {
    if (toAddSet.has(di) && !seen.has(di)) {
      front.push(di);
      seen.add(di);
    }
  }
  for (const di of toAdd) {
    if (!seen.has(di)) {
      front.push(di);
      seen.add(di);
    }
  }
  for (const di of existing) {
    if (!seen.has(di)) {
      front.push(di);
      seen.add(di);
    }
  }
  return front;
}

/** Pin visible selected rows to front for one table. */
export function pinVisibleSelectionToFront(
  pinned: PinnedRowOrderState,
  table: "item" | "task",
  visibleSelectedIdxs: number[],
  selectionOrder: number[],
): PinnedRowOrderState {
  if (visibleSelectedIdxs.length === 0) return pinned;
  const key = table === "item" ? "item" : "task";
  return { ...pinned, [key]: pinSelectionToFront(pinned[key], visibleSelectedIdxs, selectionOrder) };
}

/** Merge newly pinned dataIdxs into existing order; selectionOrder determines append order among toAdd. */
export function mergePinnedOrder(
  existing: number[],
  toAdd: number[],
  selectionOrder: number[],
): number[] {
  if (toAdd.length === 0) return existing;
  const set = new Set(existing);
  const ordered = [...existing];
  const toAddSet = new Set(toAdd);

  for (const di of selectionOrder) {
    if (toAddSet.has(di) && !set.has(di)) {
      ordered.push(di);
      set.add(di);
    }
  }
  for (const di of toAdd) {
    if (!set.has(di)) {
      ordered.push(di);
      set.add(di);
    }
  }
  return ordered;
}

export type PinRowLike = { dataIdx: number };

/** Partition visible rows: pinned first (by pinnedOrder), then the rest in original order. */
export function partitionRowsByPinOrder<T extends PinRowLike>(rows: T[], pinnedOrder: number[]): T[] {
  if (pinnedOrder.length === 0 || rows.length === 0) return rows;

  const rowByIdx = new Map(rows.map((r) => [r.dataIdx, r]));
  const pinnedSet = new Set<number>();
  const pinned: T[] = [];

  for (const di of pinnedOrder) {
    const row = rowByIdx.get(di);
    if (row) {
      pinned.push(row);
      pinnedSet.add(di);
    }
  }

  if (pinned.length === 0) return rows;

  const rest = rows.filter((r) => !pinnedSet.has(r.dataIdx));
  return [...pinned, ...rest];
}
