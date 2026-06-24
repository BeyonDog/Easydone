import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type UseHorizontalSplitResizeOptions = {
  widthPx: number;
  onWidthChange: (nextWidthPx: number) => void;
  getContainerWidth: () => number;
  clampWidth: (px: number, containerWidth: number) => number;
  onResizeEnd?: (finalWidthPx: number) => void;
};

type DragSession = {
  pointerId: number;
  startX: number;
  startWidth: number;
};

export function useHorizontalSplitResize({
  widthPx,
  onWidthChange,
  getContainerWidth,
  clampWidth,
  onResizeEnd,
}: UseHorizontalSplitResizeOptions) {
  const sessionRef = useRef<DragSession | null>(null);
  const widthRef = useRef(widthPx);
  widthRef.current = widthPx;
  const [dragging, setDragging] = useState(false);

  const endSession = useCallback(() => {
    sessionRef.current = null;
    setDragging(false);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      sessionRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startWidth: widthRef.current,
      };
      setDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const session = sessionRef.current;
        if (!session || ev.pointerId !== session.pointerId) return;
        const containerWidth = getContainerWidth();
        const delta = ev.clientX - session.startX;
        const next = clampWidth(session.startWidth + delta, containerWidth);
        onWidthChange(next);
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        const session = sessionRef.current;
        if (!session || ev.pointerId !== session.pointerId) {
          endSession();
          return;
        }

        const containerWidth = getContainerWidth();
        const delta = ev.clientX - session.startX;
        const finalWidth = clampWidth(session.startWidth + delta, containerWidth);
        onWidthChange(finalWidth);
        onResizeEnd?.(finalWidth);
        endSession();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [clampWidth, endSession, getContainerWidth, onResizeEnd, onWidthChange],
  );

  return {
    dragging,
    onPointerDown,
  };
}
