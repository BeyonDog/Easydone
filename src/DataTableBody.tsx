import React, { memo, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cellStr } from "./lib/xlsxHelpers";
import { formatItemIdWithTypeLabel, type ItemTypeLookupIndex } from "./lib/itemTypeLookup.ts";

export const TABLE_ROW_HEIGHT_ESTIMATE = 30;

export type DisplayBodyRow = { row: unknown[]; dataIdx: number };

export type DataTableBodyProps = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  rows: DisplayBodyRow[];
  visibleColIndices: number[];
  isItemTableView: boolean;
  selectedRows: Set<number>;
  itemLineQty: Record<number, number>;
  freezeVisIdx: number;
  stickyCellLeftPx: number[];
  onToggleRow: (dataIdx: number) => void;
  onBumpItemLineQty: (dataIdx: number, sign: 1 | -1) => void;
  onSetItemLineQty: (dataIdx: number, raw: string) => void;
  showItemTypeInTable: boolean;
  itemIdColIndex: number;
  itemTypeColIndex: number;
  itemSubTypeColIndex: number;
  itemTypeLookupIndex: ItemTypeLookupIndex;
  rowTemplateDragEnabled?: boolean;
  onRowPointerDown?: (dataIdx: number, e: React.PointerEvent<HTMLTableRowElement>) => void;
};

type DataTableRowProps = {
  row: unknown[];
  dataIdx: number;
  visualIdx: number;
  visibleColIndices: number[];
  isItemTableView: boolean;
  isSelected: boolean;
  qty: number;
  freezeVisIdx: number;
  stickyCellLeftPx: number[];
  onToggleRow: (dataIdx: number) => void;
  onBumpItemLineQty: (dataIdx: number, sign: 1 | -1) => void;
  onSetItemLineQty: (dataIdx: number, raw: string) => void;
  showItemTypeInTable: boolean;
  itemIdColIndex: number;
  itemTypeColIndex: number;
  itemSubTypeColIndex: number;
  itemTypeLookupIndex: ItemTypeLookupIndex;
  rowTemplateDragEnabled?: boolean;
  onRowPointerDown?: (dataIdx: number, e: React.PointerEvent<HTMLTableRowElement>) => void;
};

const DataTableRow = memo(function DataTableRow({
  row,
  dataIdx,
  visualIdx,
  visibleColIndices,
  isItemTableView,
  isSelected,
  qty,
  freezeVisIdx,
  stickyCellLeftPx,
  onToggleRow,
  onBumpItemLineQty,
  onSetItemLineQty,
  showItemTypeInTable,
  itemIdColIndex,
  itemTypeColIndex,
  itemSubTypeColIndex,
  itemTypeLookupIndex,
  rowTemplateDragEnabled,
  onRowPointerDown,
}: DataTableRowProps) {
  const [qtyDraft, setQtyDraft] = useState<string | null>(null);

  const commitQtyDraft = (raw: string) => {
    onSetItemLineQty(dataIdx, raw);
    setQtyDraft(null);
  };

  return (
    <tr
      data-data-idx={dataIdx}
      className={rowTemplateDragEnabled ? "table-row--template-drag" : undefined}
      onPointerDown={
        rowTemplateDragEnabled && onRowPointerDown
          ? (e) => onRowPointerDown(dataIdx, e)
          : undefined
      }
    >
      <td className="row-check">
        <div className="row-check-inner">
          <input type="checkbox" checked={isSelected} onChange={() => onToggleRow(dataIdx)} />
          {isItemTableView ? (
            <div className={`row-check-qty${isSelected ? "" : " row-check-qty--hidden"}`} aria-hidden={!isSelected}>
              <button
                type="button"
                className="item-qty-btn"
                aria-label="减少数量"
                tabIndex={isSelected ? 0 : -1}
                disabled={!isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  onBumpItemLineQty(dataIdx, -1);
                }}
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                className="item-qty-input"
                value={qtyDraft !== null ? qtyDraft : String(qty)}
                disabled={!isSelected}
                tabIndex={isSelected ? 0 : -1}
                aria-label="数量"
                onFocus={(e) => {
                  setQtyDraft(String(qty));
                  e.currentTarget.select();
                }}
                onChange={(e) => {
                  setQtyDraft(e.target.value.replace(/\D/g, ""));
                }}
                onBlur={(e) => {
                  commitQtyDraft(qtyDraft ?? e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                className="item-qty-btn"
                aria-label="增加数量"
                tabIndex={isSelected ? 0 : -1}
                disabled={!isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  onBumpItemLineQty(dataIdx, 1);
                }}
              >
                +
              </button>
            </div>
          ) : null}
        </div>
      </td>
      <td
        className="row-num"
        style={
          freezeVisIdx >= 0 && stickyCellLeftPx.length > 1
            ? { left: stickyCellLeftPx[1] }
            : undefined
        }
      >
        {visualIdx + 1}
      </td>
      {visibleColIndices.map((ci, visIdx) => {
        const cellIdx = 2 + visIdx;
        const inFreeze = freezeVisIdx >= 0 && visIdx <= freezeVisIdx && stickyCellLeftPx.length > cellIdx;
        const leftPx = inFreeze ? stickyCellLeftPx[cellIdx]! : undefined;
        const edge = inFreeze && visIdx === freezeVisIdx;
        const freezeCn = inFreeze ? `col-freeze${edge ? " col-freeze-edge" : ""}` : undefined;
        const rawText = cellStr(row[ci]);
        const displayText =
          showItemTypeInTable && isItemTableView && ci === itemIdColIndex
            ? formatItemIdWithTypeLabel(
                rawText,
                itemTypeColIndex >= 0 ? row[itemTypeColIndex] : undefined,
                itemSubTypeColIndex >= 0 ? row[itemSubTypeColIndex] : undefined,
                itemTypeLookupIndex,
              )
            : rawText;
        return (
          <td key={ci} className={freezeCn} style={leftPx !== undefined ? { left: leftPx } : undefined} title={displayText}>
            {displayText}
          </td>
        );
      })}
    </tr>
  );
});

export function DataTableBody({
  scrollRef,
  rows,
  visibleColIndices,
  isItemTableView,
  selectedRows,
  itemLineQty,
  freezeVisIdx,
  stickyCellLeftPx,
  onToggleRow,
  onBumpItemLineQty,
  onSetItemLineQty,
  showItemTypeInTable,
  itemIdColIndex,
  itemTypeColIndex,
  itemSubTypeColIndex,
  itemTypeLookupIndex,
  rowTemplateDragEnabled,
  onRowPointerDown,
}: DataTableBodyProps) {
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => TABLE_ROW_HEIGHT_ESTIMATE,
    overscan: 12,
  });

  useEffect(() => {
    if (!isItemTableView) return;
    rowVirtualizer.measure();
  }, [isItemTableView, selectedRows, rowVirtualizer]);

  const virtualRows = rowVirtualizer.getVirtualItems();
  const colSpan = 2 + visibleColIndices.length;
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end : 0;

  return (
    <tbody>
      {paddingTop > 0 ? (
        <tr aria-hidden className="virtual-spacer">
          <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: "none" }} />
        </tr>
      ) : null}
      {virtualRows.map((virtualRow) => {
        const { row, dataIdx } = rows[virtualRow.index]!;
        return (
          <DataTableRow
            key={dataIdx}
            row={row}
            dataIdx={dataIdx}
            visualIdx={virtualRow.index}
            visibleColIndices={visibleColIndices}
            isItemTableView={isItemTableView}
            isSelected={selectedRows.has(dataIdx)}
            qty={itemLineQty[dataIdx] ?? 1}
            freezeVisIdx={freezeVisIdx}
            stickyCellLeftPx={stickyCellLeftPx}
            onToggleRow={onToggleRow}
            onBumpItemLineQty={onBumpItemLineQty}
            onSetItemLineQty={onSetItemLineQty}
            showItemTypeInTable={showItemTypeInTable}
            itemIdColIndex={itemIdColIndex}
            itemTypeColIndex={itemTypeColIndex}
            itemSubTypeColIndex={itemSubTypeColIndex}
            itemTypeLookupIndex={itemTypeLookupIndex}
            rowTemplateDragEnabled={rowTemplateDragEnabled}
            onRowPointerDown={onRowPointerDown}
          />
        );
      })}
      {paddingBottom > 0 ? (
        <tr aria-hidden className="virtual-spacer">
          <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: "none" }} />
        </tr>
      ) : null}
    </tbody>
  );
}
