import { useEffect, useState } from "react";

type Props = {
  headers: string[];
  onClose: () => void;
  onPicked: (columnIndex: number, columnName: string) => void;
};

export function ColumnPickModal({ headers, onClose, onPicked }: Props) {
  const [choice, setChoice] = useState(headers[0] ?? "");

  useEffect(() => {
    setChoice(headers[0] ?? "");
  }, [headers]);

  const confirm = () => {
    const idx = headers.findIndex((h) => h === choice);
    if (idx < 0) return;
    onPicked(idx, choice);
    onClose();
  };

  return (
    <div className="modal-back">
      <div className="modal">
        <h2>选择「物品备注」列</h2>
        <p className="help">未自动识别到物品备注列，请从表头中选择一列作为备注来源。</p>
        <select value={choice} onChange={(e) => setChoice(e.target.value)} style={{ width: "100%", padding: "0.35rem" }}>
          {headers.map((h, i) => (
            <option key={`${i}-${h}`} value={h}>
              {h || "(空列名)"}
            </option>
          ))}
        </select>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={confirm}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
