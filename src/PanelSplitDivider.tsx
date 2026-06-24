import {
  clampSidebarGallerySplitWidth,
  MIN_GALLERY_SPLIT_PX,
  MIN_MAIN_SPLIT_PX,
} from "./lib/sidebarGallerySplit.ts";
import { useHorizontalSplitResize } from "./hooks/useHorizontalSplitResize.ts";

export type PanelSplitDividerProps = {
  widthPx: number;
  onWidthChange: (nextWidthPx: number) => void;
  getContainerWidth: () => number;
  onResizeEnd?: (finalWidthPx: number) => void;
};

export function PanelSplitDivider({
  widthPx,
  onWidthChange,
  getContainerWidth,
  onResizeEnd,
}: PanelSplitDividerProps) {
  const containerWidth = getContainerWidth();
  const maxWidth = Math.max(MIN_GALLERY_SPLIT_PX, containerWidth - MIN_MAIN_SPLIT_PX);

  const { dragging, onPointerDown } = useHorizontalSplitResize({
    widthPx,
    onWidthChange,
    getContainerWidth,
    clampWidth: clampSidebarGallerySplitWidth,
    onResizeEnd,
  });

  return (
    <div
      className={`panel-split-divider${dragging ? " panel-split-divider--dragging" : ""}`}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={widthPx}
      aria-valuemin={MIN_GALLERY_SPLIT_PX}
      aria-valuemax={maxWidth}
      aria-label="调整左右分栏宽度"
      onPointerDown={onPointerDown}
    />
  );
}
