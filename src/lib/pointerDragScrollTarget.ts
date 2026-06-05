export const POINTER_DRAG_SCROLL_IGNORE_SELECTOR =
  "button,input,select,textarea,a,[role='button'],.sidebar-card-drag-handle,.sidebar-card-delete-badge";

export function isPointerDragScrollIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(POINTER_DRAG_SCROLL_IGNORE_SELECTOR));
}
