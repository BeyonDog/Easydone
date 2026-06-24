export const DEFAULT_SIDEBAR_GALLERY_SPLIT_PX = 520;
export const MIN_GALLERY_SPLIT_PX = 280;
export const MIN_MAIN_SPLIT_PX = 360;

export function clampSidebarGallerySplitWidth(px: number, bodyWidth: number): number {
  const safeBody = Math.max(0, bodyWidth);
  const maxGallery = Math.max(MIN_GALLERY_SPLIT_PX, safeBody - MIN_MAIN_SPLIT_PX);
  if (maxGallery <= MIN_GALLERY_SPLIT_PX) {
    return MIN_GALLERY_SPLIT_PX;
  }
  return Math.min(maxGallery, Math.max(MIN_GALLERY_SPLIT_PX, Math.round(px)));
}

export function resolveSidebarGallerySplitWidth(
  saved: number | null | undefined,
  bodyWidth: number,
): number {
  const base =
    typeof saved === "number" && Number.isFinite(saved) && saved > 0
      ? saved
      : DEFAULT_SIDEBAR_GALLERY_SPLIT_PX;
  return clampSidebarGallerySplitWidth(base, bodyWidth);
}
