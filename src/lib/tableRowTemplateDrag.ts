import { DRAG_THRESHOLD_PX } from "./tableBoxSelect.ts";
import { isSelectableTableDataRow } from "./tableRowId.ts";
import {
  cellStr,
  resolveItemIdColumnIndex,
  resolveTaskIdColumnIndex,
  type SheetMatrix,
} from "./xlsxHelpers.ts";

export type TemplateCardDropTarget = {
  templateId: string;
  source: "item" | "task";
};

export function resolveTemplateDragRows(
  selectedRows: Set<number>,
  anchorDataIdx: number,
  aoa: SheetMatrix,
  source: "item" | "task",
): Set<number> | null {
  if (selectedRows.size > 0) return new Set(selectedRows);
  if (!isSelectableTableDataRow(aoa, anchorDataIdx, source)) return null;
  return new Set([anchorDataIdx]);
}

export function shouldActivateRowTemplateDrag(
  dx: number,
  dy: number,
  overTemplateCard: boolean,
  threshold = DRAG_THRESHOLD_PX,
): boolean {
  if (overTemplateCard) return Math.hypot(dx, dy) >= threshold;
  return dx < -threshold && Math.abs(dx) > Math.abs(dy);
}

export function parseTemplateCardDropDataset(
  dataset: { templateId?: string; templateSource?: string },
): TemplateCardDropTarget | null {
  const templateId = dataset.templateId?.trim();
  const source = dataset.templateSource;
  if (!templateId || (source !== "item" && source !== "task")) return null;
  return { templateId, source };
}

export function findTemplateCardDropTarget(element: Element | null): TemplateCardDropTarget | null {
  if (!element) return null;
  const card = element.closest<HTMLElement>("[data-template-drop]");
  if (!card) return null;
  return parseTemplateCardDropDataset(card.dataset);
}

export function formatRowTemplateDragLabel(
  rows: Set<number>,
  source: "item" | "task",
  aoa: SheetMatrix,
): string {
  const n = rows.size;
  const kind = source === "item" ? "道具" : "任务";
  if (n === 0) return kind;
  if (n > 1) return `${n} 行${kind}`;
  const di = [...rows][0]!;
  const headersRow = aoa[0]?.map((h) => cellStr(h)) ?? [];
  const row = aoa[di + 1];
  if (!row) return `1 行${kind}`;
  const idIdx =
    source === "item" ? resolveItemIdColumnIndex(headersRow) : resolveTaskIdColumnIndex(headersRow);
  const id = idIdx >= 0 ? cellStr(row[idIdx]).trim() : "";
  return id ? `${kind} #${id}` : `1 行${kind}`;
}
