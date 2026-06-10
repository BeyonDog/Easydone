import { useState } from "react";
import type { AppConfig, RecycledTemplate } from "./types.ts";
import { RecycledTemplateThumbCard } from "./RecycledTemplateThumbCard.tsx";

export type TemplateRecycleBinTabProps = {
  config: AppConfig;
  recycledTemplates: RecycledTemplate[];
  onRestore: (id: string) => void | Promise<void>;
  onPurge: (id: string) => void | Promise<void>;
};

export function TemplateRecycleBinTab({
  config,
  recycledTemplates,
  onRestore,
  onPurge,
}: TemplateRecycleBinTabProps) {
  const [pendingPurge, setPendingPurge] = useState<{ id: string; title: string } | null>(null);

  if (recycledTemplates.length === 0) {
    return <p className="help muted">回收站为空</p>;
  }

  const sorted = [...recycledTemplates].sort((a, b) => b.deletedAt - a.deletedAt);

  return (
    <>
      <p className="help muted">可还原到侧栏，或彻底删除（不可恢复）。</p>
      <div className="template-recycle-grid">
        {sorted.map((entry) => (
          <RecycledTemplateThumbCard
            key={entry.template.id}
            config={config}
            entry={entry}
            onRequestRestore={(id) => void onRestore(id)}
            onRequestPurge={(id, title) => setPendingPurge({ id, title })}
          />
        ))}
      </div>
      {pendingPurge ? (
        <div className="modal-back" onMouseDown={() => setPendingPurge(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>彻底删除</h2>
            <p className="help">
              确定彻底删除「<span title={pendingPurge.title}>{pendingPurge.title}</span>」？此操作不可恢复。
            </p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setPendingPurge(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const id = pendingPurge.id;
                  setPendingPurge(null);
                  void onPurge(id);
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
