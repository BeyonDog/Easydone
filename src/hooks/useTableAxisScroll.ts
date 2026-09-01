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
  resolveHorizontalOverflowVisible,
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
  const hasHorizontalOverflowRef = useRef(false);
  const syncingBarRef = useRef(false);
  const syncRafRef = useRef(0);
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

  const updateHorizontalOverflow = useCallback((maxLeft: number) => {
    const next = resolveHorizontalOverflowVisible(maxLeft, hasHorizontalOverflowRef.current);
    if (next === hasHorizontalOverflowRef.current) return;
    hasHorizontalOverflowRef.current = next;
    setHasHorizontalOverflow(next);
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
    const prevWidth = contentWidthRef.current;
    contentWidthRef.current = contentWidth;
    if (contentWidth !== prevWidth) {
      spacer.style.width = `${contentWidth}px`;
    }

    const maxLeft = computeMaxScrollLeft(contentWidth, readViewportWidth());
    updateHorizontalOverflow(maxLeft);
    applyScrollLeft(scrollLeftRef.current);
  }, [applyScrollLeft, readViewportWidth, tableRef, updateHorizontalOverflow]);

  const syncViewportScrollLeft = useCallback(() => {
    const maxLeft = computeMaxScrollLeft(contentWidthRef.current, readViewportWidth());
    updateHorizontalOverflow(maxLeft);
    const clamped = clampScrollLeft(scrollLeftRef.current, maxLeft);
    if (clamped === scrollLeftRef.current) return;
    scrollLeftRef.current = clamped;
    setScrollLeftState(clamped);
    syncBarScrollLeft(clamped);
  }, [readViewportWidth, syncBarScrollLeft, updateHorizontalOverflow]);

  const runLayoutSync = useCallback(() => {
    syncContentWidth();
    syncViewportScrollLeft();
  }, [syncContentWidth, syncViewportScrollLeft]);

  const scheduleLayoutSync = useCallback(() => {
    if (syncRafRef.current) return;
    syncRafRef.current = requestAnimationFrame(() => {
      syncRafRef.current = 0;
      runLayoutSync();
    });
  }, [runLayoutSync]);

  useLayoutEffect(() => {
    runLayoutSync();
    const table = tableRef.current;
    const content = tableScrollContentRef.current;
    const body = tableScrollBodyRef.current;
    const shell = shellRef?.current ?? null;
    const viewport = body?.parentElement ?? null;

    const ro = new ResizeObserver(() => scheduleLayoutSync());
    if (table) ro.observe(table);
    if (content) ro.observe(content);
    if (body) ro.observe(body);
    if (viewport) ro.observe(viewport);
    if (shell) ro.observe(shell);

    let rafOuter = 0;
    let rafInner = 0;
    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => runLayoutSync());
    });
    return () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      if (syncRafRef.current) {
        cancelAnimationFrame(syncRafRef.current);
        syncRafRef.current = 0;
      }
      ro.disconnect();
    };
  }, [tableRef, shellRef, runLayoutSync, scheduleLayoutSync, layoutSeq, contentSeq]);

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
