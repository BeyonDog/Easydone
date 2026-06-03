import type { ReactNode } from "react";

const ICON_CLASS = "type-remark-icon";

function IconWrap({ children, title }: { children: ReactNode; title: string }) {
  return (
    <span className={ICON_CLASS} title={title} aria-hidden>
      {children}
    </span>
  );
}

/** 防具 */
function IconArmor() {
  return (
    <IconWrap title="防具">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M12 3 20 6v6c0 5-4 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="M9 12h6" />
      </svg>
    </IconWrap>
  );
}

/** 食材 */
function IconFood() {
  return (
    <IconWrap title="食材">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 3c4 4 6 7 6 10a6 6 0 1 1-12 0c0-3 2-6 6-10Z" />
        <path d="M12 10v4" />
      </svg>
    </IconWrap>
  );
}

/** 材料 */
function IconMaterial() {
  return (
    <IconWrap title="材料">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <rect x="4" y="8" width="16" height="10" rx="2" />
        <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </IconWrap>
  );
}

/** 藏品 / 宝藏 */
function IconTreasure() {
  return (
    <IconWrap title="藏品">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M12 3 19 8v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8l7-5Z" />
        <path d="M12 11v6M9 14h6" />
      </svg>
    </IconWrap>
  );
}

const PREFIX_MAP: Record<string, () => ReactNode> = {
  防具: IconArmor,
  食材: IconFood,
  材料: IconMaterial,
  藏品: IconTreasure,
  宝藏: IconTreasure,
};

/** 类型备注展示键对应前缀 icon；无映射返回 null */
export function typeRemarkLabelPrefix(key: string): ReactNode | null {
  const fn = PREFIX_MAP[key];
  return fn ? fn() : null;
}
