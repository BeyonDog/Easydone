import type { ReactNode } from "react";
import type { ActiveView, AppConfig, SendTemplateItem } from "./types.ts";
import type { SidebarCardDescriptor } from "./lib/sidebarCardRegistry.ts";
import {
  SIDEBAR_PINNED_ADD_EXP,
  SIDEBAR_PINNED_ADD_SPROUT,
  SIDEBAR_PINNED_ITEM,
  SIDEBAR_PINNED_RESET_MATCH,
  SIDEBAR_PINNED_TASK,
  SIDEBAR_PINNED_UPLOAD_CONFIG,
} from "./lib/sidebarCardRegistry.ts";
import {
  resolvePinnedItemCardColor,
  resolvePinnedTaskCardColor,
  resolveTemplateCardColor,
  sidebarAddExpDefaultColor,
  sidebarCardAccentStyleObj,
  sidebarResetMatchDefaultColor,
  sidebarSproutDefaultColor,
  sidebarUploadConfigDefaultColor,
} from "./lib/sidebarCardColor.ts";
import { formatSidebarCardCreatedAt } from "./lib/formatSidebarCardCreatedAt.ts";

export type SidebarCardRendererProps = {
  config: AppConfig;
  descriptor: SidebarCardDescriptor;
  activeView: ActiveView;
  mode: "narrow" | "grid";
  filterSheetOpen: boolean;
  dragHandle?: ReactNode;
  visibilityToggle?: ReactNode;
  galleryHiddenStyle?: boolean;
  addExpAccent: string;
  addExpPresetBusy?: boolean;
  sproutAccent: string;
  addSproutBusy?: boolean;
  resetMatchAccent: string;
  clearMatchBusy?: boolean;
  uploadConfigAccent: string;
  uploadConfigBusy?: boolean;
  serverWideSendEnabled?: boolean;
  templateDropHoverId?: string | null;
  templateDropRejectId?: string | null;
  onSelectItem: () => void;
  onSelectTask: () => void;
  onSelectAddExp: () => void;
  onSelectUploadConfig: () => void;
  onSelectTemplate: (id: string) => void;
  onAddExpPresetMaxLevel?: () => void;
  onAddExpPresetRich?: () => void;
  onAddExpPresetRichAndMaxLevel?: () => void;
  onAddSproutOneClick?: () => void;
  onClearTimeoutMatch?: () => void;
  onUploadConfigPick?: () => void;
  onUploadConfigRestore?: () => void;
  onCompleteNextTaskFromPinned?: () => void;
  onSendTemplateNow: (title: string, items: SendTemplateItem[]) => void;
  onBatchSend: (templateId: string, title: string, items: SendTemplateItem[]) => void;
  onSendTemplateSelected?: (templateId: string) => void;
  onGlobalSendTemplate?: (title: string, items: SendTemplateItem[]) => void;
  onCompleteTaskFromTemplate?: (templateId: string) => void;
  onAcceptTasksFromTemplate?: (templateId: string) => void;
  onTemplateDelete: (id: string, title: string) => void;
  onPinnedContextMenu?: (pin: "item" | "task", x: number, y: number) => void;
  onTemplateContextMenu?: (id: string, title: string, x: number, y: number) => void;
  onCardMainPanelClick?: () => void;
};

function cardAccent(
  config: AppConfig,
  descriptor: SidebarCardDescriptor,
  addExpAccent: string,
  sproutAccent: string,
  resetMatchAccent: string,
  uploadConfigAccent: string,
): string {
  if (descriptor.kind === "template") {
    return resolveTemplateCardColor(config, descriptor.template);
  }
  switch (descriptor.id) {
    case SIDEBAR_PINNED_ITEM:
      return resolvePinnedItemCardColor(config);
    case SIDEBAR_PINNED_TASK:
      return resolvePinnedTaskCardColor(config);
    case SIDEBAR_PINNED_ADD_EXP:
      return addExpAccent || sidebarAddExpDefaultColor(config);
    case SIDEBAR_PINNED_ADD_SPROUT:
      return sproutAccent || sidebarSproutDefaultColor();
    case SIDEBAR_PINNED_RESET_MATCH:
      return resetMatchAccent || sidebarResetMatchDefaultColor();
    case SIDEBAR_PINNED_UPLOAD_CONFIG:
      return uploadConfigAccent || sidebarUploadConfigDefaultColor();
    default:
      return resolvePinnedItemCardColor(config);
  }
}

function isCardActive(activeView: ActiveView, descriptor: SidebarCardDescriptor): boolean {
  if (descriptor.kind === "template") {
    return (
      (activeView.kind === "template" || activeView.kind === "snapshot") &&
      activeView.id === descriptor.template.id
    );
  }
  switch (descriptor.id) {
    case SIDEBAR_PINNED_ITEM:
      return activeView.kind === "item";
    case SIDEBAR_PINNED_TASK:
      return activeView.kind === "task";
    case SIDEBAR_PINNED_ADD_EXP:
      return activeView.kind === "addExp";
    case SIDEBAR_PINNED_UPLOAD_CONFIG:
      return activeView.kind === "uploadConfig";
    default:
      return false;
  }
}

export function SidebarCardRenderer({
  config,
  descriptor,
  activeView,
  mode,
  filterSheetOpen,
  dragHandle,
  visibilityToggle,
  galleryHiddenStyle = false,
  addExpAccent,
  addExpPresetBusy = false,
  sproutAccent,
  addSproutBusy = false,
  resetMatchAccent,
  clearMatchBusy = false,
  uploadConfigAccent,
  uploadConfigBusy = false,
  serverWideSendEnabled = false,
  templateDropHoverId = null,
  templateDropRejectId = null,
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
  onPinnedContextMenu,
  onTemplateContextMenu,
  onCardMainPanelClick,
}: SidebarCardRendererProps) {
  const accent = cardAccent(config, descriptor, addExpAccent, sproutAccent, resetMatchAccent, uploadConfigAccent);
  const isActive = isCardActive(activeView, descriptor);
  const modeClass = mode === "grid" ? " card--sidebar-grid" : "";
  const hiddenClass = galleryHiddenStyle ? " sidebar-card-hidden-in-gallery" : "";

  const handleMainClick = () => {
    if (filterSheetOpen) return;
    if (descriptor.kind === "template") {
      onSelectTemplate(descriptor.template.id);
      onCardMainPanelClick?.();
      return;
    }
    switch (descriptor.id) {
      case SIDEBAR_PINNED_ITEM:
        onSelectItem();
        onCardMainPanelClick?.();
        break;
      case SIDEBAR_PINNED_TASK:
        onSelectTask();
        onCardMainPanelClick?.();
        break;
      case SIDEBAR_PINNED_ADD_EXP:
        onSelectAddExp();
        onCardMainPanelClick?.();
        break;
      case SIDEBAR_PINNED_UPLOAD_CONFIG:
        onSelectUploadConfig();
        onCardMainPanelClick?.();
        break;
      default:
        break;
    }
  };

  if (descriptor.kind === "template") {
    const t = descriptor.template;
    const hasItemActions = t.source === "item";
    const hasTaskActions = t.source === "task" && (onCompleteTaskFromTemplate || onAcceptTasksFromTemplate);
    const withSidebarActions = hasItemActions || hasTaskActions;
    const dropHover = templateDropHoverId === t.id;
    const dropReject = templateDropRejectId === t.id;

    return (
      <div
        data-template-drop
        data-template-id={t.id}
        data-template-source={t.source}
        className={`card card--sidebar card--sidebar-template card--template${withSidebarActions ? " card--sidebar-with-actions" : ""}${hasItemActions ? " card--sidebar-item-template" : ""}${hasTaskActions ? " card--sidebar-task-template" : ""}${isActive ? " active" : ""}${dropHover ? " card--template-drop-hover" : ""}${dropReject ? " card--template-drop-reject" : ""}${modeClass}${hiddenClass}`}
        style={sidebarCardAccentStyleObj(accent)}
        title={formatSidebarCardCreatedAt(t.createdAt)}
        onClick={handleMainClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTemplateContextMenu?.(t.id, t.title, e.clientX, e.clientY);
        }}
      >
        {mode === "narrow" ? (
          <button
            type="button"
            className="sidebar-card-delete-badge"
            aria-label={`删除模板 ${t.title}`}
            title="移入回收站"
            onClick={(e) => {
              e.stopPropagation();
              onTemplateDelete(t.id, t.title);
            }}
          >
            <span className="sidebar-card-delete-badge-glyph" aria-hidden>
              −
            </span>
          </button>
        ) : null}
        {visibilityToggle ? (
          <div className="sidebar-card-gallery-controls" onClick={(e) => e.stopPropagation()}>
            {visibilityToggle}
            {dragHandle}
          </div>
        ) : dragHandle ? (
          <div className="sidebar-card-drag-row">{dragHandle}</div>
        ) : null}
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
        {!hasItemActions && !hasTaskActions ? <div className="card-title">{t.title}</div> : null}
      </div>
    );
  }

  const pinned = descriptor.id;

  if (pinned === SIDEBAR_PINNED_ITEM) {
    return (
      <div
        className={`card card--sidebar card--sidebar-pinned${isActive ? " active" : ""}${modeClass}${hiddenClass}`}
        style={sidebarCardAccentStyleObj(accent)}
        onClick={handleMainClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPinnedContextMenu?.("item", e.clientX, e.clientY);
        }}
      >
        {visibilityToggle ? (
          <div className="sidebar-card-gallery-controls" onClick={(e) => e.stopPropagation()}>
            {visibilityToggle}
            {dragHandle}
          </div>
        ) : dragHandle ? (
          <div className="sidebar-card-drag-row">{dragHandle}</div>
        ) : null}
        <div className="card-title">{descriptor.title}</div>
      </div>
    );
  }

  if (pinned === SIDEBAR_PINNED_TASK) {
    return (
      <div
        className={`card card--sidebar card--sidebar-pinned card--sidebar-task-pinned${onCompleteNextTaskFromPinned ? " card--sidebar-with-actions" : ""}${isActive ? " active" : ""}${modeClass}${hiddenClass}`}
        style={sidebarCardAccentStyleObj(accent)}
        onClick={handleMainClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPinnedContextMenu?.("task", e.clientX, e.clientY);
        }}
      >
        {visibilityToggle ? (
          <div className="sidebar-card-gallery-controls" onClick={(e) => e.stopPropagation()}>
            {visibilityToggle}
            {dragHandle}
          </div>
        ) : dragHandle ? (
          <div className="sidebar-card-drag-row">{dragHandle}</div>
        ) : null}
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
            <div className="card-title">{descriptor.title}</div>
          </>
        ) : (
          <div className="card-title">{descriptor.title}</div>
        )}
      </div>
    );
  }

  if (pinned === SIDEBAR_PINNED_ADD_EXP) {
    return (
      <div
        className={`card card--sidebar card--sidebar-pinned card--sidebar-add-exp card--sidebar-with-actions${isActive ? " active" : ""}${modeClass}${hiddenClass}`}
        style={sidebarCardAccentStyleObj(accent)}
        onClick={handleMainClick}
      >
        {visibilityToggle ? (
          <div className="sidebar-card-gallery-controls" onClick={(e) => e.stopPropagation()}>
            {visibilityToggle}
            {dragHandle}
          </div>
        ) : dragHandle ? (
          <div className="sidebar-card-drag-row">{dragHandle}</div>
        ) : null}
        <div
          className="card-template-actions card-template-actions--grid card-template-actions--add-exp"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn btn-tiny card-template-action"
            disabled={filterSheetOpen || addExpPresetBusy}
            onClick={() => onAddExpPresetMaxLevel?.()}
          >
            一键满级
          </button>
          <button
            type="button"
            className="btn btn-tiny card-template-action"
            disabled={filterSheetOpen || addExpPresetBusy}
            onClick={() => onAddExpPresetRich?.()}
          >
            一键富翁
          </button>
          <button
            type="button"
            className="btn btn-tiny card-template-action"
            disabled={filterSheetOpen || addExpPresetBusy}
            onClick={() => onAddExpPresetRichAndMaxLevel?.()}
          >
            一键富翁满级
          </button>
        </div>
        <div className="card-title">{descriptor.title}</div>
      </div>
    );
  }

  if (pinned === SIDEBAR_PINNED_ADD_SPROUT) {
    return (
      <div
        className={`card card--sidebar card--sidebar-pinned card--sidebar-sprout card--sidebar-with-actions${modeClass}${hiddenClass}`}
        style={sidebarCardAccentStyleObj(accent)}
      >
        {visibilityToggle ? (
          <div className="sidebar-card-gallery-controls" onClick={(e) => e.stopPropagation()}>
            {visibilityToggle}
            {dragHandle}
          </div>
        ) : dragHandle ? (
          <div className="sidebar-card-drag-row">{dragHandle}</div>
        ) : null}
        <div
          className="card-template-actions card-template-actions--grid card-template-actions--sprout"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn btn-tiny card-template-action card-template-action--head"
            disabled={filterSheetOpen || addSproutBusy}
            onClick={() => onAddSproutOneClick?.()}
          >
            一键出豆芽
          </button>
        </div>
        <div className="card-title">{descriptor.title}</div>
      </div>
    );
  }

  if (pinned === SIDEBAR_PINNED_RESET_MATCH) {
    return (
      <div
        className={`card card--sidebar card--sidebar-pinned card--sidebar-reset-match card--sidebar-with-actions${modeClass}${hiddenClass}`}
        style={sidebarCardAccentStyleObj(accent)}
      >
        {visibilityToggle ? (
          <div className="sidebar-card-gallery-controls" onClick={(e) => e.stopPropagation()}>
            {visibilityToggle}
            {dragHandle}
          </div>
        ) : dragHandle ? (
          <div className="sidebar-card-drag-row">{dragHandle}</div>
        ) : null}
        <div
          className="card-template-actions card-template-actions--grid card-template-actions--reset-match"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn btn-tiny card-template-action card-template-action--head"
            disabled={filterSheetOpen || clearMatchBusy}
            onClick={() => onClearTimeoutMatch?.()}
          >
            一键重置
          </button>
        </div>
        <div className="card-title">{descriptor.title}</div>
      </div>
    );
  }

  if (pinned === SIDEBAR_PINNED_UPLOAD_CONFIG) {
    return (
      <div
        className={`card card--sidebar card--sidebar-pinned card--sidebar-upload-config card--sidebar-with-actions${isActive ? " active" : ""}${modeClass}${hiddenClass}`}
        style={sidebarCardAccentStyleObj(accent)}
        onClick={handleMainClick}
      >
        {visibilityToggle ? (
          <div className="sidebar-card-gallery-controls" onClick={(e) => e.stopPropagation()}>
            {visibilityToggle}
            {dragHandle}
          </div>
        ) : dragHandle ? (
          <div className="sidebar-card-drag-row">{dragHandle}</div>
        ) : null}
        <div
          className="card-template-actions card-template-actions--grid card-template-actions--upload-config"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn btn-tiny card-template-action"
            disabled={filterSheetOpen || uploadConfigBusy}
            onClick={() => onUploadConfigPick?.()}
          >
            选择上传
          </button>
          <button
            type="button"
            className="btn btn-tiny card-template-action"
            disabled={filterSheetOpen || uploadConfigBusy}
            onClick={() => onUploadConfigRestore?.()}
          >
            恢复配置
          </button>
        </div>
        <div className="card-title">{descriptor.title}</div>
      </div>
    );
  }

  return null;
}

export type SidebarCardRenderContext = Omit<
  SidebarCardRendererProps,
  "descriptor" | "mode" | "dragHandle" | "visibilityToggle" | "galleryHiddenStyle"
>;
