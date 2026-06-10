import {
  useCallback,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  findTemplateCardDropTarget,
  formatRowTemplateDragLabel,
  resolveTemplateDragRows,
  shouldActivateRowTemplateDrag,
} from "../lib/tableRowTemplateDrag.ts";
import type { BoxSelectPointerState } from "../lib/tableBoxSelect.ts";
import type { SheetMatrix } from "../lib/xlsxHelpers.ts";

export type UseTableRowToTemplateDragOptions = {
  enabled: boolean;
  tableSource: "item" | "task" | null;
  selectedRows: Set<number>;
  currentAoa: SheetMatrix | null;
  boxSelectRef: MutableRefObject<BoxSelectPointerState | null>;
  onCancelBoxSelect: () => void;
  onDrop: (templateId: string, rows: Set<number>) => void | Promise<void>;
};

type PendingRowDrag = {
  anchorDataIdx: number;
  startClientX: number;
  startClientY: number;
  pointerId: number;
};

type ActiveRowDrag = {
  source: "item" | "task";
  rows: Set<number>;
  label: string;
  clientX: number;
  clientY: number;
};

function isRowDragInteractiveTarget(t: EventTarget | null): boolean {
  const el = t instanceof HTMLElement ? t : null;
  if (!el) return false;
  return Boolean(el.closest("input,button,select,textarea,a,[role='button']"));
}

export function useTableRowToTemplateDrag({
  enabled,
  tableSource,
  selectedRows,
  currentAoa,
  boxSelectRef,
  onCancelBoxSelect,
  onDrop,
}: UseTableRowToTemplateDragOptions) {
  const pendingRef = useRef<PendingRowDrag | null>(null);
  const activeRef = useRef<ActiveRowDrag | null>(null);
  const selectedRowsRef = useRef(selectedRows);
  selectedRowsRef.current = selectedRows;

  const [dragging, setDragging] = useState<ActiveRowDrag | null>(null);
  const [rowTemplatePressActive, setRowTemplatePressActive] = useState(false);
  const [hoverTemplateId, setHoverTemplateId] = useState<string | null>(null);
  const [rejectTemplateId, setRejectTemplateId] = useState<string | null>(null);

  const clearDropHighlight = useCallback(() => {
    setHoverTemplateId(null);
    setRejectTemplateId(null);
  }, []);

  const endSession = useCallback(() => {
    pendingRef.current = null;
    activeRef.current = null;
    setDragging(null);
    setRowTemplatePressActive(false);
    clearDropHighlight();
  }, [clearDropHighlight]);

  const updateDropHighlight = useCallback(
    (clientX: number, clientY: number, source: "item" | "task") => {
      const hit = findTemplateCardDropTarget(document.elementFromPoint(clientX, clientY));
      if (!hit) {
        clearDropHighlight();
        return;
      }
      if (hit.source === source) {
        setHoverTemplateId(hit.templateId);
        setRejectTemplateId(null);
      } else {
        setHoverTemplateId(null);
        setRejectTemplateId(hit.templateId);
      }
    },
    [clearDropHighlight],
  );

  const onRowPointerDown = useCallback(
    (dataIdx: number, e: ReactPointerEvent<HTMLTableRowElement>) => {
      if (!enabled || !tableSource || !currentAoa) return;
      if (e.button !== 0) return;
      if (isRowDragInteractiveTarget(e.target)) return;

      const rows = resolveTemplateDragRows(selectedRowsRef.current, dataIdx, currentAoa, tableSource);
      if (!rows) return;

      const pointerId = e.pointerId;
      pendingRef.current = {
        anchorDataIdx: dataIdx,
        startClientX: e.clientX,
        startClientY: e.clientY,
        pointerId,
      };
      setRowTemplatePressActive(true);

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        const active = activeRef.current;
        if (active) {
          ev.preventDefault();
          const next: ActiveRowDrag = {
            ...active,
            clientX: ev.clientX,
            clientY: ev.clientY,
          };
          activeRef.current = next;
          setDragging(next);
          updateDropHighlight(ev.clientX, ev.clientY, active.source);
          return;
        }

        const pending = pendingRef.current;
        if (!pending || !tableSource || !currentAoa) return;

        const dx = ev.clientX - pending.startClientX;
        const dy = ev.clientY - pending.startClientY;
        const overCard = Boolean(
          findTemplateCardDropTarget(document.elementFromPoint(ev.clientX, ev.clientY)),
        );
        if (!shouldActivateRowTemplateDrag(dx, dy, overCard)) return;

        const dragRows = resolveTemplateDragRows(
          selectedRowsRef.current,
          pending.anchorDataIdx,
          currentAoa,
          tableSource,
        );
        if (!dragRows) {
          endSession();
          return;
        }

        if (boxSelectRef.current) {
          boxSelectRef.current = null;
          onCancelBoxSelect();
        }

        ev.preventDefault();
        const label = formatRowTemplateDragLabel(dragRows, tableSource, currentAoa);
        const nextActive: ActiveRowDrag = {
          source: tableSource,
          rows: dragRows,
          label,
          clientX: ev.clientX,
          clientY: ev.clientY,
        };
        activeRef.current = nextActive;
        pendingRef.current = null;
        setDragging(nextActive);
        updateDropHighlight(ev.clientX, ev.clientY, tableSource);
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;

        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        const active = activeRef.current;
        if (active) {
          const hit = findTemplateCardDropTarget(document.elementFromPoint(ev.clientX, ev.clientY));
          if (hit && hit.source === active.source) {
            void onDrop(hit.templateId, active.rows);
          }
        }

        endSession();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [
      enabled,
      tableSource,
      currentAoa,
      boxSelectRef,
      onCancelBoxSelect,
      onDrop,
      updateDropHighlight,
      endSession,
    ],
  );

  const dragOverlay: ReactNode =
    dragging != null ? (
      <div
        className="table-row-drag-ghost"
        style={{ left: dragging.clientX + 12, top: dragging.clientY + 12 }}
        aria-hidden
      >
        {dragging.label}
      </div>
    ) : null;

  return {
    onRowPointerDown,
    dragOverlay,
    hoverTemplateId,
    rejectTemplateId,
    isRowTemplateDragging: dragging != null || rowTemplatePressActive,
  };
}
