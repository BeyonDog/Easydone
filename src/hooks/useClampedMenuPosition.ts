import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { clampMenuPosition } from "../lib/clampMenuPosition.ts";

export function useClampedMenuPosition(
  anchor: { x: number; y: number } | null,
  menuRef: RefObject<HTMLDivElement | null>,
  /** 菜单内容变化时传入新 key，触发重新夹紧 */
  contentKey?: string | number | null,
): { x: number; y: number } | null {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const anchorX = anchor?.x ?? null;
  const anchorY = anchor?.y ?? null;

  const applyClamp = useCallback(() => {
    if (anchorX == null || anchorY == null) {
      setPosition(null);
      return;
    }
    const el = menuRef.current;
    if (!el) {
      setPosition({ x: anchorX, y: anchorY });
      return;
    }
    const rect = el.getBoundingClientRect();
    setPosition(
      clampMenuPosition(
        anchorX,
        anchorY,
        rect.width,
        rect.height,
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }, [anchorX, anchorY, menuRef]);

  useLayoutEffect(() => {
    if (anchorX == null || anchorY == null) {
      setPosition(null);
      return;
    }
    applyClamp();
  }, [anchorX, anchorY, applyClamp, contentKey]);

  useEffect(() => {
    if (anchorX == null || anchorY == null) return;
    const onReflow = () => applyClamp();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [anchorX, anchorY, applyClamp]);

  return position;
}
