import type { ReactNode } from "react";
import { qualityDotColor } from "./lib/qualityColors";

export type FilterOptionGridProps = {
  items: string[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  labelPrefix?: (key: string) => ReactNode;
  /** 品质桶：显示色点 */
  qualityDots?: boolean;
};

export function FilterOptionGrid({ items, selectedKeys, onToggle, labelPrefix, qualityDots }: FilterOptionGridProps) {
  return (
    <div className="filter-option-grid" role="group">
      {items.map((opt) => {
        const selected = selectedKeys.includes(opt);
        const prefix = labelPrefix?.(opt) ?? null;
        return (
          <label
            key={opt}
            data-filter-grid-item
            className={`filter-option-grid-item${selected ? " filter-option-grid-item--selected" : ""}`}
            title={opt}
          >
            <input type="checkbox" checked={selected} onChange={() => onToggle(opt)} />
            {qualityDots ? (
              <span className="filter-chip-quality-dot" style={{ background: qualityDotColor(opt) }} aria-hidden />
            ) : prefix ? (
              <span className="filter-option-grid-prefix">{prefix}</span>
            ) : null}
            <span className="filter-option-grid-text">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}
