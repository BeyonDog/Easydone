import { useEffect, useMemo, useRef, useState } from "react";
import { FilterOptionGrid } from "./FilterOptionGrid.tsx";
import { useClampedMenuPosition } from "./hooks/useClampedMenuPosition.ts";

const COLUMN_FILTER_RENDER_CAP = 300;

export type ColumnFilterPopoverProps = {
  anchor: { x: number; y: number };
  columnHeader: string;
  uniqueValues: string[];
  initialSelectedKeys: string[];
  onApply: (selectedKeys: string[]) => void;
  onClearColumn: () => void;
  onClose: () => void;
};

export function ColumnFilterPopover({
  anchor,
  columnHeader,
  uniqueValues,
  initialSelectedKeys,
  onApply,
  onClearColumn,
  onClose,
}: ColumnFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => [...initialSelectedKeys]);
  const title = columnHeader.trim() || "未命名列";
  const pos = useClampedMenuPosition(anchor, popoverRef, `${title}-${uniqueValues.length}-${query}`);

  useEffect(() => {
    setSelectedKeys([...initialSelectedKeys]);
    setQuery("");
  }, [initialSelectedKeys, columnHeader]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filteredValues = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return uniqueValues;
    return uniqueValues.filter((v) => v.toLowerCase().includes(q));
  }, [uniqueValues, query]);

  const hasSearchQuery = query.trim().length > 0;
  const displayValues = useMemo(() => {
    if (hasSearchQuery || filteredValues.length <= COLUMN_FILTER_RENDER_CAP) return filteredValues;
    return filteredValues.slice(0, COLUMN_FILTER_RENDER_CAP);
  }, [filteredValues, hasSearchQuery]);

  const showRenderCapHint =
    !hasSearchQuery && uniqueValues.length > COLUMN_FILTER_RENDER_CAP;

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return [...s];
    });
  };

  const selectAllVisible = () => {
    setSelectedKeys((prev) => {
      const s = new Set(prev);
      for (const v of displayValues) s.add(v);
      return [...s];
    });
  };

  const clearSelection = () => setSelectedKeys([]);

  return (
    <div className="column-filter-back" onMouseDown={onClose}>
      <div
        ref={popoverRef}
        className="column-filter-popover"
        style={{ left: (pos ?? anchor).x, top: (pos ?? anchor).y }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`筛选 ${title}`}
      >
        <div className="column-filter-head">
          <h3 className="column-filter-title">筛选 — {title}</h3>
          <p className="column-filter-help">勾选要保留的取值；同列多选为或</p>
        </div>
        <input
          type="search"
          className="filter-quick-search column-filter-search"
          placeholder="搜索取值…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="column-filter-grid-wrap">
          {showRenderCapHint ? (
            <p className="help muted column-filter-cap-hint">
              共 {uniqueValues.length} 项，请输入搜索缩小范围（当前显示前 {COLUMN_FILTER_RENDER_CAP} 项）
            </p>
          ) : null}
          {displayValues.length > 0 ? (
            <FilterOptionGrid items={displayValues} selectedKeys={selectedKeys} onToggle={toggleKey} />
          ) : (
            <p className="help muted column-filter-empty">无匹配取值</p>
          )}
        </div>
        <div className="column-filter-actions">
          <button type="button" className="btn btn-tiny" onClick={selectAllVisible} disabled={displayValues.length === 0}>
            全选
          </button>
          <button type="button" className="btn btn-tiny" onClick={clearSelection}>
            清空选择
          </button>
          <button type="button" className="btn btn-tiny" onClick={onClearColumn}>
            清除此列筛选
          </button>
          <span className="column-filter-actions-spacer" />
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn primary" onClick={() => onApply(selectedKeys)}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
