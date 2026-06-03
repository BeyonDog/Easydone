// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = new URL("../src/App.tsx", import.meta.url);
let s = fs.readFileSync(p, "utf8");

const pairs = [
  ["<h3 className=\"item-filter-h3\">????/h3>", "<h3 className=\"item-filter-h3\">防护值</h3>"],
  ["<p className=\"help muted\">???????????????????/p>", "<p className=\"help muted\">当前表无「防护值」列，该条件不可用。</p>"],
  ["<span>???????????</span>", "<span>无防护值（单元格为空）</span>"],
  ["<span>????????</span>", "<span>范围内（含边界）</span>"],
  [
    `                <button type="button" className="btn" onClick={() => setItemFilterDraft((d) => clearItemFilterSelectionsKeepOrder(d))}>
                  ??
                </button>
                <button type="button" className="btn" onClick={() => dismissItemFilterModal()}>
                  ??
                </button>
                <button type="button" className="btn primary" onClick={() => void commitItemFilterSave()}>
                  ??`,
    `                <button type="button" className="btn" onClick={() => setItemFilterDraft((d) => clearItemFilterSelectionsKeepOrder(d))}>
                  清空
                </button>
                <button type="button" className="btn" onClick={() => dismissItemFilterModal()}>
                  取消
                </button>
                <button type="button" className="btn primary" onClick={() => void commitItemFilterSave()}>
                  保存`,
  ],
  ["<h2>???????</h2>\n              <motion className=\"filter-quick-search-row\">", "<h2>筛选 — 任务</h2>\n              <div className=\"filter-quick-search-row\">"],
  ['placeholder="Ctrl+F ?????????Enter ????', 'placeholder="Ctrl+F 快速筛选任务类型（Enter 应用）"'],
  ["<h3 className=\"item-filter-h3\">?????TaskType??/h3>", "<h3 className=\"item-filter-h3\">任务类型（TaskType）</h3>"],
  ["<p className=\"help muted\">?????TaskType??????????????????/p>", "<p className=\"help muted\">当前表无「TaskType」或「任务类型」列，该条件不可用。</p>"],
  ["<h3 className=\"item-filter-h3\">????/h3>\n                        {taskFilterColIdx.ch", "<h3 className=\"item-filter-h3\">任务链</h3>\n                        {taskFilterColIdx.ch"],
  ["<p className=\"help muted\">???????????????????/p>\n                      ) : (\n                        <div className=\"item-filter-scroll", "<p className=\"help muted\">当前表无「任务链」列，该条件不可用。</p>\n                      ) : (\n                        <div className=\"item-filter-scroll"],
  ["                              ??????\n                            </button>", "                              恢复默认排序\n                            </button>"],
  ["            ???          </button>", "            筛选\n          </button>"],
  ['{gmtSessionChecking ? "GMT?? : gmtLoggedIn ? "GMT ???? : "GMT ????}', '{gmtSessionChecking ? "GMT…" : gmtLoggedIn ? "GMT 已登录" : "GMT 未登录"}'],
  ['{gmtLoggedIn ? "????" : "??"}', '{gmtLoggedIn ? "重新登录" : "登录"}'],
];

for (const [a, b] of pairs) {
  if (!s.includes(a)) {
    console.warn("missing:", JSON.stringify(a.slice(0, 80)));
    continue;
  }
  s = s.replaceAll(a, b);
}

// defense min/max labels
s = s.replace(
  /<label>\s*\?\?\?\s*<input\s*\n\s*type="number"\s*\n\s*className="bookmark item-filter-num"\s*\n\s*disabled=\{!itemFilterDraft\.defenseRange\}\s*\n\s*value=\{itemFilterDraft\.defenseMin/,
  `<label>
                              最小
                              <input
                                type="number"
                                className="bookmark item-filter-num"
                                disabled={!itemFilterDraft.defenseRange}
                                value={itemFilterDraft.defenseMin`,
);

s = s.replace(
  /<label>\s*\?\?\?\s*<input\s*\n\s*type="number"\s*\n\s*className="bookmark item-filter-num"\s*\n\s*disabled=\{!itemFilterDraft\.defenseRange\}\s*\n\s*value=\{itemFilterDraft\.defenseMax/,
  `<label>
                              最大
                              <input
                                type="number"
                                className="bookmark item-filter-num"
                                disabled={!itemFilterDraft.defenseRange}
                                value={itemFilterDraft.defenseMax`,
);

const taskHelpOld =
  /选项随当前表格数据更新。两列条件为「且」；同列多选为「或」[\s\S]*?taskFilterSectionOrder/;
const taskHelpNew = `选项随当前表格数据更新。两列条件为「且」；同列多选为「或」。选项行左侧 ⋮⋮ 可拖拽调整选项顺序；区块行左侧 ⋮⋮ 可拖拽调整任务类型 / 任务链顺序，保存后写入配置。**Ctrl+F** 在快捷框输入后按 Enter，等同只勾选一项任务类型并保存。
              </p>
              <FilterSectionDnDList<TaskFilterSectionId>
                order={taskFilterSectionOrder}`;
s = s.replace(
  /<p className="help modal-filter-help">\s*[\?\s\*Ctrl\+F\*]+[\s\S]*?<\/p>\s*<FilterSectionDnDList<TaskFilterSectionId>\s*order=\{taskFilterSectionOrder\}/,
  `<p className="help modal-filter-help">
                ${taskHelpNew.split("\n").join("\n")}`,
);

// fix accidental motion in task chain scroll container
s = s.replaceAll('className="item-filter-scroll item-filter-scroll--flex"', 'className="item-filter-scroll item-filter-scroll--flex"');
s = s.replaceAll("<" + "motion className=\"item-filter-scroll", "<" + "div className=\"item-filter-scroll");

fs.writeFileSync(p, s, "utf8");
console.log("restore-strings done");

