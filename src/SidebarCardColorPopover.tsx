import { useEffect, useRef, useState } from "react";
import { normalizeSidebarCardColor } from "./lib/sidebarCardColor.ts";

export type SidebarCardColorPopoverProps = {
  x: number;
  y: number;
  initialHex: string;
  presetItemHex: string;
  presetTaskHex: string;
  onApply: (hex: string) => void;
  onResetDefault: () => void;
  onClose: () => void;
};

export function SidebarCardColorPopover({
  x,
  y,
  initialHex,
  presetItemHex,
  presetTaskHex,
  onApply,
  onResetDefault,
  onClose,
}: SidebarCardColorPopoverProps) {
  const [draft, setDraft] = useState(initialHex);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(initialHex);
  }, [initialHex]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("contextmenu", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("contextmenu", onDoc);
    };
  }, [onClose]);

  const apply = (hex: string) => {
    const normalized = normalizeSidebarCardColor(hex, initialHex);
    onApply(normalized);
    onClose();
  };

  return (
    <div
      className="sidebar-card-color-popover"
      style={{ left: x, top: y }}
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="sidebar-card-color-popover-title">设置卡片颜色</p>
      <div className="sidebar-card-color-presets">
        <button
          type="button"
          className="sidebar-card-color-swatch"
          style={{ background: presetItemHex }}
          title="道具红"
          onClick={() => apply(presetItemHex)}
        />
        <button
          type="button"
          className="sidebar-card-color-swatch"
          style={{ background: presetTaskHex }}
          title="任务蓝"
          onClick={() => apply(presetTaskHex)}
        />
        <button
          type="button"
          className="sidebar-card-color-swatch sidebar-card-color-swatch--default"
          title="恢复默认"
          onClick={() => {
            onResetDefault();
            onClose();
          }}
        />
      </div>
      <div className="sidebar-card-color-picker-row">
        <input
          type="color"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="选择颜色"
        />
        <span className="sidebar-card-color-hex">{draft}</span>
        <button type="button" className="btn btn-tiny" onClick={() => apply(draft)}>
          确定
        </button>
      </div>
    </div>
  );
}
