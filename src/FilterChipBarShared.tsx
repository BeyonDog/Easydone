import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { qualityDotColor } from "./lib/qualityColors";

const DRAG_THRESHOLD_PX = 4;

export function FilterChipRowShell({
  label,
  onClear,
  clearDisabled,
  children,
}: {
  label: string;
  onClear: () => void;
  clearDisabled: boolean;
  children: ReactNode;
}) {
  return (
    <div className="filter-chip-row">
      <span className="filter-chip-row-label">{label}</span>
      <div className="filter-chip-row-chips">{children}</div>
      <button
        type="button"
        className="filter-chip-row-clear"
        disabled={clearDisabled}
        onClick={onClear}
      >
        清空此类筛选
      </button>
    </div>
  );
}

export function FilterChip({
  label,
  selected,
  onClick,
  prefix,
  qualityDot,
  showClose,
  onClose,
  showRemove,
  onRemove,
  chipRef,
  onChipPointerDown,
  dragging,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  prefix?: ReactNode;
  qualityDot?: string;
  showClose?: boolean;
  onClose?: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
  chipRef?: (el: HTMLButtonElement | null) => void;
  onChipPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  dragging?: boolean;
}) {
  return (
    <button
      type="button"
      ref={chipRef}
      className={`filter-chip${selected ? " filter-chip--selected" : ""}${dragging ? " filter-chip--dragging" : ""}`}
      onClick={onClick}
      onPointerDown={onChipPointerDown}
      title={label}
    >
      {showRemove ? (
        <span
          className="filter-chip-remove"
          role="button"
          tabIndex={-1}
          aria-label={`删除 ${label}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        >
          −
        </span>
      ) : null}
      {showClose ? (
        <span
          className="filter-chip-close"
          role="button"
          tabIndex={-1}
          aria-label={`移入更多 ${label}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
        >
          ×
        </span>
      ) : null}
      {qualityDot ? <span className="filter-chip-quality-dot" style={{ background: qualityDot }} aria-hidden /> : null}
      {prefix ? <span className="filter-chip-prefix">{prefix}</span> : null}
      <span className="filter-chip-text">{label}</span>
    </button>
  );
}

type DragSource = { zone: "bar"; fromIndex: number } | { zone: "more"; key: string };

export type PinnedMoreChipRowProps = {
  barKeys: string[];
  moreKeys: string[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  onReorderBar?: (orderedKeys: string[]) => void;
  onDemoteKey?: (key: string) => void;
  labelPrefix?: (key: string) => ReactNode;
  moreOpen: boolean;
  setMoreOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  moreRef: React.RefObject<HTMLDivElement>;
  moreButtonRef?: React.RefObject<HTMLButtonElement>;
  filterVisibleKey?: (key: string) => boolean;
  moreChipShowRemove?: boolean;
  onRemoveFromMore?: (key: string) => void;
  barClassName?: string;
};

export function PinnedMoreChipRow({
  barKeys,
  moreKeys,
  selectedKeys,
  onToggle,
  onReorderBar,
  onDemoteKey,
  labelPrefix,
  moreOpen,
  setMoreOpen,
  moreRef,
  moreButtonRef,
  filterVisibleKey,
  moreChipShowRemove,
  onRemoveFromMore,
  barClassName,
}: PinnedMoreChipRowProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSource | null>(null);
  const barAtDragRef = useRef<string[]>([]);
  const pendingClickRef = useRef<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [promoteDropIdx, setPromoteDropIdx] = useState<number | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [popoverAlignEnd, setPopoverAlignEnd] = useState(false);

  const barVisible = filterVisibleKey ? barKeys.filter(filterVisibleKey) : barKeys;

  useLayoutEffect(() => {
    if (!moreOpen) return;
    const btn = moreButtonRef?.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const popoverMin = Math.min(576, window.innerWidth * 0.85);
    setPopoverAlignEnd(r.left + popoverMin > window.innerWidth - 8);
  }, [moreOpen, moreButtonRef, moreKeys.length]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    barAtDragRef.current = [];
    pendingClickRef.current = null;
    setDragFrom(null);
    setDropIdx(null);
    setPromoteDropIdx(null);
    setDraggingKey(null);
  }, []);

  const computeBarInsert = useCallback(
    (clientX: number) => {
      const root = barRef.current;
      if (!root) return barVisible.length;
      const chips = root.querySelectorAll<HTMLElement>("[data-chip-dnd-item]");
      const n = chips.length;
      let insert = n;
      for (let i = 0; i < n; i++) {
        const r = chips[i].getBoundingClientRect();
        const mid = r.left + r.width / 2;
        if (clientX < mid) {
          insert = i;
          break;
        }
      }
      return insert;
    },
    [barVisible.length],
  );

  const hitMoreDropZone = useCallback((clientX: number, clientY: number) => {
    const btn = moreButtonRef?.current;
    if (!btn) return false;
    const r = btn.getBoundingClientRect();
    return clientX >= r.left - 10 && clientX <= r.right + 10 && clientY >= r.top - 10 && clientY <= r.bottom + 10;
  }, [moreButtonRef]);

  const startPointerDrag = useCallback(
    (source: DragSource, keyForClick: string, startX: number, startY: number) => {
      if (!onReorderBar) return;
      dragRef.current = source;
      barAtDragRef.current = [...barVisible];
      pendingClickRef.current = keyForClick;

      if (source.zone === "bar") {
        setDragFrom(source.fromIndex);
        setDropIdx(source.fromIndex);
        setPromoteDropIdx(null);
        setDraggingKey(barVisible[source.fromIndex] ?? null);
      } else {
        setDragFrom(null);
        setDropIdx(null);
        setPromoteDropIdx(0);
        setDraggingKey(source.key);
      }

      const onMove = (ev: PointerEvent) => {
        const src = dragRef.current;
        if (!src) return;
        if (
          Math.abs(ev.clientX - startX) < DRAG_THRESHOLD_PX &&
          Math.abs(ev.clientY - startY) < DRAG_THRESHOLD_PX
        ) {
          return;
        }
        pendingClickRef.current = null;

        if (src.zone === "bar") {
          if (hitMoreDropZone(ev.clientX, ev.clientY)) {
            setDropIdx(null);
            setPromoteDropIdx(null);
            return;
          }
          setDropIdx(computeBarInsert(ev.clientX));
          setPromoteDropIdx(null);
          return;
        }

        const barEl = barRef.current;
        if (barEl) {
          const r = barEl.getBoundingClientRect();
          if (
            ev.clientX >= r.left - 8 &&
            ev.clientX <= r.right + 8 &&
            ev.clientY >= r.top - 12 &&
            ev.clientY <= r.bottom + 12
          ) {
            setPromoteDropIdx(computeBarInsert(ev.clientX));
            return;
          }
        }
        setPromoteDropIdx(null);
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        const clickKey = pendingClickRef.current;
        const src = dragRef.current;

        if (clickKey && src) {
          onToggle(clickKey);
          endDrag();
          return;
        }

        if (!src || !onReorderBar) {
          endDrag();
          return;
        }

        if (src.zone === "bar" && hitMoreDropZone(ev.clientX, ev.clientY)) {
          const key = barAtDragRef.current[src.fromIndex];
          if (key) onDemoteKey?.(key);
          endDrag();
          return;
        }

        if (src.zone === "bar") {
          const insert = computeBarInsert(ev.clientX);
          const next = [...barAtDragRef.current];
          const [row] = next.splice(src.fromIndex, 1);
          let to = insert;
          if (to > src.fromIndex) to -= 1;
          next.splice(to, 0, row);
          onReorderBar(next);
          endDrag();
          return;
        }

        const barEl = barRef.current;
        if (barEl) {
          const r = barEl.getBoundingClientRect();
          if (
            ev.clientX >= r.left - 8 &&
            ev.clientX <= r.right + 8 &&
            ev.clientY >= r.top - 12 &&
            ev.clientY <= r.bottom + 12
          ) {
            const insert = computeBarInsert(ev.clientX);
            const next = [...barAtDragRef.current];
            if (!next.includes(src.key)) {
              next.splice(insert, 0, src.key);
              onReorderBar(next);
            }
            endDrag();
            return;
          }
        }

        endDrag();
        if (src.zone === "more") setMoreOpen(true);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [
      barVisible,
      onReorderBar,
      onDemoteKey,
      computeBarInsert,
      endDrag,
      hitMoreDropZone,
      onToggle,
      setMoreOpen,
    ],
  );

  const onBarChipPointerDown = useCallback(
    (index: number, key: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      startPointerDrag({ zone: "bar", fromIndex: index }, key, e.clientX, e.clientY);
    },
    [startPointerDrag],
  );

  const onMoreChipPointerDown = useCallback(
    (key: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      startPointerDrag({ zone: "more", key }, key, e.clientX, e.clientY);
    },
    [startPointerDrag],
  );

  const scrollClassName =
    barClassName ?? "filter-chip-row-chips-inner filter-chip-row-chips-inner--type-remark";

  return (
    <div className="filter-chip-bar-track">
      <div className={`filter-chip-bar-scroll ${scrollClassName}`} ref={barRef}>
        {barVisible.map((key, i) => {
          const showBefore =
            (dropIdx === i && dragFrom !== null && dragFrom !== i) || promoteDropIdx === i;
          return (
            <span key={key} className="filter-chip-dnd-slot" data-chip-dnd-item>
              {showBefore ? <span className="filter-chip-drop-indicator" aria-hidden /> : null}
              <FilterChip
                label={key}
                selected={selectedKeys.includes(key)}
                onClick={() => {}}
                prefix={labelPrefix?.(key)}
                showClose={Boolean(onDemoteKey)}
                onClose={() => onDemoteKey?.(key)}
                onChipPointerDown={onReorderBar ? onBarChipPointerDown(i, key) : undefined}
                dragging={draggingKey === key}
              />
            </span>
          );
        })}
        {(dropIdx === barVisible.length && dragFrom !== null) || promoteDropIdx === barVisible.length ? (
          <span className="filter-chip-drop-indicator filter-chip-drop-indicator--end" aria-hidden />
        ) : null}
      </div>
      {moreKeys.length > 0 ? (
        <div className="filter-chip-more-wrap" ref={moreRef}>
          <button
            type="button"
            ref={moreButtonRef}
            className={`filter-chip filter-chip--more${moreOpen ? " filter-chip--selected" : ""}`}
            onClick={() => setMoreOpen((o) => !o)}
          >
            更多…
            {selectedKeys.filter((k) => moreKeys.includes(k)).length > 0 ? (
              <span className="filter-chip-more-badge">
                {selectedKeys.filter((k) => moreKeys.includes(k)).length}
              </span>
            ) : null}
          </button>
          {moreOpen ? (
            <div
              className={`filter-chip-popover${popoverAlignEnd ? " filter-chip-popover--align-end" : ""}`}
              role="dialog"
              aria-label="更多筛选项"
            >
              <p className="filter-chip-popover-hint">拖到左侧条上可固定显示</p>
              <div className="filter-chip-popover-grid filter-chip-popover-grid--3col">
                {moreKeys.map((key) => (
                  <span key={key} className="filter-chip-more-slot">
                    <FilterChip
                      label={key}
                      selected={selectedKeys.includes(key)}
                      onClick={() => {}}
                      prefix={labelPrefix?.(key)}
                      showRemove={moreChipShowRemove}
                      onRemove={() => onRemoveFromMore?.(key)}
                      onChipPointerDown={onReorderBar ? onMoreChipPointerDown(key) : undefined}
                      dragging={draggingKey === key}
                    />
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function QualityChipRow({
  items,
  selectedKeys,
  onToggle,
  onReorder,
  onDemoteKey,
}: {
  items: string[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  onReorder?: (orderedKeys: string[]) => void;
  onDemoteKey?: (key: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<number | null>(null);
  const itemsAtDragRef = useRef<string[]>([]);
  const pendingClickRef = useRef<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const endDrag = useCallback(() => {
    fromRef.current = null;
    itemsAtDragRef.current = [];
    pendingClickRef.current = null;
    setDragFrom(null);
    setDropIdx(null);
    setDraggingKey(null);
  }, []);

  const onChipPointerDown = useCallback(
    (index: number, key: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!onReorder || e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      fromRef.current = index;
      itemsAtDragRef.current = [...items];
      pendingClickRef.current = key;
      setDragFrom(index);
      setDropIdx(index);
      setDraggingKey(key);

      const onMove = (ev: PointerEvent) => {
        if (fromRef.current === null) return;
        if (
          Math.abs(ev.clientX - startX) < DRAG_THRESHOLD_PX &&
          Math.abs(ev.clientY - startY) < DRAG_THRESHOLD_PX
        ) {
          return;
        }
        pendingClickRef.current = null;
        const root = rowRef.current;
        if (!root) return;
        const chips = root.querySelectorAll<HTMLElement>("[data-chip-dnd-item]");
        const n = chips.length;
        let insert = n;
        for (let i = 0; i < n; i++) {
          const r = chips[i].getBoundingClientRect();
          const mid = r.left + r.width / 2;
          if (ev.clientX < mid) {
            insert = i;
            break;
          }
        }
        setDropIdx(insert);
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        const clickKey = pendingClickRef.current;
        if (clickKey) {
          onToggle(clickKey);
          endDrag();
          return;
        }
        const from = fromRef.current;
        if (from === null) {
          endDrag();
          return;
        }
        const root = rowRef.current;
        let insert = itemsAtDragRef.current.length;
        if (root) {
          const chips = root.querySelectorAll<HTMLElement>("[data-chip-dnd-item]");
          const n = chips.length;
          insert = n;
          for (let i = 0; i < n; i++) {
            const r = chips[i].getBoundingClientRect();
            const mid = r.left + r.width / 2;
            if (ev.clientX < mid) {
              insert = i;
              break;
            }
          }
        }
        const next = [...itemsAtDragRef.current];
        const [row] = next.splice(from, 1);
        let to = insert;
        if (to > from) to -= 1;
        next.splice(to, 0, row);
        onReorder(next);
        endDrag();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [items, onReorder, onToggle, endDrag],
  );

  return (
    <div
      className="filter-chip-row-chips-inner filter-chip-row-chips-inner--scroll"
      ref={rowRef}
    >
      {items.map((key, i) => {
        const showBefore = dropIdx === i && dragFrom !== null && dragFrom !== i;
        return (
          <span key={key} className="filter-chip-dnd-slot" data-chip-dnd-item>
            {showBefore ? <span className="filter-chip-drop-indicator" aria-hidden /> : null}
            <FilterChip
              label={key}
              selected={selectedKeys.includes(key)}
              onClick={onReorder ? () => {} : () => onToggle(key)}
              qualityDot={qualityDotColor(key)}
              showClose={Boolean(onDemoteKey)}
              onClose={() => onDemoteKey?.(key)}
              onChipPointerDown={onReorder ? onChipPointerDown(i, key) : undefined}
              dragging={draggingKey === key}
            />
          </span>
        );
      })}
      {dropIdx === items.length && dragFrom !== null ? (
        <span className="filter-chip-drop-indicator filter-chip-drop-indicator--end" aria-hidden />
      ) : null}
    </div>
  );
}
