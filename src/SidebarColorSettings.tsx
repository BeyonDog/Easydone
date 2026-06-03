import type { CSSProperties } from "react";
import {
  DEFAULT_SIDEBAR_ITEM_CARD_COLOR,
  DEFAULT_SIDEBAR_TASK_CARD_COLOR,
  normalizeSidebarCardColor,
} from "./lib/sidebarCardColor.ts";

export type SidebarColorSettingsProps = {
  itemHex: string;
  taskHex: string;
  onItemHexChange: (hex: string) => void;
  onTaskHexChange: (hex: string) => void;
};

const colorInputStyle: CSSProperties = {
  width: "3rem",
  height: "2rem",
  padding: 0,
  border: "1px solid var(--app-btn-border)",
  borderRadius: 6,
  cursor: "pointer",
  background: "transparent",
};

export function SidebarColorSettings({ itemHex, taskHex, onItemHexChange, onTaskHexChange }: SidebarColorSettingsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor="settings-sidebar-item-color">道具卡片颜色</label>
        <div className="btn-row" style={{ marginTop: 0, alignItems: "center" }}>
          <input
            id="settings-sidebar-item-color"
            type="color"
            value={itemHex}
            onChange={(e) => onItemHexChange(normalizeSidebarCardColor(e.target.value, DEFAULT_SIDEBAR_ITEM_CARD_COLOR))}
            style={colorInputStyle}
          />
          <span className="path" style={{ flex: 1, minWidth: 0 }}>
            {itemHex}
          </span>
          <button type="button" className="btn" onClick={() => onItemHexChange(DEFAULT_SIDEBAR_ITEM_CARD_COLOR)}>
            恢复默认
          </button>
        </div>
        <p className="help" style={{ marginTop: "0.35rem" }}>
          用于「全部道具」及未单独设色的道具模板。
        </p>
      </div>
      <div className="field">
        <label htmlFor="settings-sidebar-task-color">任务卡片颜色</label>
        <div className="btn-row" style={{ marginTop: 0, alignItems: "center" }}>
          <input
            id="settings-sidebar-task-color"
            type="color"
            value={taskHex}
            onChange={(e) => onTaskHexChange(normalizeSidebarCardColor(e.target.value, DEFAULT_SIDEBAR_TASK_CARD_COLOR))}
            style={colorInputStyle}
          />
          <span className="path" style={{ flex: 1, minWidth: 0 }}>
            {taskHex}
          </span>
          <button type="button" className="btn" onClick={() => onTaskHexChange(DEFAULT_SIDEBAR_TASK_CARD_COLOR)}>
            恢复默认
          </button>
        </div>
        <p className="help" style={{ marginTop: "0.35rem" }}>
          用于「全部任务」及未单独设色的任务模板。
        </p>
      </div>
    </>
  );
}
