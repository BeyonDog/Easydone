import type { AppConfig, RecycledTemplate } from "./types.ts";
import { formatSidebarCardCreatedAt } from "./lib/formatSidebarCardCreatedAt.ts";
import {
  resolveTemplateCardColor,
  sidebarCardAccentStyleObj,
} from "./lib/sidebarCardColor.ts";

export type RecycledTemplateThumbCardProps = {
  config: AppConfig;
  entry: RecycledTemplate;
  onRequestPurge: (id: string, title: string) => void;
};

export function RecycledTemplateThumbCard({
  config,
  entry,
  onRequestPurge,
}: RecycledTemplateThumbCardProps) {
  const { template, deletedAt } = entry;
  const accent = resolveTemplateCardColor(config, template);

  return (
    <div
      className="card card--sidebar card--sidebar-template card--recycle-thumb"
      style={sidebarCardAccentStyleObj(accent)}
    >
      <div className="recycle-thumb-main">
        <div className="card-title">{template.title}</div>
        <div className="recycle-thumb-meta">
          <span className="card-sub">创建：{formatSidebarCardCreatedAt(template.createdAt)}</span>
          <span className="card-sub">删除：{formatSidebarCardCreatedAt(deletedAt)}</span>
        </div>
      </div>
      <button
        type="button"
        className="btn recycle-thumb-purge"
        onClick={() => onRequestPurge(template.id, template.title)}
      >
        彻底删除
      </button>
    </div>
  );
}
