import { useCallback, useRef, useState, type ReactNode } from "react";
import type { ActiveView, AppConfig, SavedTemplate, SendTemplateItem } from "./types.ts";
import { SidebarCardColorPopover } from "./SidebarCardColorPopover.tsx";
import {
  mergeSidebarTemplateOrder,
  resolvePinnedItemCardColor,
  resolvePinnedTaskCardColor,
  resolveTemplateCardColor,
  sidebarCardAccentStyleObj,
  sidebarItemDefaultColor,
  sidebarTaskDefaultColor,
} from "./lib/sidebarCardColor.ts";

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
  onCloseMenus: () => void;
};

type PinnedMenuTarget = "item" | "task";
type ColorTarget =
  | { kind: "pinned"; pin: PinnedMenuTarget }
  | { kind: "template"; id: string };

type SidebarMenu =
  | { type: "pinned"; x: number; y: number; pin: PinnedMenuTarget }
  | { type: "template"; x: number; y: number; id: string; title: string };

function TemplateDnDList({
  templates,
  onReorder,
  renderCard,
}: {
  templates: SavedTemplate[];
  onReorder: (ordered: SavedTemplate[]) => void;
  renderCard: (t: SavedTemplate, dragHandle: ReactNode) => ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<number | null>(null);
  const itemsAtDragRef = useRef<SavedTemplate[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const endDrag = useCallback(() => {
    fromRef.current = null;
    itemsAtDragRef.current = [];
    setDragFrom(null);
    setDropIdx(null);
  }, []);

  const onHandlePointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();
      fromRef.current = index;
      itemsAtDragRef.current = [...templates];
      setDragFrom(index);
      setDropIdx(index);

      const onMove = (ev: PointerEvent) => {
        if (fromRef.current === null) return;
        const root = listRef.current;
        if (!root) return;
        const rows = root.querySelectorAll<HTMLElement>("[data-sidebar-dnd-item]");
        const n = rows.length;
        let insert = n;
        for (let i = 0; i < n; i++) {
          const r = rows[i].getBoundingClientRect();
          const mid = r.top + r.height / 2;
          if (ev.clientY < mid) {
            insert = i;
            break;
          }
        }
        setDropIdx(insert);
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        const from = fromRef.current;
        if (from === null) {
          endDrag();
          return;
        }
        let insert = itemsAtDragRef.current.length;
        const root = listRef.current;
        if (root) {
          const rows = root.querySelectorAll<HTMLElement>("[data-sidebar-dnd-item]");
          const n = rows.length;
          insert = n;
          for (let i = 0; i < n; i++) {
            const r = rows[i].getBoundingClientRect();
            const mid = r.top + r.height / 2;
            if (ev.clientY < mid) {
              insert = i;
              break;
            }
          }
        }
        const src = itemsAtDragRef.current;
        const next = [...src];
        const [row] = next.splice(from, 1);
        let to = insert;
        if (to > from) to -= 1;
        next.splice(to, 0, row);
        onReorder(next);
        endDrag();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [templates, onReorder, endDrag],
  );

  return (
    <div className="sidebar-template-dnd-list" ref={listRef}>
      {templates.map((t, i) => {
        const showBefore = dropIdx === i && dragFrom !== null && dragFrom !== i;
        const handle = (
          <span
            className="sidebar-card-drag-handle"
            aria-hidden
            onPointerDown={onHandlePointerDown(i)}
            title="拖动排序"
          >
            ⋮⋮
          </span>
        );
        return (
          <div key={t.id} className="sidebar-template-dnd-slot" data-sidebar-dnd-item>
            {showBefore ? <div className="sidebar-template-drop-indicator" aria-hidden /> : null}
            {renderCard(t, handle)}
          </div>
        );
      })}
      {dropIdx === templates.length && dragFrom !== null ? (
        <div className="sidebar-template-drop-indicator sidebar-template-drop-indicator--end" aria-hidden />
      ) : null}
    </div>
  );
}

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
  onCloseMenus,
}: SidebarProps) {
  const [menu, setMenu] = useState<SidebarMenu | null>(null);
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [colorAnchor, setColorAnchor] = useState<{ x: number; y: number } | null>(null);

  const templates = mergeSidebarTemplateOrder(config.savedTemplates, config.sidebarTemplateOrder);
  const itemAccent = resolvePinnedItemCardColor(config);
  const taskAccent = resolvePinnedTaskCardColor(config);

  const openColorPopover = (target: ColorTarget, x: number, y: number) => {
    setMenu(null);
    setColorTarget(target);
    setColorAnchor({ x, y });
    onCloseMenus();
  };

  const colorInitialHex = (): string => {
    if (!colorTarget) return sidebarItemDefaultColor(config);
    if (colorTarget.kind === "pinned") {
      return colorTarget.pin === "item" ? itemAccent : taskAccent;
    }
    const t = config.savedTemplates.find((x) => x.id === colorTarget.id);
    return t ? resolveTemplateCardColor(config, t) : sidebarItemDefaultColor(config);
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

  const renderTemplateCard = (t: SavedTemplate, dragHandle: ReactNode) => {
    const isActive =
      (activeView.kind === "template" || activeView.kind === "snapshot") && activeView.id === t.id;
    const accent = resolveTemplateCardColor(config, t);

    const hasItemActions = t.source === "item";
    const hasTaskActions =
      t.source === "task" && (onCompleteTaskFromTemplate || onAcceptTasksFromTemplate);
    const withSidebarActions = hasItemActions || hasTaskActions;

    return (
      <div
        className={`card card--sidebar card--sidebar-template card--template${withSidebarActions ? " card--sidebar-with-actions" : ""}${hasItemActions ? " card--sidebar-item-template" : ""}${hasTaskActions ? " card--sidebar-task-template" : ""}${isActive ? " active" : ""}`}
        style={sidebarCardAccentStyleObj(accent)}
        onClick={() => {
          if (filterSheetOpen) return;
          onSelectTemplate(t.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ type: "template", x: e.clientX, y: e.clientY, id: t.id, title: t.title });
        }}
      >
        <div className="sidebar-card-drag-row">{dragHandle}</div>
        {hasItemActions ? (
          <>
            <div
              className="card-template-actions card-template-actions--grid"
              onClick={(e) => e.stopPropagation()}
            >
              {t.items.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="btn btn-tiny card-template-action card-template-action--send"
                    onClick={() => onSendTemplateNow(t.title, t.items)}
                  >
                    一键发送
                  </button>
                  <button
                    type="button"
                    className="btn btn-tiny card-template-action card-template-action--send"
                    onClick={() => onBatchSend(t.id, t.title, t.items)}
                  >
                    批量发送
                  </button>
                </>
              ) : (
                <>
                  <span className="card-template-action-spacer" aria-hidden />
                  <span className="card-template-action-spacer" aria-hidden />
                </>
              )}
              <button
                type="button"
                className="btn btn-tiny card-template-action card-template-action--send"
                onClick={() => onSendTemplateSelected?.(t.id)}
              >
                发送已勾选
              </button>
              {serverWideSendEnabled && onGlobalSendTemplate ? (
                <button
                  type="button"
                  className="btn btn-tiny card-template-action card-template-action--send"
                  onClick={() => onGlobalSendTemplate(t.title, t.items)}
                >
                  全服发送
                </button>
              ) : (
                <span className="card-template-action-spacer" aria-hidden />
              )}
            </div>
            <div className="card-title">{t.title}</div>
          </>
        ) : null}
        {hasTaskActions ? (
          <>
            <div
              className="card-template-actions card-template-actions--grid card-template-actions--task"
              onClick={(e) => e.stopPropagation()}
            >
              {onAcceptTasksFromTemplate ? (
                <button
                  type="button"
                  className="btn btn-tiny card-template-action card-template-action--head"
                  onClick={() => onAcceptTasksFromTemplate(t.id)}
                >
                  接取已勾选
                </button>
              ) : (
                <span className="card-template-action-spacer" aria-hidden />
              )}
              {onCompleteTaskFromTemplate ? (
                <button
                  type="button"
                  className="btn btn-tiny card-template-action card-template-action--head"
                  onClick={() => onCompleteTaskFromTemplate(t.id)}
                >
                  完成已勾选
                </button>
              ) : (
                <span className="card-template-action-spacer" aria-hidden />
              )}
            </div>
            <div className="card-title">{t.title}</div>
          </>
        ) : null}
        {!hasItemActions && !hasTaskActions ? (
          <div className="card-title">{t.title}</div>
        ) : null}
      </div>
    );
  };

  return (
    <aside
      className={`sidebar${filterSheetOpen ? " sidebar--filter-blocked" : ""}`}
      aria-hidden={filterSheetOpen ? true : undefined}
    >
      <div
        className={`card card--sidebar card--sidebar-pinned${activeView.kind === "item" ? " active" : ""}`}
        style={sidebarCardAccentStyleObj(itemAccent)}
        onClick={() => {
          if (filterSheetOpen) return;
          onSelectItem();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ type: "pinned", x: e.clientX, y: e.clientY, pin: "item" });
        }}
      >
        <div className="card-title">全部道具</div>
      </div>
      <div
        className={`card card--sidebar card--sidebar-pinned card--sidebar-task-pinned${onCompleteNextTaskFromPinned ? " card--sidebar-with-actions" : ""}${activeView.kind === "task" ? " active" : ""}`}
        style={sidebarCardAccentStyleObj(taskAccent)}
        onClick={() => {
          if (filterSheetOpen) return;
          onSelectTask();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ type: "pinned", x: e.clientX, y: e.clientY, pin: "task" });
        }}
      >
        {onCompleteNextTaskFromPinned ? (
          <>
            <div
              className="card-template-actions card-template-actions--grid card-template-actions--task"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="card-template-action-spacer" aria-hidden />
              <button
                type="button"
                className="btn btn-tiny card-template-action card-template-action--head"
                onClick={() => onCompleteNextTaskFromPinned()}
              >
                完成已勾选
              </button>
            </div>
            <div className="card-title">全部任务</div>
          </>
        ) : (
          <div className="card-title">全部任务</div>
        )}
      </div>
      <div
        className={`card card--sidebar card--sidebar-pinned${activeView.kind === "addExp" ? " active" : ""}`}
        style={sidebarCardAccentStyleObj(addExpAccent)}
        onClick={() => {
          if (filterSheetOpen) return;
          onSelectAddExp();
        }}
      >
        <div className="card-title">加经验</div>
      </div>

      <TemplateDnDList
        templates={templates}
        onReorder={(ordered) => {
          void onPersist({
            ...config,
            sidebarTemplateOrder: ordered.map((t) => t.id),
          });
        }}
        renderCard={renderTemplateCard}
      />

      {menu?.type === "pinned" ? (
        <div
          className="context-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
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
            onClick={() => openColorPopover({ kind: "pinned", pin: menu.pin }, menu.x, menu.y)}
          >
            设置颜色…
          </button>
          <button
            type="button"
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
          className="context-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => openColorPopover({ kind: "template", id: menu.id }, menu.x, menu.y)}
          >
            设置颜色…
          </button>
          <button
            type="button"
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
            onClick={() => {
              const { id, title } = menu;
              setMenu(null);
              onTemplateDelete(id, title);
            }}
          >
            删除
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
