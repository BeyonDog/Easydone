import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { clampMenuPosition } from "../lib/clampMenuPosition.ts";

export function useClampedMenuPosition(
  anchor: { x: number; y: number } | null,
  menuRef: RefObject<HTMLDivElement | null>,
  /** 菜单内容变化时传入新 key，触发重新夹紧 */
  contentKey?: string | number | null,
): { x: number; y: number } | null {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const applyClamp = useCallback(() => {
    if (!anchor) {
      setPosition(null);
      return;
    }
    const el = menuRef.current;
    if (!el) {
      setPosition({ x: anchor.x, y: anchor.y });
      return;
    }
    const rect = el.getBoundingClientRect();
    setPosition(
      clampMenuPosition(
        anchor.x,
        anchor.y,
        rect.width,
        rect.height,
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }, [anchor, menuRef]);

  useLayoutEffect(() => {
    if (!anchor) {
      setPosition(null);
      return;
    }
    applyClamp();
  }, [anchor, applyClamp, contentKey]);

  useEffect(() => {
    if (!anchor) return;
    const onReflow = () => applyClamp();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [anchor, applyClamp]);

  return position;
}
