export function clampScrollLeft(value: number, maxScrollLeft: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(maxScrollLeft) || maxScrollLeft <= 0) return 0;
  return Math.min(value, maxScrollLeft);
}

export function computeMaxScrollLeft(contentWidth: number, viewportWidth: number): number {
  if (!Number.isFinite(contentWidth) || !Number.isFinite(viewportWidth)) return 0;
  return Math.max(0, contentWidth - viewportWidth);
}

/** True when wheel should adjust horizontal scroll (trackpad horizontal or shift+wheel). */
export function isHorizontalDominantWheel(deltaX: number, deltaY: number, shiftKey = false): boolean {
  if (shiftKey && deltaY !== 0) return true;
  return Math.abs(deltaX) > Math.abs(deltaY);
}

export function resolveHorizontalWheelDelta(deltaX: number, deltaY: number, shiftKey = false): number {
  if (shiftKey && deltaY !== 0) return deltaY;
  return deltaX;
}
