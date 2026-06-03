/**
 * Restore Chinese UI strings in src/App.tsx (UTF-8 safe).
 * Usage: node scripts/restore-app-zh.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { applyPass2Fixes } from "./patch-last-zh.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(root, "src/App.tsx");
const fragPath = path.join(root, "scripts/filter-modals-fragment.txt");
const fixZhPath = path.join(root, "scripts/archive/fix-zh-v2.mjs");
const manifestPath = path.join(root, "scripts/zh-restore-manifest.json");

function loadExactFromFixZhV2() {
  const src = fs.readFileSync(fixZhPath, "utf8");
  const m = src.match(/const exact = \[([\s\S]*?)\];\s*\n\s*\/\/ Fix 空/);
  if (!m) throw new Error("Could not parse exact array from fix-zh-v2.mjs");
  // eslint-disable-next-line no-eval
  return eval(`[${m[1]}]`);
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}

function applyReplacements(s, pairs, { strict = true } = {}) {
  const skipped = [];
  const applied = [];
  const errors = [];
  for (const [oldStr, newStr, note] of pairs) {
    if (oldStr === newStr) continue;
    const c = countOccurrences(s, oldStr);
    if (c === 0) {
      skipped.push(note || oldStr.slice(0, 40));
      continue;
    }
    if (c > 1 && strict) {
      errors.push({ note, count: c, old: oldStr.slice(0, 80) });
      continue;
    }
    s = s.split(oldStr).join(newStr);
    applied.push(note || oldStr.slice(0, 40));
  }
  return { s, skipped, applied, errors };
}

function fixEmptyBucketLogic(s) {
  return s
    .replace(/const hasEmpty = s\.has\("\?"\);/g, 'const hasEmpty = s.has("空");')
    .replace(/if \(hasEmpty\) s\.delete\("\?"\);/g, 'if (hasEmpty) s.delete("空");')
    .replace(/if \(k === "\?"\)/g, 'if (k === "空")')
    .replace(/\(hasEmpty \? \["\?"] : \[\]\)/g, '(hasEmpty ? ["空"] : [])');
}

function spliceFilterModals(s) {
  const frag = fs.readFileSync(fragPath, "utf8");
  const start = s.indexOf("      {itemFilterModalOpen && config ? (");
  const end = s.indexOf("      <GoGmtModalView />");
  if (start < 0 || end < 0) throw new Error("Filter modal splice markers not found");
  return s.slice(0, start) + frag.trimEnd() + "\n      " + s.slice(end);
}

/** Context-specific pairs not covered safely by fix-zh-v2 exact list */
const EXTENDED = [
  // --- push / notify with unique surrounding context ---
  [
    `    if (!built) {
      push("?????");
      return;
    }
    const source = getCurrentTableSource(activeView, config) ?? "item";`,
    `    if (!built) {
      push("请先勾选行");
      return;
    }
    const source = getCurrentTableSource(activeView, config) ?? "item";`,
    "push-请先勾选行-openSnapshot",
  ],
  [
    `    if (!built) {
      push("?????");
      return;
    }
    const currentSource = getCurrentTableSource(activeView, config) ?? "item";`,
    `    if (!built) {
      push("请先勾选行");
      return;
    }
    const currentSource = getCurrentTableSource(activeView, config) ?? "item";`,
    "push-请先勾选行-append",
  ],
  [
    `      if (currentSource === "task" && snap.source === "item") {
        push("????????????");
      } else {
        push("????????????");
      }`,
    `      if (currentSource === "task" && snap.source === "item") {
        push("记录类型不匹配，无法追加");
      } else {
        push("记录类型不匹配，无法追加");
      }`,
    "push-记录类型不匹配",
  ],
  [
    `    if (!snap.aoa?.length) {
      push("???????????");
      return;
    }`,
    `    if (!snap.aoa?.length) {
      push("目标快照无表头，无法追加");
      return;
    }`,
    "push-目标快照无表头",
  ],
  [
    `    if (!headersCompatibleForAppend(currentAoa[0], snap.aoa[0])) {
      push("???????????");
      return;
    }`,
    `    if (!headersCompatibleForAppend(currentAoa[0], snap.aoa[0])) {
      push("表头与目标快照不一致");
      return;
    }`,
    "push-表头不一致",
  ],
  [
    `      if (itemFilterDraft.defenseRange) {
        if (itemFilterDraft.defenseMin.trim() === "" && itemFilterDraft.defenseMax.trim() === "") {
          push("????????????????");
          return;
        }`,
    `      if (itemFilterDraft.defenseRange) {
        if (itemFilterDraft.defenseMin.trim() === "" && itemFilterDraft.defenseMax.trim() === "") {
          push("请填写防护值范围的最小值或最大值");
          return;
        }`,
    "push-防护值minmax-empty",
  ],
  [
    `        if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
          push("????????????????");
          return;
        }`,
    `        if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
          push("防护值范围：最小值不能大于最大值");
          return;
        }`,
    "push-防护值minmax-order",
  ],
  [
    `    const key = applyItemFilterQuickSearch();
    if (!key) {
      push("???????????");
      return;
    }`,
    `    const key = applyItemFilterQuickSearch();
    if (!key) {
      push("当前表无「类型备注」列");
      return;
    }`,
    "push-无类型备注列",
  ],
  [
    `    if (!itemFilterOptions.typeRemark.includes(key)) {
      push("???????????");
      return;
    }
    if (ambiguous) push(\`?????????\${key}?\`);`,
    `    if (!itemFilterOptions.typeRemark.includes(key)) {
      push("无匹配的类型备注筛选项");
      return;
    }
    if (ambiguous) push(\`多个匹配，已选用「\${key}」\`);`,
    "push-类型备注快捷",
  ],
  [
    `    const key = applyTaskFilterQuickSearch();
    if (!key) {
      push("?????TaskType?????????");
      return;
    }`,
    `    const key = applyTaskFilterQuickSearch();
    if (!key) {
      push("当前表无「TaskType」或「任务类型」列");
      return;
    }`,
    "push-无TaskType列",
  ],
  [
    `    if (!taskFilterOptions.taskType.includes(key)) {
      push("???????????");
      return;
    }
    if (ambiguous) push(\`?????????\${key}?\`);`,
    `    if (!taskFilterOptions.taskType.includes(key)) {
      push("无匹配的任务类型筛选项");
      return;
    }
    if (ambiguous) push(\`多个匹配，已选用「\${key}」\`);`,
    "push-任务类型快捷",
  ],
  [
    `      if (ridx < 0) {
        push("???????????");
        return;
      }`,
    `      if (ridx < 0) {
        push("请先配置「物品备注」列");
        return;
      }`,
    "push-物品备注列",
  ],
  [
    `      if (orderKeys.length === 0) {
        push("??????");
        return;
      }
      const body = orderKeys.map((t) => \`\${counts.get(t) ?? 0}?\${t}\`).join("?");
      instruction = \`??\${body}\`;`,
    `      if (orderKeys.length === 0) {
        push("无法生成指令");
        return;
      }
      const body = orderKeys.map((t) => \`\${counts.get(t) ?? 0}个\${t}\`).join("、");
      instruction = \`发送刚刚复制的道具:\${body}\`;`,
    "goGmt-instruction-body",
  ],
  [
    `    if (skipBrowser) {
      push("? ???? GMT ???????? ID");
    } else {
      push("? ? GMT ?????? Ctrl+V ?????");
    }`,
    `    if (skipBrowser) {
      push("请去 GMT 中粘贴指令（已复制到剪贴板）");
    } else {
      push("已复制指令，请按弹窗步骤在浏览器中操作");
    }`,
    "goGmt-toast",
  ],
  [
    `        push(\`?????? \${e}\`);`,
    `        push(\`打开浏览器失败: \${e}\`);`,
    "goGmt-openUrl-fail",
  ],
  [
    `        push(\`? Excel ??: \${msg}\`);`,
    `        push(\`读 Excel 失败: \${msg}\`);`,
    "push-read-excel",
  ],
  [
    `      push("GMT ???");
      setGmtLoggedIn(true);
    } catch (e) {
      push(\`GMT ????: \${e}\`);`,
    `      push("GMT 已登录");
      setGmtLoggedIn(true);
    } catch (e) {
      push(\`GMT 登录失败: \${e}\`);`,
    "gmt-login-success-fail",
  ],
  [
    `      push("GMT ???");
    } catch (e) {
      push(\`GMT ????: \${e}\`);
    } finally {
      setGmtSessionChecking(false);
    }
  }, [config?.gmtBaseUrl, config?.gmtCookie, config?.gmtEnvId]);`,
    `      push("GMT 已退出");
    } catch (e) {
      push(\`GMT 退出失败: \${e}\`);
    } finally {
      setGmtSessionChecking(false);
    }
  }, [config?.gmtBaseUrl, config?.gmtCookie, config?.gmtEnvId]);`,
    "gmt-logout",
  ],
  // --- template / snapshot / log ---
  [
    `    logOp({ action: "?????", outcome: "success", message: "????", detail: trimmed });`,
    `    logOp({ action: "重命名快照", outcome: "success", message: "已重命名", detail: trimmed });`,
    "logOp-重命名快照",
  ],
  [
    `      notify("????? ID ??", { action: "??????", outcome: "failure" });`,
    `      notify("所选行物品 ID 为空", { action: "保存发送模板", outcome: "failure" });`,
    "notify-模板无ID",
  ],
  [
    `    const defaultTitle = \`?? \${new Date(now).toLocaleString("zh-CN", { hour12: false })}?\${items.length} ??\`;`,
    `    const defaultTitle = \`模板 \${new Date(now).toLocaleString("zh-CN", { hour12: false })}（\${items.length} 种）\`;`,
    "template-defaultTitle",
  ],
  [
    `    notify(\`????????\${title}??\${items.length} ????\`, {
      action: "??????",
      outcome: "success",
      detail: title,
    });`,
    `    notify(\`已保存发送模板「\${title}」（\${items.length} 种道具）\`, {
      action: "保存发送模板",
      outcome: "success",
      detail: title,
    });`,
    "notify-模板已保存",
  ],
  [
    `      notify("??????", { action: "???????", outcome: "failure" });`,
    `      notify("名称不能为空", { action: "重命名发送模板", outcome: "failure" });`,
    "notify-模板重命名空",
  ],
  [
    `    notify("????", { action: "???????", outcome: "success", detail: trimmed });`,
    `    notify("已重命名", { action: "重命名发送模板", outcome: "success", detail: trimmed });`,
    "notify-模板已重命名",
  ],
  [
    `      logOp({ action: "GMT ????", outcome: "failure", message: "??? GMT", detail: title });`,
    `      logOp({ action: "GMT 发放道具", outcome: "failure", message: "未登录 GMT", detail: title });`,
    "logOp-未登录GMT",
  ],
  [
    `      notify("?????", { action: "GMT ????", outcome: "failure", detail: title });`,
    `      notify("请选择区服", { action: "GMT 发放道具", outcome: "failure", detail: title });`,
    "notify-请选择区服",
  ],
  [
    `      notify("????? ID", { action: "GMT ????", outcome: "failure", detail: title });`,
    `      notify("请填写账号 ID", { action: "GMT 发放道具", outcome: "failure", detail: title });`,
    "notify-请填账号",
  ],
  [
    `      notify("????? ID ??", { action: "GMT ????", outcome: "failure", detail: title });`,
    `      notify("模板内物品 ID 为空", { action: "GMT 发放道具", outcome: "failure", detail: title });`,
    "notify-模板ID空",
  ],
  [
    `      action: "GMT ????",
      outcome: (result.ok ? "success" : "failure") as OperationOutcome,
      detail: title,
    };
    notify(result.message, log);`,
    `      action: "GMT 发放道具",
      outcome: (result.ok ? "success" : "failure") as OperationOutcome,
      detail: title,
    };
    notify(result.message, log);`,
    "notify-GMT发放",
  ],
  [
    `        notify(readiness.message, { action: "GMT ????", outcome: "failure" });`,
    `        notify(readiness.message, { action: "GMT 发放道具", outcome: "failure" });`,
    "notify-gmt-readiness",
  ],
  [
    `        result.ok ? \`\${result.message}?? \${idxs.length} ??\` : result.message,
        {
          action: "GMT ????",
          outcome: result.ok ? "success" : "failure",
          detail: \`\${result.itemKindCount} ?\`,
        },`,
    `        result.ok ? \`\${result.message}（\${idxs.length} 行）\` : result.message,
        {
          action: "GMT 发放道具",
          outcome: result.ok ? "success" : "failure",
          detail: \`\${result.itemKindCount} 种\`,
        },`,
    "notify-发放道具结果",
  ],
  [
    `          push(\`????? \${taskId}\`);`,
    `          push(\`已完成任务 \${taskId}\`);`,
    "push-完成任务",
  ],
  // --- Wizard ---
  [
    `<h2>????</h2>
          <p className="help">?? Excel ?????????? Excel\\Item.xlsx ? Excel\\Mission.xlsx?</p>`,
    `<h2>首次设置</h2>
          <p className="help">选择 Excel 工作区根目录，须包含 Excel\\Item.xlsx 与 Excel\\Mission.xlsx。</p>`,
    "wizard-title",
  ],
  [
    `pickFolder("?? Excel ???").then(setEx)`,
    `pickFolder("选择 Excel 工作区").then(setEx)`,
    "wizard-pickFolder",
  ],
  [
    `              ?????
              </button>
            </motion.div>
          </motion.div>
          {err ? <div className="error">{err}</motion.div> : null}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              ?????`,
    `              选择文件夹
              </button>
            </motion.div>
          </motion.div>
          {err ? <motion.div className="error">{err}</motion.div> : null}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              保存并开始`,
    "wizard-buttons",
  ],
  // Fix wizard if still div not motion - alternate
  [
    `              ?????
              </button>
            </motion.div>
          </motion.div>
          {err ? <div className="error">{err}</div> : null}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              ?????`,
    `              选择文件夹
              </button>
            </div>
          </motion.div>
          {err ? <div className="error">{err}</motion.div> : null}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              保存并开始`,
    "wizard-buttons-alt",
  ],
  [
    `              ?????
              </button>
            </div>
          </div>
          {err ? <motion.div className="error">{err}</motion.div> : null}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              ?????`,
    `              选择文件夹
              </button>
            </motion.div>
          </motion.div>
          {err ? <div className="error">{err}</motion.div> : null}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              保存并开始`,
    "wizard-buttons-alt2",
  ],
  [
    `              ?????
              </button>
            </div>
          </div>
          {err ? <div className="error">{err}</motion.div> : null}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              ?????`,
    `              选择文件夹
              </button>
            </motion.div>
          </motion.div>
          {err ? <div className="error">{err}</motion.div> : null}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              保存并开始`,
    "wizard-buttons-alt3",
  ],
  // Simpler wizard fixes
  [
    `onClick={() => void pickFolder("?? Excel ???").then(setEx)}`,
    `onClick={() => void pickFolder("选择 Excel 工作区").then(setEx)}`,
    "wizard-pick-onclick",
  ],
  [
    `            <button type="button" className="btn primary" onClick={() => void finish()}>
              ?????`,
    `            <button type="button" className="btn primary" onClick={() => void finish()}>
              保存并开始`,
    "wizard-save-start",
  ],
  [
    `              ?????
              </button>`,
    `              选择文件夹
              </button>`,
    "wizard-choose-folder",
  ],
  // --- Settings ---
  [
    `<h2>??</h2>`,
    `<h2>设置</h2>`,
    "settings-title",
  ],
  [
    `        title: "????",
        filters: [{ name: "??", extensions:`,
    `        title: "选择壁纸",
        filters: [{ name: "图片", extensions:`,
    "settings-wallpaper-dialog",
  ],
  [
    `        setErr("??????");
        return;
      }
      try {
        const b64 = await invoke<string>("read_file_base64", { path: p });`,
    `        setErr("不支持的图片格式");
        return;
      }
      try {
        const b64 = await invoke<string>("read_file_base64", { path: p });`,
    "settings-wallpaper-format",
  ],
  [
    `          setErr("????????????");
          return;
        }
        setWallPending({ ext, dataBase64: b64 });`,
    `          setErr("图片过大，请选择较小的文件");
          return;
        }
        setWallPending({ ext, dataBase64: b64 });`,
    "settings-wallpaper-size",
  ],
  [
    `        setErr("Excel ?????");
        return;
      }
      const ip = excelItemPath(er);`,
    `        setErr("Excel 工作区无效");
        return;
      }
      const ip = excelItemPath(er);`,
    "settings-excel-invalid",
  ],
  [
    `            <label htmlFor="settings-theme-bg">????</label>`,
    `            <label htmlFor="settings-theme-bg">背景底色</label>`,
    "settings-bg-label",
  ],
  [
    `              ????????????
            </p>
          </motion.div>
          <div className="field">
            <label htmlFor="settings-theme-bg">背景底色</label>`,
    `              用于页面底色，与壁纸叠加显示。
            </p>
          </motion.div>
          <div className="field">
            <label htmlFor="settings-theme-bg">背景底色</label>`,
    "settings-accent-help",
  ],
  [
    `              ??????????????????
            </p>
          </motion.div>
          <div className="field">
            <label>????</label>`,
    `              浅色背景时会自动切换为深色文字以保证可读性。
            </p>
          </motion.div>
          <div className="field">
            <label>桌面壁纸</label>`,
    "settings-bg-help",
  ],
  [
    `              ??????????????????
            </p>
            <div style={{ marginTop: "0.5rem" }}>
              <label htmlFor="settings-wall-opacity"`,
    `              选图后先预览，点「保存」后写入应用目录；取消关闭设置不保存新图。
            </p>
            <div style={{ marginTop: "0.5rem" }}>
              <label htmlFor="settings-wall-opacity"`,
    "settings-wall-help",
  ],
  [
    `                ???? {wallOpacityPct}%`,
    `                壁纸不透明度 {wallOpacityPct}%`,
    "settings-wall-opacity",
  ],
  [
    `            {wallPending ? <p className="help">???????</p> : null}`,
    `            {wallPending ? <p className="help">已选择图片（待保存）</p> : null}`,
    "settings-wall-pending",
  ],
  [
    `              <button type="button" className="btn" onClick={() => setThemeHex(DEFAULT_THEME_ACCENT_HEX)}>
                ??
              </button>`,
    `              <button type="button" className="btn" onClick={() => setThemeHex(DEFAULT_THEME_ACCENT_HEX)}>
                恢复默认色
              </button>`,
    "settings-restore-accent",
  ],
  [
    `              <button type="button" className="btn" onClick={() => setThemeBgHex(DEFAULT_THEME_BACKGROUND_HEX)}>
                ??
              </button>`,
    `              <button type="button" className="btn" onClick={() => setThemeBgHex(DEFAULT_THEME_BACKGROUND_HEX)}>
                恢复默认背景
              </button>`,
    "settings-restore-bg",
  ],
  [
    `              <button type="button" className="btn" onClick={() => void pickWallpaper()}>
                ??
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setWallPending(null);
                  setWallRelDraft(null);
                }}
              >
                ??
              </button>`,
    `              <button type="button" className="btn" onClick={() => void pickWallpaper()}>
                选择本地图片…
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setWallPending(null);
                  setWallRelDraft(null);
                }}
              >
                清除壁纸
              </button>`,
    "settings-wall-btns",
  ],
  [
    `            <button
              type="button"
              className="btn"
              onClick={() => {
                restorePreviewFromSavedConfig();
                setSettingsOpen(false);
              }}
            >
              ??
            </button>
            <button type="button" className="btn primary" onClick={() => void save()}>
              ??
            </button>`,
    `            <button
              type="button"
              className="btn"
              onClick={() => {
                restorePreviewFromSavedConfig();
                setSettingsOpen(false);
              }}
            >
              取消
            </button>
            <button type="button" className="btn primary" onClick={() => void save()}>
              保存
            </button>`,
    "settings-cancel-save",
  ],
  // --- Hidden fields ---
  [
    `<h2>??? ? {hiddenPanel === "item" ? "??" : "??"}</h2>
          <p className="help">????????????????????????????????</p>`,
    `<h2>隐藏字段 · {hiddenPanel === "item" ? "道具" : "任务"}</h2>
          <p className="help">勾选即隐藏该列；不可隐藏的列已禁用。点「应用」后写入配置并重新加载主表。</p>`,
    "hidden-panel",
  ],
  [
    `{h || "(???)"}`,
    `{h || "(空)"}`,
    "hidden-empty-header",
  ],
  [
    `                    <span className="muted">??</span>
                    <input
                      type="checkbox"
                      checked={hidden.has(h)}
                      onChange={(e) => {
                        const nextH = new Set(hiddenPanelDraft ?? [...rawSaved]);`,
    `                    <span className="muted">隐藏</span>
                    <input
                      type="checkbox"
                      checked={hidden.has(h)}
                      onChange={(e) => {
                        const nextH = new Set(hiddenPanelDraft ?? [...rawSaved]);`,
    "hidden-hide-label",
  ],
  [
    `              ??
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={applyDisabled}
              onClick={() =>
                void (async () => {
                  if (!config) return;
                  const key = hiddenPanel === "item" ? "hiddenItemColumns" : "hiddenTaskColumns";`,
    `              取消
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={applyDisabled}
              onClick={() =>
                void (async () => {
                  if (!config) return;
                  const key = hiddenPanel === "item" ? "hiddenItemColumns" : "hiddenTaskColumns";`,
    "hidden-cancel-apply",
  ],
  [
    `              ??
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  const GmtLoginModal`,
    `              应用
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  const GmtLoginModal`,
    "hidden-apply-btn",
  ],
  // --- GMT login ---
  [
    `<h2>GMT ??</h2>
          <p className="help">
            ???????? Garena SSO ???????????? Cookie?
          </p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => void openGmtLoginWindow()}>
              ??
            </button>
            <button type="button" className="btn primary" onClick={() => void completeGmtLogin()}>
              ??
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setGmtLoginModalOpen(false);
                void gmtCloseLoginWindow();
              }}
            >
              ??
            </button>`,
    `<h2>GMT 登录</h2>
          <p className="help">
            将打开内置浏览器完成 Garena SSO 登录；完成后点「完成登录」保存 Cookie。
          </p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => void openGmtLoginWindow()}>
              打开登录
            </button>
            <button type="button" className="btn primary" onClick={() => void completeGmtLogin()}>
              完成登录
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setGmtLoginModalOpen(false);
                void gmtCloseLoginWindow();
              }}
            >
              取消
            </button>`,
    "gmt-login-modal",
  ],
  // --- GoGmt modal (whole block) ---
  [
    `          <h2>? GMT ??</h2>
          <p className="help">
            {repeatVisit ? (
              <>
                ? ? easydone ???? <b>GMT ?????</b> ??????
              </>
            ) : (
              <>
                ? ?? GM ????? <b>Ctrl+V</b> ?????
              </>
            )}
          </p>
          <div className="field">
            <label>????</label>
            <textarea className="bookmark" readOnly value={instruction} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => setGoGmtModal(null)}>
              ???
            </button>`,
    `          <h2>去 GMT 执行（需要手动挂载）</h2>
          <p className="help">
            {repeatVisit ? (
              <>
                ① 请去已打开的 GMT 页面，在 GM 助手输入框 <b>Ctrl+V</b> 粘贴指令（本次不再打开浏览器）。
              </>
            ) : (
              <>
                ① 指令已复制到剪贴板（见下方预览）。② 在 GM 助手输入框 <b>Ctrl+V</b> 粘贴即可。
              </>
            )}
          </p>
          <div className="field">
            <label>指令预览</label>
            <textarea className="bookmark" readOnly value={instruction} />
          </div>
          <motion.div className="btn-row">
            <button type="button" className="btn primary" onClick={() => setGoGmtModal(null)}>
              知道了
            </button>`,
    "gogmt-modal",
  ],
  [
    `    return <div className="empty">?????</div>;
  }

  return (
    <div className="app">`,
    `    return <div className="empty">加载配置…</div>;
  }

  return (
    <div className="app">`,
    "loading-config",
  ],
  // --- Snapshot modals ---
  [
    `<h2>???????</h2>
            <p className="help">
              ???????? {snapshotNameModal.source === "item" ? "??" : "??"} ??? {snapshotNameModal.rowCount}{" "}
              ??????????????????????`,
    `<h2>保存快照到左侧</h2>
            <p className="help">
              将保存当前勾选的 {snapshotNameModal.source === "item" ? "道具" : "任务"} 行（共 {snapshotNameModal.rowCount}{" "}
              行）到左侧快照列表。可修改标题后点「保存」。`,
    "snapshot-save-modal",
  ],
  [
    `<label htmlFor="snapshot-title-input">??</label>`,
    `<label htmlFor="snapshot-title-input">标题</label>`,
    "snapshot-title-label",
  ],
  [
    `<h2>?????</h2>
            <div className="field">
              <label htmlFor="snapshot-rename-input">??</label>`,
    `<h2>重命名快照</h2>
            <div className="field">
              <label htmlFor="snapshot-rename-input">名称</label>`,
    "snapshot-rename-modal",
  ],
  [
    `<h2>????</h2>
            <p className="help">
              ???????<span title={pendingDeleteSnapshot.title}>{pendingDeleteSnapshot.title}</span>??????????`,
    `<h2>删除快照</h2>
            <p className="help">
              确定删除快照「<span title={pendingDeleteSnapshot.title}>{pendingDeleteSnapshot.title}</span>」？此操作不可恢复。`,
    "snapshot-delete-modal",
  ],
  // --- Template modals ---
  [
    `<h2>???????</h2>
            <p className="help">
              ???????? {templateNameModal.items.length} ????????? ID??????????????`,
    `<h2>保存为发送模板</h2>
            <p className="help">
              将保存当前勾选的 {templateNameModal.items.length} 种道具（含物品 ID 与数量）到左侧模板列表。`,
    "template-save-modal",
  ],
  [
    `<label htmlFor="template-title-input">??</label>`,
    `<label htmlFor="template-title-input">标题</label>`,
    "template-title-label",
  ],
  [
    `<h2>???????</h2>
            <motion.div className="field">
              <label htmlFor="template-rename-input">??</label>`,
    `<h2>重命名发送模板</h2>
            <div className="field">
              <label htmlFor="template-rename-input">名称</label>`,
    "template-rename-modal",
  ],
  [
    `<h2>??????</h2>
            <p className="help">
              ?????????<span title={pendingDeleteTemplate.title}>{pendingDeleteTemplate.title}</span>??????????`,
    `<h2>删除发送模板</h2>
            <p className="help">
              确定删除发送模板「<span title={pendingDeleteTemplate.title}>{pendingDeleteTemplate.title}</span>」？此操作不可恢复。`,
    "template-delete-modal",
  ],
  [
    `<h2>???? ? {sendTemplateModal.title}</h2>
            <p className="help">?????????????1?9999??</p>`,
    `<h2>发送模板 · {sendTemplateModal.title}</h2>
            <p className="help">调整每种道具数量（1–9999）后发送。</p>`,
    "send-template-preview-title",
  ],
  [
    `<th>?? ID</th>
                    <th>??/??</th>
                    <th>??</th>`,
    `<th>物品 ID</th>
                    <th>名称/备注</th>
                    <th>数量</th>`,
    "send-template-table-head",
  ],
  [
    `{it.label?.trim() ? it.label : "?"}`,
    `{it.label?.trim() ? it.label : "—"}`,
    "send-template-empty-label",
  ],
  [
    `onClick={() => void sendTemplateItemsNow(m.title, m.draftItems).then((ok) => {
                    if (ok) setSendTemplateModal(null);
                  });
                }}
              >
                ??
              </button>`,
    `onClick={() => void sendTemplateItemsNow(m.title, m.draftItems).then((ok) => {
                    if (ok) setSendTemplateModal(null);
                  });
                }}
              >
                发送
              </button>`,
    "send-template-send-btn",
  ],
  // --- Topbar ---
  [
    `              push("??????????");
            }}
          >
            ??
          </button>
          <button
            type="button"
            className="btn"
            disabled={wizardOpen || !config?.excelWorkspaceRoot?.trim()}
            onClick={() => openTableFilterModal()}
          >
            ??`,
    `              push("已从磁盘重新加载表格");
            }}
          >
            刷新
          </button>
          <button
            type="button"
            className="btn"
            disabled={wizardOpen || !config?.excelWorkspaceRoot?.trim()}
            onClick={() => openTableFilterModal()}
          >
            筛选`,
    "topbar-refresh-filter",
  ],
  [
    `              ???
            </label>`,
    `              可交易
            </label>`,
    "gmt-tradable",
  ],
  [
    `                <span>??????????</span>
                <button type="button" className="btn btn-tiny" onClick={() => clearLog()}>
                  ??
                </button>`,
    `                <span>操作日志（本会话）</span>
                <button type="button" className="btn btn-tiny" onClick={() => clearLog()}>
                  清空
                </button>`,
    "op-log-head",
  ],
  [
    `                  <p className="help muted">??????</p>`,
    `                  <p className="help muted">暂无操作记录</p>`,
    "op-log-empty",
  ],
  [
    `          <button type="button" className="btn" disabled={wizardOpen} onClick={() => setSettingsOpen(true)}>
            ??
          </button>`,
    `          <button type="button" className="btn" disabled={wizardOpen} onClick={() => setSettingsOpen(true)}>
            设置
          </button>`,
    "topbar-settings",
  ],
  [
    `            日志
          </button>`,
    `            日志
          </button>`,
    "topbar-log-ok",
  ],
  // --- Sidebar ---
  [
    `                    ?? ? {srcLabel} ? {rowCount} ? ? {timeStr}`,
    `                    快照 · {srcLabel} · {rowCount} 行 · {timeStr}`,
    "sidebar-snapshot-sub",
  ],
  [
    `                  <span className="card-badge-send">??</span>`,
    `                  <span className="card-badge-send">发送</span>`,
    "sidebar-template-badge",
  ],
  [
    `                  ?? ? {t.items.length} ??? ? {timeStr}`,
    `                  模板 · {t.items.length} 种道具 · {timeStr}`,
    "sidebar-template-sub",
  ],
  [
    `            ??????? / ?????????????????????????????????/???          </p>`,
    `            右键「全部道具 / 全部任务」打开隐藏列；右键表头可冻结列；右键快照/模板可重命名或删除。          </p>`,
    "sidebar-help",
  ],
  // --- Main empty states ---
  [
    `              {wizardOpen
                ? "????????"
                : !config.excelWorkspaceRoot?.trim()
                  ? "???"
                  : loadError
                    ? "??????"
                    : itemAoa == null && taskAoa == null
                      ? excelLoadMessageModeRef.current === "refresh"
                        ? "???"
                        : "????????"
                      : "???"}`,
    `              {wizardOpen
                ? "请先完成设置向导"
                : !config.excelWorkspaceRoot?.trim()
                  ? "无数据"
                  : loadError
                    ? "暂无表格数据"
                    : itemAoa == null && taskAoa == null
                      ? excelLoadMessageModeRef.current === "refresh"
                        ? "刷新中"
                        : "获取本地数据中…"
                      : "无数据"}`,
    "main-empty-states",
  ],
  [
    `                  ???<strong>{itemQtyTotal}</strong>`,
    `                  合计：<strong>{itemQtyTotal}</strong>`,
    "item-qty-summary",
  ],
  // --- Table header sort ---
  [
    `                        <input type="checkbox" disabled aria-label="??" />`,
    `                        <input type="checkbox" disabled aria-label="全选" />`,
    "aria-select-all",
  ],
  [
    '                            title="??"\n                            aria-label={`${name || `?${ci + 1}`} ??`}',
    '                            title="降序"\n                            aria-label={`${name || `列${ci + 1}`} 降序`}',
    "th-sort-desc",
  ],
  [
    '                            title="??"\n                            aria-label={`${name || `?${ci + 1}`} ??`}\n                            onClick={(e) => {\n                              e.stopPropagation();\n                              setTableSort({ colIndex: ci, descending: false });\n                            }}\n                          >\n                            ?',
    '                            title="升序"\n                            aria-label={`${name || `列${ci + 1}`} 升序`}\n                            onClick={(e) => {\n                              e.stopPropagation();\n                              setTableSort({ colIndex: ci, descending: false });\n                            }}\n                          >\n                            ↑',
    "th-sort-asc",
  ],
  [
    '                              <span>{name || `??{ci + 1}`}</span>',
    '                              <span>{name || `列${ci + 1}`}</span>',
    "th-col-fallback",
  ],
  [
    `                              <span className="muted">??</span>
                              <input
                                type="checkbox"
                                checked={hiddenSet.has(name)}
                                onChange={(e) => void toggleHideColumn(name, e.target.checked)}
                                title="??????"`,
    `                              <span className="muted">隐藏</span>
                              <input
                                type="checkbox"
                                checked={hiddenSet.has(name)}
                                onChange={(e) => void toggleHideColumn(name, e.target.checked)}
                                title="隐藏此列"`,
    "th-hide-col",
  ],
  // --- Context menus ---
  [
    `          <button type="button" onClick={() => openSnapshotNameModal()}>
            ???????
          </button>
          {isItemTableView ? (
            <button type="button" onClick={() => openTemplateNameModal()}>
              ???????
            </button>`,
    `          <button type="button" onClick={() => openSnapshotNameModal()}>
            保存选中到左侧
          </button>
          {isItemTableView ? (
            <button type="button" onClick={() => openTemplateNameModal()}>
              保存为发送模板
            </button>`,
    "ctx-save-snapshot-template",
  ],
  [
    `            const label = s.title.length > 22 ? \`\${s.title.slice(0, 20)}?\` : s.title;`,
    `            const label = s.title.length > 22 ? \`\${s.title.slice(0, 20)}…\` : s.title;`,
    "ctx-snapshot-truncate",
  ],
  [
    `                ????{label}?`,
    `                添加到「{label}」`,
    "ctx-append-snapshot",
  ],
  [
    `              if (src === "item") return "? GMT ???";
              if (src === "task") return "? GMT ????";
              return "? GMT ??";`,
    `              if (src === "item") return "发放道具";
              if (src === "task") return "完成任务";
              return "去 GMT 执行";`,
    "ctx-gmt-labels",
  ],
  [
    `            ????
          </button>
          <button
            type="button"
            onClick={() => {
              const { id, title } = snapshotSidebarMenu;
              setSnapshotSidebarMenu(null);
              setPendingDeleteSnapshot({ id, title });
            }}
          >
            ??`,
    `            重命名
          </button>
          <button
            type="button"
            onClick={() => {
              const { id, title } = snapshotSidebarMenu;
              setSnapshotSidebarMenu(null);
              setPendingDeleteSnapshot({ id, title });
            }}
          >
            删除`,
    "snapshot-sidebar-menu",
  ],
  [
    `            ????
          </button>
          <button
            type="button"
            onClick={() => {
              const tpl = config.sendTemplates.find((t) => t.id === templateSidebarMenu.id);
              setTemplateSidebarMenu(null);
              if (tpl) {
                setSendTemplateModal({`,
    `            一键发送
          </button>
          <button
            type="button"
            onClick={() => {
              const tpl = config.sendTemplates.find((t) => t.id === templateSidebarMenu.id);
              setTemplateSidebarMenu(null);
              if (tpl) {
                setSendTemplateModal({`,
    "template-sidebar-send",
  ],
  [
    `            ?????
          </button>
          <button
            type="button"
            onClick={() => {
              const { id, title } = templateSidebarMenu;
              setTemplateSidebarMenu(null);
              setTemplateRenameModal({ id, draft: title });
            }}
          >
            ???`,
    `            编辑并发送
          </button>
          <button
            type="button"
            onClick={() => {
              const { id, title } = templateSidebarMenu;
              setTemplateSidebarMenu(null);
              setTemplateRenameModal({ id, draft: title });
            }}
          >
            重命名`,
    "template-sidebar-edit",
  ],
  [
    `          <button type="button" onClick={() => void applyFreezeThrough(columnHeaderMenu.headerName)}>
            ????
          </button>
          <button type="button" onClick={() => void applyFreezeThrough(null)}>
            ????`,
    `          <button type="button" onClick={() => void applyFreezeThrough(columnHeaderMenu.headerName)}>
            冻结此列
          </button>
          <button type="button" onClick={() => void applyFreezeThrough(null)}>
            取消冻结`,
    "column-freeze-menu",
  ],
  // --- DnD handles (filter section list in App.tsx, not fragment) ---
  [
    `              title="??????"
              aria-grabbed={dragFrom === index}
            >
              ??`,
    `              title="拖拽调整顺序"
              aria-grabbed={dragFrom === index}
            >
              ⋮⋮`,
    "filter-dnd-handle",
  ],
  [
    `              title="????????"
              aria-grabbed={dragFrom === index}
            >
              ??`,
    `              title="拖拽调整区块顺序"
              aria-grabbed={dragFrom === index}
            >
              ⋮⋮`,
    "filter-section-dnd-handle",
  ],
  // --- Generic modal buttons (cancel/save/delete) - apply after specific ---
  [
    `              <button type="button" className="btn" onClick={() => setSendTemplateModal(null)}>
                ??
              </button>`,
    `              <button type="button" className="btn" onClick={() => setSendTemplateModal(null)}>
                取消
              </button>`,
    "send-template-cancel",
  ],
];

function buildManifest(exact, extended) {
  const out = [];
  const seen = new Set();
  for (const [oldStr, newStr] of exact) {
    if (oldStr === newStr || seen.has(oldStr)) continue;
    seen.add(oldStr);
    out.push({ old: oldStr, new: newStr, note: "fix-zh-v2" });
  }
  for (const [oldStr, newStr, note] of extended) {
    if (oldStr === newStr || seen.has(oldStr)) continue;
    seen.add(oldStr);
    out.push({ old: oldStr, new: newStr, note });
  }
  return out;
}

function main() {
  const exact = loadExactFromFixZhV2();
  const manifest = buildManifest(exact, EXTENDED);
  fs.writeFileSync(manifestPath, JSON.stringify({ replacements: manifest }, null, 2), "utf8");

  fs.copyFileSync(appPath, `${appPath}.bak`);
  let s = fs.readFileSync(appPath, "utf8");

  const pairs = manifest.map((r) => [r.old, r.new, r.note]);
  let { s: s1, errors, applied, skipped } = applyReplacements(s, pairs, { strict: true });

  if (errors.length) {
    console.warn("Strict mode: retrying", errors.length, "ambiguous entries with non-strict apply");
    const errOlds = new Set(errors.map((e) => e.old));
    const retryPairs = pairs.filter(([o]) => errOlds.has(o.slice(0, 80)) || errors.some((e) => o.startsWith(e.old)));
    // apply failed ones without strict
    for (const err of errors) {
      const full = pairs.find(([o]) => o.startsWith(err.old) || err.old.startsWith(o.slice(0, 80)));
      if (full && countOccurrences(s1, full[0]) > 0) {
        s1 = s1.split(full[0]).join(full[1]);
        applied.push(`retry:${full[2]}`);
      }
    }
  }

  s1 = fixEmptyBucketLogic(s1);

  // Modal 取消/保存/删除 — unique by handler
  const modalBtnFixes = [
    [
      `onClick={() => void commitSnapshotSave(snapshotNameDraft)}>
                ??
              </button>`,
      `onClick={() => void commitSnapshotSave(snapshotNameDraft)}>
                保存
              </button>`,
    ],
    [
      `onClick={() => void commitSnapshotRename(snapshotRenameModal.draft)}>
                ??
              </button>`,
      `onClick={() => void commitSnapshotRename(snapshotRenameModal.draft)}>
                保存
              </button>`,
    ],
    [
      `                  void removeSnapshot(id);
                }}
              >
                ??
              </button>`,
      `                  void removeSnapshot(id);
                }}
              >
                确认删除
              </button>`,
    ],
    [
      `onClick={() => void commitTemplateSave(templateNameDraft)}>
                ??
              </button>`,
      `onClick={() => void commitTemplateSave(templateNameDraft)}>
                保存
              </button>`,
    ],
    [
      `onClick={() => void commitTemplateRename(templateRenameModal.draft)}>
                ??
              </button>`,
      `onClick={() => void commitTemplateRename(templateRenameModal.draft)}>
                保存
              </button>`,
    ],
    [
      `                  void removeSendTemplate(id);
                }}
              >
                ??
              </button>`,
      `                  void removeSendTemplate(id);
                }}
              >
                确认删除
              </button>`,
    ],
  ];
  for (const [a, b] of modalBtnFixes) {
    if (s1.includes(a)) s1 = s1.replaceAll(a, b);
  }

  // Primary buttons wrongly labeled 取消 (after restore replaced ?? on both buttons)
  const modalPrimaryMislabeled = [
    [
      `onClick={() => void commitSnapshotSave(snapshotNameDraft)}>
                取消
              </button>`,
      `onClick={() => void commitSnapshotSave(snapshotNameDraft)}>
                保存
              </button>`,
    ],
    [
      `onClick={() => void commitSnapshotRename(snapshotRenameModal.draft)}
              >
                取消
              </button>`,
      `onClick={() => void commitSnapshotRename(snapshotRenameModal.draft)}
              >
                保存
              </button>`,
    ],
    [
      `onClick={() => void commitTemplateSave(templateNameDraft)}>
                取消
              </button>`,
      `onClick={() => void commitTemplateSave(templateNameDraft)}>
                保存
              </button>`,
    ],
    [
      `onClick={() => void commitTemplateRename(templateRenameModal.draft)}>
                取消
              </button>`,
      `onClick={() => void commitTemplateRename(templateRenameModal.draft)}>
                保存
              </button>`,
    ],
    [
      `                  void removeSnapshot(id);
                }}
              >
                取消
              </button>`,
      `                  void removeSnapshot(id);
                }}
              >
                确认删除
              </button>`,
    ],
    [
      `                  void removeSendTemplate(id);
                }}
              >
                取消
              </button>`,
      `                  void removeSendTemplate(id);
                }}
              >
                确认删除
              </button>`,
    ],
  ];
  for (const [a, b] of modalPrimaryMislabeled) {
    if (s1.includes(a)) s1 = s1.replaceAll(a, b);
  }

  // Snapshot/template modal cancel buttons (shared pattern)
  s1 = s1.replaceAll(
    `                ??
              </button>
              <button type="button" className="btn primary" onClick={() => void commitSnapshotSave`,
    `                取消
              </button>
              <button type="button" className="btn primary" onClick={() => void commitSnapshotSave`,
  );
  s1 = s1.replaceAll(
    `                ??
              </button>
              <button type="button" className="btn primary" onClick={() => void commitSnapshotRename`,
    `                取消
              </button>
              <button type="button" className="btn primary" onClick={() => void commitSnapshotRename`,
  );
  s1 = s1.replaceAll(
    `                ??
              </button>
              <button type="button" className="btn primary" onClick={() => void commitTemplateSave`,
    `                取消
              </button>
              <button type="button" className="btn primary" onClick={() => void commitTemplateSave`,
  );
  s1 = s1.replaceAll(
    `                ??
              </button>
              <button type="button" className="btn primary" onClick={() => void commitTemplateRename`,
    `                取消
              </button>
              <button type="button" className="btn primary" onClick={() => void commitTemplateRename`,
  );
  s1 = s1.replaceAll(
    `                ??
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const id = pendingDeleteSnapshot.id`,
    `                取消
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const id = pendingDeleteSnapshot.id`,
  );
  s1 = s1.replaceAll(
    `                ??
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const id = pendingDeleteTemplate.id`,
    `                取消
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const id = pendingDeleteTemplate.id`,
  );

  s1 = applyPass2Fixes(s1);
  s1 = spliceFilterModals(s1);

  const remaining = (s1.match(/\?\?\?/g) || []).length;
  fs.writeFileSync(appPath, s1, "utf8");

  console.log("Applied:", applied.length, "Skipped (already ok):", skipped.length);
  if (errors.length) console.log("Ambiguous (retried):", errors.length);
  console.log("Remaining ??? substrings:", remaining);
  console.log("Wrote manifest:", manifestPath);
  console.log("Backup:", `${appPath}.bak`);

  if (remaining > 0) {
    const lines = s1.split("\n");
    lines.forEach((line, i) => {
      if (line.includes("???")) console.log(`${i + 1}: ${line.trim().slice(0, 120)}`);
    });
    process.exit(1);
  }
}

main();
