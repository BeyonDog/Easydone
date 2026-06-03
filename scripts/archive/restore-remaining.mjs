// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = new URL("../src/App.tsx", import.meta.url);
let s = fs.readFileSync(p, "utf8");
const d = "motion";
const pairs = [
  ["<label>????</label>\n            <textarea className=\"bookmark\" readOnly value={instruction} />", "<label>指令预览</label>\n            <textarea className=\"bookmark\" readOnly value={instruction} />"],
  [
    `          <${d} className="btn-row">
            <button type="button" className="btn primary" onClick={() => setGoGmtModal(null)}>
              ???
            </button>
          </div>`,
    `          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => setGoGmtModal(null)}>
              知道了
            </button>
          </div>`,
  ],
  ["return <motion className=\"empty\">??????/motion>;", "return <div className=\"empty\">加载配置…</div>;"],
  ["<h2>????????/h2>", "<h2>保存快照到左侧</h2>"],
  ["<h2>??????/h2>", "<h2>重命名快照</h2>"],
  [
    "<h2>????</h2>\n            <p className=\"help\">\n              ?????????span title={pendingDeleteSnapshot.title}>{pendingDeleteSnapshot.title}</span>????????????            </p>",
    "<h2>删除快照</h2>\n            <p className=\"help\">\n              确定删除快照「<span title={pendingDeleteSnapshot.title}>{pendingDeleteSnapshot.title}</span>」？此操作不可恢复。\n            </p>",
  ],
  [
    '???{snapshotNameModal.source === "item" ? "??" : "??"}??? ???{snapshotNameModal.rowCount}{" "}\n              ?????????????????????            </p>',
    '将保存当前勾选的 {snapshotNameModal.source === "item" ? "道具" : "任务"} 行（共 {snapshotNameModal.rowCount}{" "}\n              行）到左侧快照列表。可修改标题后点「保存」。\n            </p>',
  ],
  ['<label htmlFor="snapshot-title-input">????</label>', '<label htmlFor="snapshot-title-input">标题</label>'],
  ['<label htmlFor="snapshot-rename-input">??</label>', '<label htmlFor="snapshot-rename-input">标题</label>'],
  ['              push("??????????");', '              push("已从磁盘重新加载表格");'],
  ['title="??????????"', 'title="已保存的类型备注筛选"'],
  ['<span className="topbar-filter-summary-label">????</span>', '<span className="topbar-filter-summary-label">类型备注</span>'],
  ['{gmtSessionChecking ? "GMT?" : gmtLoggedIn ? "GMT ???" : "GMT ???"}', '{gmtSessionChecking ? "GMT…" : gmtLoggedIn ? "GMT 已登录" : "GMT 未登录"}'],
  ['{gmtLoggedIn ? "????" : "??"}', '{gmtLoggedIn ? "重新登录" : "登录"}'],
  ['<option value="">??</option>', '<option value="">区服</option>'],
  ['placeholder="?? ID"', 'placeholder="账号 ID"'],
  ['              ????            </label>', '              可交易\n            </label>'],
  ['                ? "????????"', '                ? "请先完成设置向导"'],
  ['                  ? "????\n                  : loadError', '                  ? "无数据"\n                  : loadError'],
  ['                    ? "??????"', '                    ? "暂无表格数据"'],
  ['                        ? "????\n                        : "?????????', '                        ? "刷新中"\n                        : "获取本地数据中…"'],
  ['                      : "????}', '                      : "无数据"}'],
  ['                  ????strong>{itemQtyTotal}</strong>', '                  合计：<strong>{itemQtyTotal}</strong>'],
];
for (const [a, b] of pairs) {
  if (s.includes(a)) s = s.replaceAll(a, b);
  else console.warn("skip", JSON.stringify(a.slice(0, 50)));
}
// button labels ?? -> 取消/保存 where still broken in modals - fix common patterns
s = s.replaceAll("                ??\n              </button>\n              <button type=\"button\" className=\"btn primary\" onClick={() => void commitSnapshotSave", "                取消\n              </button>\n              <button type=\"button\" className=\"btn primary\" onClick={() => void commitSnapshotSave");
s = s.replaceAll("                ??\n              </button>\n              <button type=\"button\" className=\"btn primary\" onClick={() => void commitSnapshotRename", "                取消\n              </button>\n              <button type=\"button\" className=\"btn primary\" onClick={() => void commitSnapshotRename");
s = s.replaceAll("                ??\n              </button>\n              <button\n                type=\"button\"\n                className=\"btn primary\"\n                onClick={() => {\n                  const id = pendingDeleteSnapshot.id", "                取消\n              </button>\n              <button\n                type=\"button\"\n                className=\"btn primary\"\n                onClick={() => {\n                  const id = pendingDeleteSnapshot.id");
s = s.replaceAll("                ????\n              </button>\n            </div>\n          </div>\n        </div>\n      ) : null}\n      {itemFilterModalOpen", "                删除\n              </button>\n            </div>\n          </div>\n        </div>\n      ) : null}\n      {itemFilterModalOpen");
// topbar refresh/filter - fix if still ??
s = s.replace(/>\s*\?\?\s*<\/button>\s*<button[^>]*openTableFilterModal/s, ">刷新</button>\n          <button\n            type=\"button\"\n            className=\"btn\"\n            disabled={wizardOpen || !config?.excelWorkspaceRoot?.trim()}\n            onClick={() => openTableFilterModal");
fs.writeFileSync(p, s, "utf8");
console.log("done");

