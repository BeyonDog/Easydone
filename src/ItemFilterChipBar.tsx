import { useEffect, useRef, useState, type ReactNode } from "react";
import { ITEM_TYPE_REMARK_PRESET_EMOTE, ITEM_TYPE_REMARK_PRESET_FITTING_ROOM } from "./lib/xlsxHelpers";
import { FilterChipRowShell, PinnedMoreChipRow, QualityChipRow } from "./FilterChipBarShared";

export const SEASON_ITEM_CHIP_KEY = "赛季物品";

export const TYPE_REMARK_PINNED_KEYS = [
  ITEM_TYPE_REMARK_PRESET_EMOTE,
  ITEM_TYPE_REMARK_PRESET_FITTING_ROOM,
  "武器",
  "防具",
  "食材",
  "材料",
  "藏品",
  "空",
] as const;

export type ItemFilterChipBarProps = {
  customKeywordSelected: string[];
  customKeywordPinned: string[];
  customKeywordMore: string[];
  onToggleCustomKeyword: (key: string) => void;
  onReorderCustomKeywordPinned?: (orderedKeys: string[]) => void;
  onDemoteCustomKeyword?: (key: string) => void;
  onRemoveCustomKeyword?: (key: string) => void;
  onClearCustomKeywords: () => void;
  customKeywordClearDisabled: boolean;
  typeRemarkSelected: string[];
  qualitySelected: string[];
  typeRemarkPinned: string[];
  typeRemarkMore: string[];
  qualityBarKeys: string[];
  showEmotePin: boolean;
  showFittingRoomSkinPin: boolean;
  showTypeRemarkPins: boolean;
  showQualityRow: boolean;
  showSeasonRow: boolean;
  onToggleTypeRemark: (key: string) => void;
  onToggleQuality: (key: string) => void;
  onReorderTypeRemark?: (orderedKeys: string[]) => void;
  onReorderQuality?: (orderedKeys: string[]) => void;
  onDemoteTypeRemark?: (key: string) => void;
  onDemoteQuality?: (key: string) => void;
  onClearTypeRemark: () => void;
  onClearQuality: () => void;
  typeRemarkClearDisabled: boolean;
  qualityClearDisabled: boolean;
  typeRemarkLabelPrefix?: (key: string) => ReactNode;
};

export function ItemFilterChipBar({
  customKeywordSelected,
  customKeywordPinned,
  customKeywordMore,
  onToggleCustomKeyword,
  onReorderCustomKeywordPinned,
  onDemoteCustomKeyword,
  onRemoveCustomKeyword,
  onClearCustomKeywords,
  customKeywordClearDisabled,
  typeRemarkSelected,
  qualitySelected,
  typeRemarkPinned,
  typeRemarkMore,
  qualityBarKeys,
  showEmotePin,
  showFittingRoomSkinPin,
  showTypeRemarkPins,
  showQualityRow,
  showSeasonRow,
  onToggleTypeRemark,
  onToggleQuality,
  onReorderTypeRemark,
  onReorderQuality,
  onDemoteTypeRemark,
  onDemoteQuality,
  onClearTypeRemark,
  onClearQuality,
  typeRemarkClearDisabled,
  qualityClearDisabled,
  typeRemarkLabelPrefix,
}: ItemFilterChipBarProps) {
  const [customMoreOpen, setCustomMoreOpen] = useState(false);
  const [typeMoreOpen, setTypeMoreOpen] = useState(false);
  const customMoreRef = useRef<HTMLDivElement>(null);
  const typeMoreRef = useRef<HTMLDivElement>(null);
  const customMoreBtnRef = useRef<HTMLButtonElement>(null);
  const typeMoreBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!customMoreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (customMoreRef.current && !customMoreRef.current.contains(e.target as Node)) {
        setCustomMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [customMoreOpen]);

  useEffect(() => {
    if (!typeMoreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (typeMoreRef.current && !typeMoreRef.current.contains(e.target as Node)) {
        setTypeMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [typeMoreOpen]);

  const filterTypeRemarkKey = (key: string) => {
    if (key === SEASON_ITEM_CHIP_KEY) return showSeasonRow;
    if (key === ITEM_TYPE_REMARK_PRESET_EMOTE) return showEmotePin;
    if (key === ITEM_TYPE_REMARK_PRESET_FITTING_ROOM) return showFittingRoomSkinPin;
    return showTypeRemarkPins;
  };

  return (
    <div className="filter-chip-bar" role="region" aria-label="道具筛选">
      <FilterChipRowShell
        label="自定义筛选"
        onClear={onClearCustomKeywords}
        clearDisabled={customKeywordClearDisabled}
      >
        {customKeywordPinned.length === 0 && customKeywordMore.length === 0 ? (
          <span className="filter-chip-row-muted">在筛选弹窗输入关键字并点「保存到筛选项」</span>
        ) : (
          <PinnedMoreChipRow
            barKeys={customKeywordPinned}
            moreKeys={customKeywordMore}
            selectedKeys={customKeywordSelected}
            onToggle={onToggleCustomKeyword}
            onReorderBar={onReorderCustomKeywordPinned}
            onDemoteKey={onDemoteCustomKeyword}
            moreOpen={customMoreOpen}
            setMoreOpen={setCustomMoreOpen}
            moreRef={customMoreRef}
            moreButtonRef={customMoreBtnRef}
            moreChipShowRemove
            onRemoveFromMore={onRemoveCustomKeyword}
            barClassName="filter-chip-row-chips-inner"
          />
        )}
      </FilterChipRowShell>

      <FilterChipRowShell
        label="类型"
        onClear={onClearTypeRemark}
        clearDisabled={typeRemarkClearDisabled}
      >
        {!showEmotePin && !showTypeRemarkPins && !showSeasonRow ? (
          <span className="filter-chip-row-muted">无可用列</span>
        ) : (
          <PinnedMoreChipRow
            barKeys={typeRemarkPinned}
            moreKeys={typeRemarkMore}
            selectedKeys={typeRemarkSelected}
            onToggle={onToggleTypeRemark}
            onReorderBar={onReorderTypeRemark}
            onDemoteKey={onDemoteTypeRemark}
            labelPrefix={typeRemarkLabelPrefix}
            filterVisibleKey={filterTypeRemarkKey}
            moreOpen={typeMoreOpen}
            setMoreOpen={setTypeMoreOpen}
            moreRef={typeMoreRef}
            moreButtonRef={typeMoreBtnRef}
          />
        )}
      </FilterChipRowShell>

      <FilterChipRowShell
        label="物品品质"
        onClear={onClearQuality}
        clearDisabled={qualityClearDisabled}
      >
        {showQualityRow ? (
          <div className="filter-chip-row-chips">
            <QualityChipRow
              items={qualityBarKeys}
              selectedKeys={qualitySelected}
              onToggle={onToggleQuality}
              onReorder={onReorderQuality}
              onDemoteKey={onDemoteQuality}
            />
          </div>
        ) : (
          <span className="filter-chip-row-muted">当前表无「物品品质」列</span>
        )}
      </FilterChipRowShell>
    </div>
  );
}
