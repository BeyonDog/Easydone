import React, { memo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ItemValueSlider } from "./ItemValueSlider.tsx";
import {
  TABLE_ROW_HEIGHT_ESTIMATE,
  estimateDataTableRowHeight,
} from "./lib/dataTableRowHeight.ts";
import { ITEM_WEAR_MAX, ITEM_WEAR_MIN } from "./lib/itemWearValue.ts";
import { cellStr } from "./lib/xlsxHelpers";
import { formatItemIdWithTypeLabel, type ItemTypeLookupIndex } from "./lib/itemTypeLookup.ts";

export { TABLE_ROW_HEIGHT_ESTIMATE } from "./lib/dataTableRowHeight.ts";

export type DisplayBodyRow = { row: unknown[]; dataIdx: number };

export type DataTableBodyProps = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  rows: DisplayBodyRow[];
  visibleColIndices: number[];
  isItemTableView: boolean;
  selectedRows: Set<number>;
  itemLineQty: Record<number, number>;
  defaultWearValue: number;
  itemLineWear: Record<number, number>;
  wearRowOverride: Set<number>;
  itemLineDurability: Record<number, number>;
  durabilityRowOverride: Set<number>;
  rowSupportsWear: (row: unknown[]) => boolean;
  rowSupportsDurability: (row: unknown[]) => boolean;
  rowDurabilityMax: (row: unknown[]) => number;
  freezeVisIdx: number;
  stickyCellLeftPx: number[];
  onToggleRow: (dataIdx: number) => void;
  onBumpItemLineQty: (dataIdx: number, sign: 1 | -1) => void;
  onSetItemLineQty: (dataIdx: number, raw: string) => void;
  onSetItemLineWearValue: (dataIdx: number, value: number) => void;
  onSetItemLineDurabilityValue: (dataIdx: number, value: number) => void;
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
  wear: number;
  durability: number;
  durabilityMax: number;
  showWearInput: boolean;
  showDurabilityInput: boolean;
  freezeVisIdx: number;
  stickyCellLeftPx: number[];
  onToggleRow: (dataIdx: number) => void;
  onBumpItemLineQty: (dataIdx: number, sign: 1 | -1) => void;
  onSetItemLineQty: (dataIdx: number, raw: string) => void;
  onSetItemLineWearValue: (dataIdx: number, value: number) => void;
  onSetItemLineDurabilityValue: (dataIdx: number, value: number) => void;
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
  wear,
  durability,
  durabilityMax,
  showWearInput,
  showDurabilityInput,
  freezeVisIdx,
  stickyCellLeftPx,
  onToggleRow,
  onBumpItemLineQty,
  onSetItemLineQty,
  onSetItemLineWearValue,
  onSetItemLineDurabilityValue,
  showItemTypeInTable,
  itemIdColIndex,
  itemTypeColIndex,
  itemSubTypeColIndex,
  itemTypeLookupIndex,
  rowTemplateDragEnabled,
  onRowPointerDown,
}: DataTableRowProps) {
  const showValueInput = showWearInput || showDurabilityInput;

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
        <div
          className={`row-check-inner${showValueInput && isSelected ? " row-check-inner--wear" : ""}`}
        >
          <input
            type="checkbox"
            className="row-check-checkbox"
            checked={isSelected}
            onChange={() => onToggleRow(dataIdx)}
          />
          {isItemTableView ? (
            <>
              <QtyStepper
                dataIdx={dataIdx}
                qty={qty}
                isSelected={isSelected}
                showValueInput={showValueInput}
                onBumpItemLineQty={onBumpItemLineQty}
                onSetItemLineQty={onSetItemLineQty}
              />
              {showWearInput && isSelected ? (
                <ItemValueSlider
                  value={wear}
                  min={ITEM_WEAR_MIN}
                  max={ITEM_WEAR_MAX}
                  compact
                  label="耐"
                  disabled={!isSelected}
                  rangeHint="0–100"
                  onChange={(n) => onSetItemLineWearValue(dataIdx, n)}
                />
              ) : null}
              {showDurabilityInput && isSelected ? (
                <ItemValueSlider
                  value={durability}
                  min={0}
                  max={durabilityMax}
                  compact
                  label="耐"
                  disabled={!isSelected}
                  rangeHint={`0–${durabilityMax}`}
                  onChange={(n) => onSetItemLineDurabilityValue(dataIdx, n)}
                />
              ) : null}
            </>
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

function QtyStepper({
  dataIdx,
  qty,
  isSelected,
  showValueInput,
  onBumpItemLineQty,
  onSetItemLineQty,
}: {
  dataIdx: number;
  qty: number;
  isSelected: boolean;
  showValueInput: boolean;
  onBumpItemLineQty: (dataIdx: number, sign: 1 | -1) => void;
  onSetItemLineQty: (dataIdx: number, raw: string) => void;
}) {
  const [qtyDraft, setQtyDraft] = React.useState<string | null>(null);

  const commitQtyDraft = (raw: string) => {
    onSetItemLineQty(dataIdx, raw);
    setQtyDraft(null);
  };

  return (
    <div
      className={`row-check-stepper row-check-qty${showValueInput ? "" : " row-check-stepper--no-label"}${isSelected ? "" : " row-check-qty--hidden"}`}
      aria-hidden={!isSelected}
    >
      {showValueInput ? <span className="row-check-stepper-label" aria-hidden="true" /> : null}
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
  );
}

export function DataTableBody({
  scrollRef,
  rows,
  visibleColIndices,
  isItemTableView,
  selectedRows,
  itemLineQty,
  defaultWearValue,
  itemLineWear,
  wearRowOverride,
  itemLineDurability,
  durabilityRowOverride,
  rowSupportsWear,
  rowSupportsDurability,
  rowDurabilityMax,
  freezeVisIdx,
  stickyCellLeftPx,
  onToggleRow,
  onBumpItemLineQty,
  onSetItemLineQty,
  onSetItemLineWearValue,
  onSetItemLineDurabilityValue,
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
    estimateSize: (index) => {
      const entry = rows[index];
      if (!entry) return TABLE_ROW_HEIGHT_ESTIMATE;
      const { row, dataIdx } = entry;
      const supportsValueInput =
        isItemTableView && (rowSupportsWear(row) || rowSupportsDurability(row));
      return estimateDataTableRowHeight({
        isItemTableView,
        isSelected: selectedRows.has(dataIdx),
        supportsValueInput,
      });
    },
    overscan: 12,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [isItemTableView, selectedRows, rows, rowVirtualizer]);

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
        const isSelected = selectedRows.has(dataIdx);
        const showWearInput = isItemTableView && rowSupportsWear(row);
        const showDurabilityInput = isItemTableView && rowSupportsDurability(row);
        const durMax = showDurabilityInput ? rowDurabilityMax(row) : 0;
        const wear = wearRowOverride.has(dataIdx)
          ? itemLineWear[dataIdx] ?? defaultWearValue
          : defaultWearValue;
        const durability = durabilityRowOverride.has(dataIdx)
          ? itemLineDurability[dataIdx] ?? durMax
          : durMax;
        return (
          <DataTableRow
            key={dataIdx}
            row={row}
            dataIdx={dataIdx}
            visualIdx={virtualRow.index}
            visibleColIndices={visibleColIndices}
            isItemTableView={isItemTableView}
            isSelected={isSelected}
            qty={itemLineQty[dataIdx] ?? 1}
            wear={wear}
            durability={durability}
            durabilityMax={durMax}
            showWearInput={showWearInput}
            showDurabilityInput={showDurabilityInput}
            freezeVisIdx={freezeVisIdx}
            stickyCellLeftPx={stickyCellLeftPx}
            onToggleRow={onToggleRow}
            onBumpItemLineQty={onBumpItemLineQty}
            onSetItemLineQty={onSetItemLineQty}
            onSetItemLineWearValue={onSetItemLineWearValue}
            onSetItemLineDurabilityValue={onSetItemLineDurabilityValue}
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
