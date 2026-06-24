import { useCallback, useRef, useState, type ReactNode } from "react";
import type { SidebarCardDescriptor } from "./lib/sidebarCardRegistry.ts";

function computeListInsertIndex(rows: HTMLElement[], clientY: number): number {
  const n = rows.length;
  for (let i = 0; i < n; i++) {
    const r = rows[i]!.getBoundingClientRect();
    const mid = r.top + r.height / 2;
    if (clientY < mid) return i;
  }
  return n;
}

function computeGridInsertIndex(rows: HTMLElement[], clientX: number, clientY: number): number {
  const n = rows.length;
  if (n === 0) return 0;

  const rects = rows.map((el) => el.getBoundingClientRect());
  const rowTops = [...new Set(rects.map((r) => Math.round(r.top)))].sort((a, b) => a - b);

  let targetRow = rowTops.length - 1;
  for (let i = 0; i < rowTops.length; i++) {
    const top = rowTops[i]!;
    const rowEls = rects
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => Math.round(r.top) === top);
    const rowHeight = rowEls[0]!.r.height;
    const rowMid = top + rowHeight / 2;
    if (clientY < rowMid) {
      targetRow = i;
      break;
    }
  }

  const targetTop = rowTops[targetRow]!;
  const inRow = rects
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => Math.round(r.top) === targetTop)
    .sort((a, b) => a.r.left - b.r.left);

  for (const { r, idx } of inRow) {
    const mid = r.left + r.width / 2;
    if (clientX < mid) return idx;
  }

  const lastInRow = inRow[inRow.length - 1]!.idx;
  return lastInRow + 1;
}

export type SidebarCardDnDProps = {
  layout: "list" | "grid";
  cards: SidebarCardDescriptor[];
  listClassName?: string;
  onReorder: (orderedIds: string[]) => void;
  renderCard: (card: SidebarCardDescriptor, dragHandle: ReactNode) => ReactNode;
};

export function SidebarCardDnD({
  layout,
  cards,
  listClassName,
  onReorder,
  renderCard,
}: SidebarCardDnDProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<number | null>(null);
  const itemsAtDragRef = useRef<SidebarCardDescriptor[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const endDrag = useCallback(() => {
    fromRef.current = null;
    itemsAtDragRef.current = [];
    setDragFrom(null);
    setDropIdx(null);
  }, []);

  const computeInsert = useCallback(
    (clientX: number, clientY: number) => {
      const root = listRef.current;
      if (!root) return cards.length;
      const rows = root.querySelectorAll<HTMLElement>("[data-sidebar-dnd-item]");
      return layout === "grid"
        ? computeGridInsertIndex([...rows], clientX, clientY)
        : computeListInsertIndex([...rows], clientY);
    },
    [cards.length, layout],
  );

  const onHandlePointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();
      fromRef.current = index;
      itemsAtDragRef.current = [...cards];
      setDragFrom(index);
      setDropIdx(index);

      const onMove = (ev: PointerEvent) => {
        if (fromRef.current === null) return;
        setDropIdx(computeInsert(ev.clientX, ev.clientY));
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        const from = fromRef.current;
        if (from === null) {
          endDrag();
          return;
        }
        const insert = computeInsert(ev.clientX, ev.clientY);
        const src = itemsAtDragRef.current;
        const next = [...src];
        const [row] = next.splice(from, 1);
        let to = insert;
        if (to > from) to -= 1;
        next.splice(to, 0, row);
        onReorder(next.map((c) => c.id));
        endDrag();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [cards, computeInsert, endDrag, onReorder],
  );

  const rootClass =
    layout === "grid"
      ? `sidebar-gallery-grid${listClassName ? ` ${listClassName}` : ""}`
      : `sidebar-template-dnd-list${listClassName ? ` ${listClassName}` : ""}`;

  return (
    <div className={rootClass} ref={listRef}>
      {cards.map((card, i) => {
        const showBefore = dropIdx === i && dragFrom !== null && dragFrom !== i;
        const handle = (
          <span
            className="sidebar-card-drag-handle"
            aria-hidden
            onPointerDown={onHandlePointerDown(i)}
            title="拖动排序"
          >
            ⋮⋮
          </span>
        );
        return (
          <div key={card.id} className="sidebar-template-dnd-slot" data-sidebar-dnd-item>
            {showBefore ? <div className="sidebar-template-drop-indicator" aria-hidden /> : null}
            {renderCard(card, handle)}
          </div>
        );
      })}
      {dropIdx === cards.length && dragFrom !== null ? (
        <div className="sidebar-template-drop-indicator sidebar-template-drop-indicator--end" aria-hidden />
      ) : null}
    </div>
  );
}
