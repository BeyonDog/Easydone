const DEFAULT_PADDING = 8;

export type MenuPosition = { x: number; y: number };

export function menuPositionsEqual(
  a: MenuPosition | null | undefined,
  b: MenuPosition | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.x === b.x && a.y === b.y;
}

export function clampMenuPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
  viewportW: number,
  viewportH: number,
  padding: number = DEFAULT_PADDING,
): { x: number; y: number } {
  const pad = Math.max(0, padding);
  const maxW = Math.max(0, viewportW - pad * 2);
  const maxH = Math.max(0, viewportH - pad * 2);
  const w = Math.min(Math.max(0, menuWidth), maxW);
  const h = Math.min(Math.max(0, menuHeight), maxH);

  let left = x;
  let top = y;
  if (left + w > viewportW - pad) left = viewportW - w - pad;
  if (top + h > viewportH - pad) top = viewportH - h - pad;
  if (left < pad) left = pad;
  if (top < pad) top = pad;
  return { x: left, y: top };
}
