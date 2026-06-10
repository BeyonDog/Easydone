import { useEffect, useState } from "react";

export type ModifyItemPriceModalProps = {
  open: boolean;
  itemId: string;
  initialBaseValue: string;
  initialStdPrice: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { baseValue?: number; stdPrice?: number }) => void;
};

function parseOptionalInt(draft: string): number | undefined {
  const t = draft.trim();
  if (t === "") return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return undefined;
  return n;
}

export function ModifyItemPriceModal({
  open,
  itemId,
  initialBaseValue,
  initialStdPrice,
  submitting,
  onClose,
  onSubmit,
}: ModifyItemPriceModalProps) {
  const [baseDraft, setBaseDraft] = useState("");
  const [stdDraft, setStdDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBaseDraft(initialBaseValue);
    setStdDraft(initialStdPrice);
    setError(null);
  }, [open, initialBaseValue, initialStdPrice, itemId]);

  if (!open) return null;

  const handleSubmit = () => {
    const baseTouched = baseDraft.trim() !== initialBaseValue.trim();
    const stdTouched = stdDraft.trim() !== initialStdPrice.trim();
    if (!baseTouched && !stdTouched) {
      setError("请修改 BaseValue 或 StdPrice 至少一项");
      return;
    }
    const baseValue = baseTouched ? parseOptionalInt(baseDraft) : undefined;
    const stdPrice = stdTouched ? parseOptionalInt(stdDraft) : undefined;
    if (baseTouched && baseValue === undefined) {
      setError("BaseValue 须为非负整数");
      return;
    }
    if (stdTouched && stdPrice === undefined) {
      setError("StdPrice 须为非负整数");
      return;
    }
    if (baseValue === undefined && stdPrice === undefined) {
      setError("请至少填写一项有效价格");
      return;
    }
    setError(null);
    onSubmit({ baseValue, stdPrice });
  };

  return (
    <div className="modal-back" onMouseDown={() => !submitting && onClose()}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>修改物品价格</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          物品 ID：<strong>{itemId}</strong>
        </p>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          将基于工作区 Config/Item.csv 生成补丁并上传到当前 GTOP 分支，不会修改本地 Item.csv。
        </p>
        <label className="field-label">
          BaseValue（基础价值）
          <input
            type="number"
            min={0}
            step={1}
            value={baseDraft}
            disabled={submitting}
            onChange={(e) => setBaseDraft(e.target.value)}
          />
        </label>
        <label className="field-label" style={{ marginTop: "0.75rem" }}>
          StdPrice（标准价格）
          <input
            type="number"
            min={0}
            step={1}
            value={stdDraft}
            disabled={submitting}
            onChange={(e) => setStdDraft(e.target.value)}
          />
        </label>
        {error ? (
          <p className="muted" style={{ color: "var(--danger, #c44)", marginTop: "0.5rem" }}>
            {error}
          </p>
        ) : null}
        <div className="modal-actions" style={{ marginTop: "1rem" }}>
          <button type="button" disabled={submitting} onClick={onClose}>
            取消
          </button>
          <button type="button" className="primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "上传中…" : "确认上传"}
          </button>
        </div>
      </div>
    </div>
  );
}
