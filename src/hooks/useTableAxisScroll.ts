import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  clampScrollLeft,
  computeMaxScrollLeft,
  isHorizontalDominantWheel,
  resolveHorizontalWheelDelta,
} from "../lib/tableAxisScroll.ts";

export type UseTableAxisScrollOptions = {
  tableRef: RefObject<HTMLTableElement | null>;
  shellRef?: RefObject<HTMLElement | null>;
  /** Bump when table layout width may change (columns, resize, sort). */
  layoutSeq?: number;
  /** Bump when table DOM mounts or row/column content changes. */
  contentSeq?: number;
};

function readContentWidth(
  table: HTMLTableElement | null,
  content: HTMLDivElement | null,
): number {
  if (!table) return 0;
  return Math.max(table.scrollWidth, content?.scrollWidth ?? 0);
}

export function useTableAxisScroll({
  tableRef,
  shellRef,
  layoutSeq = 0,
  contentSeq = 0,
}: UseTableAxisScrollOptions) {
  const tableScrollBodyRef = useRef<HTMLDivElement | null>(null);
  const tableScrollXBarRef = useRef<HTMLDivElement | null>(null);
  const tableScrollSpacerRef = useRef<HTMLDivElement | null>(null);
  const tableScrollContentRef = useRef<HTMLDivElement | null>(null);
  const scrollLeftRef = useRef(0);
  const contentWidthRef = useRef(0);
  const syncingBarRef = useRef(false);
  const [scrollLeft, setScrollLeftState] = useState(0);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);

  const readViewportWidth = useCallback(() => {
    return tableScrollBodyRef.current?.clientWidth ?? 0;
  }, []);

  const readMaxScrollLeft = useCallback(() => {
    const viewportWidth = readViewportWidth();
    if (viewportWidth <= 0) return 0;
    const contentWidth = readContentWidth(tableRef.current, tableScrollContentRef.current);
    return computeMaxScrollLeft(contentWidth, viewportWidth);
  }, [readViewportWidth, tableRef]);

  const syncBarScrollLeft = useCallback((left: number) => {
    const bar = tableScrollXBarRef.current;
    if (!bar || bar.scrollLeft === left) return;
    syncingBarRef.current = true;
    bar.scrollLeft = left;
    syncingBarRef.current = false;
  }, []);

  const applyScrollLeft = useCallback(
    (next: number) => {
      const maxLeft = readMaxScrollLeft();
      const clamped = clampScrollLeft(next, maxLeft);
      if (clamped === scrollLeftRef.current) {
        syncBarScrollLeft(clamped);
        return;
      }
      scrollLeftRef.current = clamped;
      setScrollLeftState(clamped);
      syncBarScrollLeft(clamped);
    },
    [readMaxScrollLeft, syncBarScrollLeft],
  );

  const syncContentWidth = useCallback(() => {
    const table = tableRef.current;
    const content = tableScrollContentRef.current;
    const spacer = tableScrollSpacerRef.current;
    if (!table || !spacer) return;

    const contentWidth = readContentWidth(table, content);
    contentWidthRef.current = contentWidth;
    spacer.style.width = `${contentWidth}px`;

    const maxLeft = computeMaxScrollLeft(contentWidth, readViewportWidth());
    setHasHorizontalOverflow(maxLeft > 0);
    applyScrollLeft(scrollLeftRef.current);
  }, [applyScrollLeft, readViewportWidth, tableRef]);

  const syncViewportScrollLeft = useCallback(() => {
    const maxLeft = computeMaxScrollLeft(contentWidthRef.current, readViewportWidth());
    setHasHorizontalOverflow(maxLeft > 0);
    const clamped = clampScrollLeft(scrollLeftRef.current, maxLeft);
    if (clamped === scrollLeftRef.current) return;
    scrollLeftRef.current = clamped;
    setScrollLeftState(clamped);
    syncBarScrollLeft(clamped);
  }, [readViewportWidth, syncBarScrollLeft]);

  useLayoutEffect(() => {
    syncContentWidth();
    const table = tableRef.current;
    const content = tableScrollContentRef.current;
    const body = tableScrollBodyRef.current;
    const shell = shellRef?.current ?? null;
    const viewport = body?.parentElement ?? null;

    const contentRo = new ResizeObserver(() => syncContentWidth());
    if (table) contentRo.observe(table);
    if (content) contentRo.observe(content);

    const viewportRo = new ResizeObserver(() => syncViewportScrollLeft());
    if (body) viewportRo.observe(body);
    if (viewport) viewportRo.observe(viewport);
    if (shell) viewportRo.observe(shell);

    let rafOuter = 0;
    let rafInner = 0;
    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => syncContentWidth());
    });
    return () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      contentRo.disconnect();
      viewportRo.disconnect();
    };
  }, [tableRef, shellRef, syncContentWidth, syncViewportScrollLeft, layoutSeq, contentSeq]);

  const onHorizontalBarScroll = useCallback(() => {
    if (syncingBarRef.current) return;
    const bar = tableScrollXBarRef.current;
    if (!bar) return;
    const next = bar.scrollLeft;
    if (next === scrollLeftRef.current) return;
    scrollLeftRef.current = next;
    setScrollLeftState(next);
  }, []);

  const onTableBodyWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      if (!isHorizontalDominantWheel(e.deltaX, e.deltaY, e.shiftKey)) return;
      e.preventDefault();
      const delta = resolveHorizontalWheelDelta(e.deltaX, e.deltaY, e.shiftKey);
      applyScrollLeft(scrollLeftRef.current + delta);
    },
    [applyScrollLeft],
  );

  const scrollBodyToTop = useCallback(() => {
    const el = tableScrollBodyRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      el.scrollTop = 0;
    }
  }, []);

  return {
    scrollLeft,
    scrollLeftRef,
    hasHorizontalOverflow,
    tableScrollBodyRef,
    tableScrollXBarRef,
    tableScrollSpacerRef,
    tableScrollContentRef,
    onHorizontalBarScroll,
    onTableBodyWheel,
    scrollBodyToTop,
  };
}
