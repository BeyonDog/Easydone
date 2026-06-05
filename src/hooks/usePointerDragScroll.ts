import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,

} from "react";
import { DRAG_THRESHOLD_PX } from "../lib/tableBoxSelect.ts";
import { isPointerDragScrollIgnoredTarget } from "../lib/pointerDragScrollTarget.ts";

export type UsePointerDragScrollOptions = {
  enabled?: boolean;
  shouldIgnoreTarget?: (target: EventTarget | null) => boolean;
};

type DragSession = {
  pointerId: number;
  startY: number;
  originScrollTop: number;
  scrollDrag: boolean;
};

export function usePointerDragScroll(options: UsePointerDragScrollOptions = {}) {
  const { enabled = true, shouldIgnoreTarget = isPointerDragScrollIgnoredTarget } = options;
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const consumeNextClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const endSession = useCallback(() => {
    sessionRef.current = null;
    setDragging(false);
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || e.button !== 0) return;
      if (shouldIgnoreTarget(e.target)) return;
      const el = scrollRef.current;
      if (!el) return;

      sessionRef.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        originScrollTop: el.scrollTop,
        scrollDrag: false,
      };

      const onMove = (ev: PointerEvent) => {
        const session = sessionRef.current;
        if (!session || ev.pointerId !== session.pointerId) return;
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;

        const dy = ev.clientY - session.startY;
        if (!session.scrollDrag && Math.abs(dy) < DRAG_THRESHOLD_PX) return;

        if (!session.scrollDrag) {
          session.scrollDrag = true;
          setDragging(true);
        }

        ev.preventDefault();
        scrollEl.scrollTop = session.originScrollTop - dy;
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

        if (session.scrollDrag) {
          consumeNextClickRef.current = true;
        }
        endSession();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [enabled, shouldIgnoreTarget, endSession],
  );

  const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!consumeNextClickRef.current) return;
    consumeNextClickRef.current = false;
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return {
    ref: scrollRef,
    dragging,
    handlers: { onPointerDown },
    onClickCapture,
  };
}
