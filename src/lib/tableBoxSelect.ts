export const DRAG_THRESHOLD_PX = 4;
export const TABLE_ROW_HEIGHT_ESTIMATE = 30;

export type RowBandHitResult = {
  firstVis: number;
  lastVis: number;
  dataIdxs: number[];
};

export type BoxSelectPointerState = {
  startClientX: number;
  startClientY: number;
  curClientX: number;
  curClientY: number;
  originScrollTop: number;
  originScrollLeft: number;
};

export function pointerDragDistancePx(sel: BoxSelectPointerState): number {
  const dx = sel.curClientX - sel.startClientX;
  const dy = sel.curClientY - sel.startClientY;
  return Math.hypot(dx, dy);
}

export function computeRowBandHits(params: {
  y1: number;
  y2: number;
  rowCount: number;
  rowHeight: number;
  bodyOffsetY: number;
  dataIdxForVisualIndex: (visualIndex: number) => number | undefined;
}): RowBandHitResult | null {
  const { y1, y2, rowCount, rowHeight, bodyOffsetY, dataIdxForVisualIndex } = params;
  if (rowCount <= 0 || rowHeight <= 0) return null;

  const topA = y1 - bodyOffsetY;
  const topB = y2 - bodyOffsetY;
  const bandTop = Math.min(topA, topB);
  const bandBottom = Math.max(topA, topB);
  if (bandBottom < 0) return null;

  const firstVis = Math.max(0, Math.floor(Math.max(0, bandTop) / rowHeight));
  const lastVis = Math.min(rowCount - 1, Math.floor(bandBottom / rowHeight));
  if (lastVis < firstVis) return null;

  const dataIdxs: number[] = [];
  for (let i = firstVis; i <= lastVis; i++) {
    const di = dataIdxForVisualIndex(i);
    if (typeof di === "number") dataIdxs.push(di);
  }
  if (dataIdxs.length === 0) return null;

  return { firstVis, lastVis, dataIdxs };
}

export function computeBoxSelectHitsFromPointer(params: {
  sel: BoxSelectPointerState;
  wrapRectTop: number;
  wrapScrollTop: number;
  rowCount: number;
  rowHeight: number;
  bodyOffsetY: number;
  dataIdxForVisualIndex: (visualIndex: number) => number | undefined;
}): RowBandHitResult | null {
  const { sel, wrapRectTop, wrapScrollTop, rowCount, rowHeight, bodyOffsetY, dataIdxForVisualIndex } =
    params;

  const topA = sel.startClientY - wrapRectTop + sel.originScrollTop;
  const topB = sel.curClientY - wrapRectTop + wrapScrollTop;

  return computeRowBandHits({
    y1: topA,
    y2: topB,
    rowCount,
    rowHeight,
    bodyOffsetY,
    dataIdxForVisualIndex,
  });
}

export function applyBoxSelectToggle(
  selectedRows: Set<number>,
  selectedRowOrder: number[],
  hitDataIdxs: number[],
): { selectedRows: Set<number>; selectedRowOrder: number[] } {
  if (hitDataIdxs.length === 0) {
    return { selectedRows: new Set(selectedRows), selectedRowOrder: [...selectedRowOrder] };
  }

  const hitSet = new Set(hitDataIdxs);
  const hitSelected = hitDataIdxs.filter((di) => selectedRows.has(di));

  const next = new Set(selectedRows);
  if (hitSelected.length > 0) {
    for (const di of hitSelected) next.delete(di);
    return {
      selectedRows: next,
      selectedRowOrder: selectedRowOrder.filter((di) => !hitSet.has(di)),
    };
  }

  for (const di of hitDataIdxs) next.add(di);
  const mergedOrder = [...selectedRowOrder];
  for (const di of hitDataIdxs) {
    if (!mergedOrder.includes(di)) mergedOrder.push(di);
  }
  return { selectedRows: next, selectedRowOrder: mergedOrder };
}

export function boxSelectOverlayStyle(
  sel: BoxSelectPointerState,
  wrapRect: DOMRect,
  wrapScrollLeft: number,
  wrapScrollTop: number,
): { left: number; top: number; width: number; height: number } {
  const x1 = sel.startClientX - wrapRect.left + sel.originScrollLeft;
  const x2 = sel.curClientX - wrapRect.left + wrapScrollLeft;
  const y1 = sel.startClientY - wrapRect.top + sel.originScrollTop;
  const y2 = sel.curClientY - wrapRect.top + wrapScrollTop;
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  return {
    left,
    top,
    width: Math.max(1, Math.abs(x2 - x1)),
    height: Math.max(1, Math.abs(y2 - y1)),
  };
}
