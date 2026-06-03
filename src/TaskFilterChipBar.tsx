import { useEffect, useRef, useState } from "react";
import { FilterChipRowShell, PinnedMoreChipRow } from "./FilterChipBarShared";

export type TaskFilterChipBarProps = {
  onRestoreDefaultTaskCsv?: () => void;
  restoreDefaultBusy?: boolean;
  customKeywordSelected: string[];
  customKeywordPinned: string[];
  customKeywordMore: string[];
  onToggleCustomKeyword: (key: string) => void;
  onReorderCustomKeywordPinned?: (orderedKeys: string[]) => void;
  onDemoteCustomKeyword?: (key: string) => void;
  onRemoveCustomKeyword?: (key: string) => void;
  onClearCustomKeywords: () => void;
  customKeywordClearDisabled: boolean;
  taskTypeSelected: string[];
  chainSelected: string[];
  taskTypePinned: string[];
  taskTypeMore: string[];
  chainPinned: string[];
  chainMore: string[];
  showTaskTypeRow: boolean;
  showChainRow: boolean;
  onToggleTaskType: (key: string) => void;
  onToggleChain: (key: string) => void;
  onReorderTaskTypePinned?: (orderedKeys: string[]) => void;
  onReorderChainPinned?: (orderedKeys: string[]) => void;
  onDemoteTaskType?: (key: string) => void;
  onDemoteChain?: (key: string) => void;
  onClearTaskType: () => void;
  onClearChain: () => void;
  taskTypeClearDisabled: boolean;
  chainClearDisabled: boolean;
};

export function TaskFilterChipBar({
  onRestoreDefaultTaskCsv,
  restoreDefaultBusy = false,
  customKeywordSelected,
  customKeywordPinned,
  customKeywordMore,
  onToggleCustomKeyword,
  onReorderCustomKeywordPinned,
  onDemoteCustomKeyword,
  onRemoveCustomKeyword,
  onClearCustomKeywords,
  customKeywordClearDisabled,
  taskTypeSelected,
  chainSelected,
  taskTypePinned,
  taskTypeMore,
  chainPinned,
  chainMore,
  showTaskTypeRow,
  showChainRow,
  onToggleTaskType,
  onToggleChain,
  onReorderTaskTypePinned,
  onReorderChainPinned,
  onDemoteTaskType,
  onDemoteChain,
  onClearTaskType,
  onClearChain,
  taskTypeClearDisabled,
  chainClearDisabled,
}: TaskFilterChipBarProps) {
  const [customMoreOpen, setCustomMoreOpen] = useState(false);
  const [taskTypeMoreOpen, setTaskTypeMoreOpen] = useState(false);
  const [chainMoreOpen, setChainMoreOpen] = useState(false);
  const customMoreRef = useRef<HTMLDivElement>(null);
  const taskTypeMoreRef = useRef<HTMLDivElement>(null);
  const chainMoreRef = useRef<HTMLDivElement>(null);
  const customMoreBtnRef = useRef<HTMLButtonElement>(null);
  const taskTypeMoreBtnRef = useRef<HTMLButtonElement>(null);
  const chainMoreBtnRef = useRef<HTMLButtonElement>(null);

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
    if (!taskTypeMoreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (taskTypeMoreRef.current && !taskTypeMoreRef.current.contains(e.target as Node)) {
        setTaskTypeMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [taskTypeMoreOpen]);

  useEffect(() => {
    if (!chainMoreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (chainMoreRef.current && !chainMoreRef.current.contains(e.target as Node)) {
        setChainMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [chainMoreOpen]);

  return (
    <div className="filter-chip-bar" role="region" aria-label="任务筛选">
      {onRestoreDefaultTaskCsv ? (
        <div className="filter-chip-row filter-chip-row--gtop-restore">
          <span className="filter-chip-row-label">GTOP</span>
          <div className="filter-chip-row-chips">
            <button
              type="button"
              className="btn btn-tiny filter-chip-restore-btn"
              disabled={restoreDefaultBusy}
              onClick={() => onRestoreDefaultTaskCsv()}
            >
              {restoreDefaultBusy ? "上传中…" : "恢复默认 task.csv"}
            </button>
          </div>
        </div>
      ) : null}
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
        label="任务类型"
        onClear={onClearTaskType}
        clearDisabled={taskTypeClearDisabled}
      >
        {showTaskTypeRow ? (
          <PinnedMoreChipRow
            barKeys={taskTypePinned}
            moreKeys={taskTypeMore}
            selectedKeys={taskTypeSelected}
            onToggle={onToggleTaskType}
            onReorderBar={onReorderTaskTypePinned}
            onDemoteKey={onDemoteTaskType}
            moreOpen={taskTypeMoreOpen}
            setMoreOpen={setTaskTypeMoreOpen}
            moreRef={taskTypeMoreRef}
            moreButtonRef={taskTypeMoreBtnRef}
          />
        ) : (
          <span className="filter-chip-row-muted">无可用列</span>
        )}
      </FilterChipRowShell>

      <FilterChipRowShell
        label="任务链"
        onClear={onClearChain}
        clearDisabled={chainClearDisabled}
      >
        {showChainRow ? (
          <PinnedMoreChipRow
            barKeys={chainPinned}
            moreKeys={chainMore}
            selectedKeys={chainSelected}
            onToggle={onToggleChain}
            onReorderBar={onReorderChainPinned}
            onDemoteKey={onDemoteChain}
            moreOpen={chainMoreOpen}
            setMoreOpen={setChainMoreOpen}
            moreRef={chainMoreRef}
            moreButtonRef={chainMoreBtnRef}
          />
        ) : (
          <span className="filter-chip-row-muted">无可用列</span>
        )}
      </FilterChipRowShell>
    </div>
  );
}
