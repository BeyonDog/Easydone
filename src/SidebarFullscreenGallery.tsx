import { useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig } from "./types.ts";
import { SidebarCardColorPopover } from "./SidebarCardColorPopover.tsx";
import { SidebarCardDnD } from "./SidebarCardDnD.tsx";
import {
  SidebarCardRenderer,
  type SidebarCardRenderContext,
} from "./SidebarCardRenderer.tsx";
import {
  buildSidebarCardDescriptors,
  matchesSidebarCardSearch,
} from "./lib/sidebarCardRegistry.ts";
import {
  applySidebarCardOrder,
  reorderSidebarCardSubset,
  toggleSidebarCardHidden,
} from "./lib/sidebarCardLayout.ts";
import {
  sidebarItemDefaultColor,
  sidebarTaskDefaultColor,
} from "./lib/sidebarCardColor.ts";

export type SidebarFullscreenGalleryProps = SidebarCardRenderContext & {
  config: AppConfig;
  onPersist: (next: AppConfig) => void | Promise<void>;
  onClose: () => void;
  onOpenHiddenPanel?: (panel: "item" | "task") => void;
  onTemplateRename?: (id: string, title: string) => void;
};

type PinnedMenuTarget = "item" | "task";
type ColorTarget =
  | { kind: "pinned"; pin: PinnedMenuTarget }
  | { kind: "template"; id: string };

type GalleryMenu =
  | { type: "pinned"; x: number; y: number; pin: PinnedMenuTarget }
  | { type: "template"; x: number; y: number; id: string; title: string };

export function SidebarFullscreenGallery({
  config,
  onPersist,
  onClose,
  onCardMainPanelClick,
  onOpenHiddenPanel,
  onTemplateRename,
  ...cardProps
}: SidebarFullscreenGalleryProps) {
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<GalleryMenu | null>(null);
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [colorAnchor, setColorAnchor] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDismiss = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    document.addEventListener("mousedown", onDismiss);
    document.addEventListener("contextmenu", onDismiss);
    return () => {
      document.removeEventListener("mousedown", onDismiss);
      document.removeEventListener("contextmenu", onDismiss);
    };
  }, [menu]);

  const allCards = useMemo(() => buildSidebarCardDescriptors(config), [config]);
  const displayCards = useMemo(
    () => allCards.filter((c) => matchesSidebarCardSearch(c, search)),
    [allCards, search],
  );

  const handleReorder = (orderedIds: string[]) => {
    if (!search.trim()) {
      void onPersist(applySidebarCardOrder(config, orderedIds));
      return;
    }
    void onPersist(reorderSidebarCardSubset(config, orderedIds));
  };

  const handleVisibilityToggle = (cardId: string) => {
    void onPersist(toggleSidebarCardHidden(config, cardId));
  };

  const openColorPopover = (target: ColorTarget, x: number, y: number) => {
    setMenu(null);
    setColorTarget(target);
    setColorAnchor({ x, y });
  };

  const colorInitialHex = (): string => {
    if (!colorTarget) return sidebarItemDefaultColor(config);
    if (colorTarget.kind === "pinned") {
      if (colorTarget.pin === "item") {
        return config.sidebarItemCardColorOverride?.trim()
          ? config.sidebarItemCardColorOverride
          : sidebarItemDefaultColor(config);
      }
      return config.sidebarTaskCardColorOverride?.trim()
        ? config.sidebarTaskCardColorOverride
        : sidebarTaskDefaultColor(config);
    }
    const t = config.savedTemplates.find((x) => x.id === colorTarget.id);
    return t
      ? t.cardColor?.trim() || (t.source === "item" ? sidebarItemDefaultColor(config) : sidebarTaskDefaultColor(config))
      : sidebarItemDefaultColor(config);
  };

  const applyColor = (hex: string) => {
    if (!colorTarget) return;
    if (colorTarget.kind === "pinned") {
      void onPersist({
        ...config,
        sidebarItemCardColorOverride:
          colorTarget.pin === "item" ? hex : config.sidebarItemCardColorOverride ?? null,
        sidebarTaskCardColorOverride:
          colorTarget.pin === "task" ? hex : config.sidebarTaskCardColorOverride ?? null,
      });
    } else {
      const list = config.savedTemplates.map((t) =>
        t.id === colorTarget.id ? { ...t, cardColor: hex } : t,
      );
      void onPersist({ ...config, savedTemplates: list });
    }
  };

  const resetColor = () => {
    if (!colorTarget) return;
    if (colorTarget.kind === "pinned") {
      void onPersist({
        ...config,
        sidebarItemCardColorOverride:
          colorTarget.pin === "item" ? null : config.sidebarItemCardColorOverride ?? null,
        sidebarTaskCardColorOverride:
          colorTarget.pin === "task" ? null : config.sidebarTaskCardColorOverride ?? null,
      });
    } else {
      const list = config.savedTemplates.map((t) =>
        t.id === colorTarget.id ? { ...t, cardColor: null } : t,
      );
      void onPersist({ ...config, savedTemplates: list });
    }
  };

  return (
    <div className="sidebar-gallery" role="region" aria-label="侧栏卡片全屏">
      <div className="sidebar-gallery-toolbar">
        <input
          type="search"
          className="sidebar-gallery-search"
          placeholder="搜索卡片…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="搜索卡片"
        />
        <button type="button" className="btn sidebar-gallery-close-btn" onClick={onClose}>
          退出全屏
        </button>
      </div>
      <div className="sidebar-gallery-body">
        {displayCards.length === 0 ? (
          <div className="sidebar-gallery-empty">无匹配卡片</div>
        ) : (
          <SidebarCardDnD
            layout="grid"
            cards={displayCards}
            onReorder={handleReorder}
            renderCard={(descriptor, dragHandle) => (
              <SidebarCardRenderer
                {...cardProps}
                config={config}
                descriptor={descriptor}
                mode="grid"
                dragHandle={dragHandle}
                galleryHiddenStyle={descriptor.hidden}
                visibilityToggle={
                  <label className="sidebar-card-visibility-toggle" title="在侧栏显示">
                    <input
                      type="checkbox"
                      checked={!descriptor.hidden}
                      onChange={() => handleVisibilityToggle(descriptor.id)}
                    />
                    <span className="sidebar-card-visibility-toggle-label">侧栏</span>
                  </label>
                }
                onPinnedContextMenu={(pin, x, y) => setMenu({ type: "pinned", x, y, pin })}
                onTemplateContextMenu={(id, title, x, y) =>
                  setMenu({ type: "template", x, y, id, title })
                }
                onCardMainPanelClick={
                  descriptor.hasMainPanel ? onCardMainPanelClick : undefined
                }
              />
            )}
          />
        )}
      </div>

      {menu?.type === "pinned" ? (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {onOpenHiddenPanel ? (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                const pin = menu.pin;
                setMenu(null);
                onOpenHiddenPanel(pin);
              }}
            >
              隐藏列…
            </button>
          ) : null}
          <button
            type="button"
            className="context-menu-item"
            onClick={() => openColorPopover({ kind: "pinned", pin: menu.pin }, menu.x, menu.y)}
          >
            设置颜色…
          </button>
          <div role="separator" className="context-menu-sep" />
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              const pin = menu.pin;
              setMenu(null);
              void onPersist({
                ...config,
                sidebarItemCardColorOverride: pin === "item" ? null : config.sidebarItemCardColorOverride ?? null,
                sidebarTaskCardColorOverride: pin === "task" ? null : config.sidebarTaskCardColorOverride ?? null,
              });
            }}
          >
            恢复默认颜色
          </button>
        </div>
      ) : null}

      {menu?.type === "template" ? (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="context-menu-item"
            onClick={() => openColorPopover({ kind: "template", id: menu.id }, menu.x, menu.y)}
          >
            设置颜色…
          </button>
          <div role="separator" className="context-menu-sep" />
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              const list = config.savedTemplates.map((t) =>
                t.id === menu.id ? { ...t, cardColor: null } : t,
              );
              setMenu(null);
              void onPersist({ ...config, savedTemplates: list });
            }}
          >
            恢复默认颜色
          </button>
          {onTemplateRename ? (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                const { id, title } = menu;
                setMenu(null);
                onTemplateRename(id, title);
              }}
            >
              重命名
            </button>
          ) : null}
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              const { id, title } = menu;
              setMenu(null);
              cardProps.onTemplateDelete(id, title);
            }}
          >
            移入回收站
          </button>
        </div>
      ) : null}

      {colorTarget && colorAnchor ? (
        <SidebarCardColorPopover
          x={colorAnchor.x}
          y={colorAnchor.y}
          initialHex={colorInitialHex()}
          presetItemHex={sidebarItemDefaultColor(config)}
          presetTaskHex={sidebarTaskDefaultColor(config)}
          onApply={applyColor}
          onResetDefault={resetColor}
          onClose={() => {
            setColorTarget(null);
            setColorAnchor(null);
          }}
        />
      ) : null}
    </div>
  );
}
