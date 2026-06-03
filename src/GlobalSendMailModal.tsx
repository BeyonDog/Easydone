import { useEffect, useState } from "react";
import type { GlobalSendLastForm, SendTemplateItem } from "./types.ts";
import { defaultGlobalSendLastForm } from "./lib/globalSendLastForm.ts";

export type GlobalSendSubmitPayload = {
  title: string;
  content: string;
  senderName: string;
  startTime: number;
  endTime: number;
  items: SendTemplateItem[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDatetimeLocalValue(tsSec: number): string {
  const d = new Date(tsSec * 1000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const ms = Date.parse(t);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

export type GlobalSendMailModalProps = {
  open: boolean;
  hintTitle?: string;
  initialItems: SendTemplateItem[];
  lastForm: GlobalSendLastForm | null;
  defaultRegion: string;
  gmtTradable: boolean;
  submitting: boolean;
  onClose: () => void;
  onSaveLastForm: (form: GlobalSendLastForm) => void;
  onSubmit: (payload: GlobalSendSubmitPayload) => void;
};

export function GlobalSendMailModal({
  open,
  hintTitle,
  initialItems,
  lastForm,
  defaultRegion,
  gmtTradable,
  submitting,
  onClose,
  onSaveLastForm,
  onSubmit,
}: GlobalSendMailModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [senderName, setSenderName] = useState("lang");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [items, setItems] = useState<SendTemplateItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const base = lastForm ?? defaultGlobalSendLastForm();
    setTitle(base.title);
    setContent(base.content);
    setSenderName(base.senderName);
    setStartLocal(toDatetimeLocalValue(base.startTime));
    setEndLocal(toDatetimeLocalValue(base.endTime));
    setItems(initialItems.map((it) => ({ ...it })));
  }, [open, lastForm, initialItems]);

  if (!open) return null;

  const handleSubmit = () => {
    const startTime = fromDatetimeLocalValue(startLocal);
    const endTime = fromDatetimeLocalValue(endLocal);
    if (!title.trim()) return;
    if (startTime === null || endTime === null) return;
    if (startTime >= endTime) return;
    const merged = items.filter((it) => it.itemId.trim());
    if (merged.length === 0) return;
    const form: GlobalSendLastForm = {
      title: title.trim(),
      content,
      senderName: senderName.trim(),
      startTime,
      endTime,
    };
    onSaveLastForm(form);
    onSubmit({
      title: form.title,
      content: form.content,
      senderName: form.senderName,
      startTime: form.startTime,
      endTime: form.endTime,
      items: merged,
    });
  };

  return (
    <div className="modal-back" onMouseDown={() => !submitting && onClose()}>
      <div
        className="modal global-send-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="global-send-title"
      >
        <div className="global-send-modal-head">
          <h2 id="global-send-title">全服发送</h2>
          <div className="global-send-modal-head-actions">
            <button type="button" className="btn" disabled={submitting} onClick={onClose}>
              取消
            </button>
            <button type="button" className="btn primary" disabled={submitting} onClick={handleSubmit}>
              发送全服邮件
            </button>
          </div>
        </div>
        <p className="help global-send-modal-help">
          单环境全服邮件上限为 <strong>10</strong> 封；达上限时请先于 GMT 清理后再发。
        </p>
        {hintTitle ? <p className="help global-send-modal-hint">来源：{hintTitle}</p> : null}
        <p className="help global-send-modal-hint">
          附件 tradable 将按顶栏当前设置：{gmtTradable ? "可交易" : "不可交易"}；Region 使用顶栏所选区域（
          {defaultRegion || "—"}）。
        </p>
        <div className="field">
          <label htmlFor="global-send-title-input">标题</label>
          <input
            id="global-send-title-input"
            type="text"
            className="bookmark"
            style={{ width: "100%", boxSizing: "border-box" }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="global-send-content">内容</label>
          <textarea
            id="global-send-content"
            className="bookmark global-send-content"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="global-send-sender">发送者名字</label>
          <input
            id="global-send-sender"
            type="text"
            className="bookmark"
            style={{ width: "100%", boxSizing: "border-box" }}
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
        </div>
        <div className="global-send-time-row">
          <div className="field">
            <label htmlFor="global-send-start">开始时间</label>
            <input
              id="global-send-start"
              type="datetime-local"
              className="bookmark"
              style={{ width: "100%", boxSizing: "border-box" }}
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="global-send-end">结束时间</label>
            <input
              id="global-send-end"
              type="datetime-local"
              className="bookmark"
              style={{ width: "100%", boxSizing: "border-box" }}
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>附件（物品 ID / 数量）</label>
          <div className="global-send-attachments">
            {items.map((it, i) => (
              <div key={`${it.itemId}-${i}`} className="global-send-attachment-row">
                <input
                  type="text"
                  className="bookmark global-send-attachment-id"
                  value={it.itemId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((prev) => prev.map((row, j) => (j === i ? { ...row, itemId: v } : row)));
                  }}
                />
                <input
                  type="number"
                  className="bookmark global-send-attachment-qty"
                  min={1}
                  max={9999}
                  value={it.qty}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    const qty = Number.isFinite(n) ? Math.min(9999, Math.max(1, Math.floor(n))) : 1;
                    setItems((prev) => prev.map((row, j) => (j === i ? { ...row, qty } : row)));
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
