import { useState } from "react";
import type { ItemServerWideSendSettings } from "./types.ts";
import { DEFAULT_DIST_TYPE, DEFAULT_GLOBAL_MAIL_TYPE } from "./lib/itemServerWideSendSettings.ts";

export type ServerWideSendSettingsTabProps = {
  draft: ItemServerWideSendSettings;
  onChange: (next: ItemServerWideSendSettings) => void;
};

export function ServerWideSendSettingsTab({ draft, onChange }: ServerWideSendSettingsTabProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <>
      <div className="field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={draft.entriesEnabled}
            onChange={(e) => onChange({ ...draft, entriesEnabled: e.target.checked })}
          />
          显示全服发送入口（侧栏模板卡、表格右键）
        </label>
      </div>
      <div className="field">
        <button
          type="button"
          className="btn settings-advanced-toggle"
          onClick={() => setAdvancedOpen((o) => !o)}
        >
          {advancedOpen ? "收起高级选项" : "展开高级选项"}
        </button>
      </div>
      {advancedOpen ? (
        <div className="settings-advanced-panel">
          <div className="field">
            <label htmlFor="sw-global-mail-type">global_mail_type</label>
            <input
              id="sw-global-mail-type"
              type="text"
              className="bookmark"
              style={{ width: "100%", boxSizing: "border-box" }}
              value={draft.advanced.globalMailType}
              onChange={(e) =>
                onChange({
                  ...draft,
                  advanced: { ...draft.advanced, globalMailType: e.target.value },
                })
              }
            />
            <p className="help">默认 {DEFAULT_GLOBAL_MAIL_TYPE}</p>
          </div>
          <div className="field">
            <label htmlFor="sw-dist-type">dist_type</label>
            <input
              id="sw-dist-type"
              type="text"
              className="bookmark"
              style={{ width: "100%", boxSizing: "border-box" }}
              value={draft.advanced.distType}
              onChange={(e) =>
                onChange({
                  ...draft,
                  advanced: { ...draft.advanced, distType: e.target.value },
                })
              }
            />
            <p className="help">默认 {DEFAULT_DIST_TYPE}</p>
          </div>
          <div className="field">
            <label htmlFor="sw-sender-default">发送者名字（弹窗缺省）</label>
            <input
              id="sw-sender-default"
              type="text"
              className="bookmark"
              style={{ width: "100%", boxSizing: "border-box" }}
              value={draft.advanced.senderName}
              onChange={(e) =>
                onChange({
                  ...draft,
                  advanced: { ...draft.advanced, senderName: e.target.value },
                })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="sw-localization">localization（JSON 数组）</label>
            <textarea
              id="sw-localization"
              className="bookmark"
              rows={3}
              style={{ width: "100%", boxSizing: "border-box" }}
              value={draft.advanced.localizationJson}
              onChange={(e) =>
                onChange({
                  ...draft,
                  advanced: { ...draft.advanced, localizationJson: e.target.value },
                })
              }
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
