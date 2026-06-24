import { useEffect, useMemo, useRef, useState } from "react";
import type { ActiveView, AppConfig, SendTemplateItem } from "./types.ts";
import { SidebarCardColorPopover } from "./SidebarCardColorPopover.tsx";
import {
  sidebarItemDefaultColor,
  sidebarTaskDefaultColor,
} from "./lib/sidebarCardColor.ts";
import { usePointerDragScroll } from "./hooks/usePointerDragScroll.ts";
import { SidebarCardDnD } from "./SidebarCardDnD.tsx";
import { SidebarCardRenderer } from "./SidebarCardRenderer.tsx";
import {
  buildSidebarCardDescriptors,
  filterVisibleSidebarCards,
} from "./lib/sidebarCardRegistry.ts";
import { reorderSidebarCardSubset } from "./lib/sidebarCardLayout.ts";

export type SidebarProps = {
  config: AppConfig;
  activeView: ActiveView;
  filterSheetOpen: boolean;
  onSelectItem: () => void;
  onSelectTask: () => void;
  onSelectTemplate: (id: string) => void;
  onPersist: (next: AppConfig) => void | Promise<void>;
  onOpenHiddenPanel: (panel: "item" | "task") => void;
  onTemplateRename: (id: string, title: string) => void;
  onTemplateDelete: (id: string, title: string) => void;
  onSendTemplateNow: (title: string, items: SendTemplateItem[]) => void;
  onBatchSend: (templateId: string, title: string, items: SendTemplateItem[]) => void;
  onSendTemplateSelected?: (templateId: string) => void;
  onGlobalSendTemplate?: (title: string, items: SendTemplateItem[]) => void;
  onCompleteTaskFromTemplate?: (templateId: string) => void;
  onAcceptTasksFromTemplate?: (templateId: string) => void;
  onCompleteNextTaskFromPinned?: () => void;
  serverWideSendEnabled?: boolean;
  onSelectAddExp: () => void;
  addExpAccent: string;
  addExpPresetBusy?: boolean;
  onAddExpPresetMaxLevel?: () => void;
  onAddExpPresetRich?: () => void;
  onAddExpPresetRichAndMaxLevel?: () => void;
  onSelectUploadConfig: () => void;
  sproutAccent: string;
  addSproutBusy?: boolean;
  onAddSproutOneClick?: () => void;
  resetMatchAccent: string;
  clearMatchBusy?: boolean;
  onClearTimeoutMatch?: () => void;
  uploadConfigAccent: string;
  uploadConfigBusy?: boolean;
  onUploadConfigPick?: () => void;
  onUploadConfigRestore?: () => void;
  onCloseMenus: () => void;
  onOpenGallery: () => void;
  templateDropHoverId?: string | null;
  templateDropRejectId?: string | null;
};

type PinnedMenuTarget = "item" | "task";
type ColorTarget =
  | { kind: "pinned"; pin: PinnedMenuTarget }
  | { kind: "template"; id: string };

type SidebarMenu =
  | { type: "pinned"; x: number; y: number; pin: PinnedMenuTarget }
  | { type: "template"; x: number; y: number; id: string; title: string };

export function Sidebar({
  config,
  activeView,
  filterSheetOpen,
  onSelectItem,
  onSelectTask,
  onSelectTemplate,
  onPersist,
  onOpenHiddenPanel,
  onTemplateRename,
  onTemplateDelete,
  onSendTemplateNow,
  onBatchSend,
  onSendTemplateSelected,
  onGlobalSendTemplate,
  onCompleteTaskFromTemplate,
  onAcceptTasksFromTemplate,
  onCompleteNextTaskFromPinned,
  serverWideSendEnabled = false,
  onSelectAddExp,
  addExpAccent,
  addExpPresetBusy = false,
  onAddExpPresetMaxLevel,
  onAddExpPresetRich,
  onAddExpPresetRichAndMaxLevel,
  onSelectUploadConfig,
  sproutAccent,
  addSproutBusy = false,
  onAddSproutOneClick,
  resetMatchAccent,
  clearMatchBusy = false,
  onClearTimeoutMatch,
  uploadConfigAccent,
  uploadConfigBusy = false,
  onUploadConfigPick,
  onUploadConfigRestore,
  onCloseMenus,
  onOpenGallery,
  templateDropHoverId = null,
  templateDropRejectId = null,
}: SidebarProps) {
  const [menu, setMenu] = useState<SidebarMenu | null>(null);
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
  const visibleCards = useMemo(() => filterVisibleSidebarCards(allCards), [allCards]);
  const dragScroll = usePointerDragScroll({ enabled: !filterSheetOpen });

  const openColorPopover = (target: ColorTarget, x: number, y: number) => {
    setMenu(null);
    setColorTarget(target);
    setColorAnchor({ x, y });
    onCloseMenus();
  };

  const colorInitialHex = (): string => {
    if (!colorTarget) return sidebarItemDefaultColor(config);
    if (colorTarget.kind === "pinned") {
      const pin = colorTarget.pin;
      const card = allCards.find((c) => c.kind === "pinned" && c.pin === pin);
      if (card?.kind === "pinned") {
        if (pin === "item") {
          return config.sidebarItemCardColorOverride?.trim()
            ? config.sidebarItemCardColorOverride
            : sidebarItemDefaultColor(config);
        }
        return config.sidebarTaskCardColorOverride?.trim()
          ? config.sidebarTaskCardColorOverride
          : sidebarTaskDefaultColor(config);
      }
    }
    const t =
      colorTarget.kind === "template"
        ? config.savedTemplates.find((x) => x.id === colorTarget.id)
        : undefined;
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

  const cardRendererProps = {
    config,
    activeView,
    filterSheetOpen,
    addExpAccent,
    addExpPresetBusy,
    sproutAccent,
    addSproutBusy,
    resetMatchAccent,
    clearMatchBusy,
    uploadConfigAccent,
    uploadConfigBusy,
    serverWideSendEnabled,
    templateDropHoverId,
    templateDropRejectId,
    onSelectItem,
    onSelectTask,
    onSelectAddExp,
    onSelectUploadConfig,
    onSelectTemplate,
    onAddExpPresetMaxLevel,
    onAddExpPresetRich,
    onAddExpPresetRichAndMaxLevel,
    onAddSproutOneClick,
    onClearTimeoutMatch,
    onUploadConfigPick,
    onUploadConfigRestore,
    onCompleteNextTaskFromPinned,
    onSendTemplateNow,
    onBatchSend,
    onSendTemplateSelected,
    onGlobalSendTemplate,
    onCompleteTaskFromTemplate,
    onAcceptTasksFromTemplate,
    onTemplateDelete,
    onPinnedContextMenu: (pin: PinnedMenuTarget, x: number, y: number) => {
      setMenu({ type: "pinned", x, y, pin });
    },
    onTemplateContextMenu: (id: string, title: string, x: number, y: number) => {
      setMenu({ type: "template", x, y, id, title });
    },
  };

  return (
    <aside
      className={`sidebar${filterSheetOpen ? " sidebar--filter-blocked" : ""}`}
      aria-hidden={filterSheetOpen ? true : undefined}
    >
      <div
        ref={dragScroll.ref}
        className={`sidebar-scroll${dragScroll.dragging ? " sidebar-scroll--dragging" : ""}`}
        onPointerDown={dragScroll.handlers.onPointerDown}
        onClickCapture={dragScroll.onClickCapture}
      >
        <SidebarCardDnD
          layout="list"
          cards={visibleCards}
          onReorder={(orderedIds) => {
            void onPersist(reorderSidebarCardSubset(config, orderedIds));
          }}
          renderCard={(descriptor, dragHandle) => (
            <SidebarCardRenderer
              {...cardRendererProps}
              descriptor={descriptor}
              mode="narrow"
              dragHandle={dragHandle}
            />
          )}
        />
      </div>

      <div className="sidebar-gallery-footer">
        <button
          type="button"
          className="btn sidebar-gallery-open-btn"
          disabled={filterSheetOpen}
          onClick={onOpenGallery}
          title="全屏查看与管理侧栏卡片"
        >
          <span className="sidebar-gallery-open-btn-icon" aria-hidden>
            ⛶
          </span>
          全屏
        </button>
      </div>

      {menu?.type === "pinned" ? (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
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
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              const { id, title } = menu;
              setMenu(null);
              onTemplateDelete(id, title);
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
    </aside>
  );
}
