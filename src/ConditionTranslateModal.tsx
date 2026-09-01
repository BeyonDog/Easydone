import type { TranslateTaskConditionsResult } from "./lib/conditionTranslate.ts";
import { formatTranslatedFieldLine } from "./lib/conditionTranslate.ts";

export type ConditionTranslateModalProps = {
  open: boolean;
  taskId: string;
  result: TranslateTaskConditionsResult | null;
  onClose: () => void;
};

export function ConditionTranslateModal({ open, taskId, result, onClose }: ConditionTranslateModalProps) {
  if (!open || !result) return null;

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal modal--condition-translate" onMouseDown={(e) => e.stopPropagation()}>
        <h3>完成条件翻译</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          任务 ID：<strong>{taskId}</strong>
        </p>
        {result.blocks.length > 1 ? (
          <p className="muted condition-translate-relation-field">
            ConditionRelation = {result.relationRaw === "" ? "（空）" : result.relationRaw} →{" "}
            {result.relationLabel}
          </p>
        ) : null}
        {result.blocks.length === 0 ? (
          <p>该任务没有完成条件。</p>
        ) : (
          result.blocks.map((block, i) => (
            <section key={block.conditionId} className="condition-translate-block">
              {i > 0 ? <p className="condition-translate-relation">{result.relationLabel}</p> : null}
              <h4 className="condition-translate-id">条件 {block.conditionId}</h4>
              <p className="condition-translate-sentence">{block.translation.sentence}</p>
              {block.translation.fields.length > 0 ? (
                <ul className="condition-translate-fields">
                  {block.translation.fields.map((f) => (
                    <li key={f.key}>{formatTranslatedFieldLine(f)}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
