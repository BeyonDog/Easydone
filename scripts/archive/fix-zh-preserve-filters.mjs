// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(root, "../src/App.tsx");
const fragPath = path.join(root, "filter-modals-fragment.txt");

let s = fs.readFileSync(appPath, "utf8");
const frag = fs.readFileSync(fragPath, "utf8").trim();

const startMark = "      {itemFilterModalOpen && config ? (";
const endMark = "      <GoGmtModalView />";
const i0 = s.indexOf(startMark);
const i1 = s.indexOf(endMark);
if (i0 < 0 || i1 < 0) throw new Error("markers missing " + i0 + " " + i1);

const head = s.slice(0, i0);
const tail = s.slice(i1);
let body = head + frag + "\n      " + tail;

const pairs = [
  ['/** ????? Excel ???????????? */', '/** 不可隐藏的 Excel 表头（列隐藏面板中禁用） */'],
  ['const NON_HIDEABLE_ITEM_HEADERS = new Set(["??ID"]);', 'const NON_HIDEABLE_ITEM_HEADERS = new Set(["物品ID"]);'],
  ['const NON_HIDEABLE_TASK_HEADERS = new Set(["??ID"]);', 'const NON_HIDEABLE_TASK_HEADERS = new Set(["任务ID"]);'],
  ['const TYPE_REMARK_PRIORITY = ["??", "??", "??", "??", "??"];', 'const TYPE_REMARK_PRIORITY = ["武器", "防具", "食材", "材料", "藏品"];'],
  ['const QUALITY_LABEL_ORDER = ["???", "?", "?", "?", "?", "?"];', 'const QUALITY_LABEL_ORDER = ["低品质", "绿", "蓝", "紫", "金", "红"];'],
  ['push(`? Excel ??: ${msg}`);', 'push(`读 Excel 失败: ${msg}`);'],
  ['push(`GMT ??????: ${e}`);', 'push(`GMT 登录检查失败: ${e}`);'],
  ['push("GMT ???");', 'push("GMT 已登录");'],
  ['push(`GMT ????: ${e}`);', 'push(`GMT 登录失败: ${e}`);'],
  ['push("GMT ???");', 'push("GMT 已退出");'],
  ['push(`?? GMT ?????: ${e}`);', 'push(`打开 GMT 登录窗失败: ${e}`);'],
  ['push("????????????????");', 'push("请填写防护值范围的最小值或最大值");'],
  ['push("????????????????");', 'push("防护值范围：最小值不能大于最大值");'],
  ['void saveItemTableFilterToDisk(nextFilter).catch((e) => push(`??????: ${e}`));', 'void saveItemTableFilterToDisk(nextFilter).catch((e) => push(`筛选保存失败: ${e}`));'],
  ['void saveTaskTableFilterToDisk(nextFilter).catch((e) => push(`??????: ${e}`));', 'void saveTaskTableFilterToDisk(nextFilter).catch((e) => push(`筛选保存失败: ${e}`));'],
  ['push("???????????");', 'push("当前表无「类型备注」列");'],
  ['push("???????????");', 'push("无匹配的类型备注筛选项");'],
  ['if (ambiguous) push(`?????????${key}?`);', 'if (ambiguous) push(`多个匹配，已选用「${key}」`);'],
  ['push("?????TaskType?????????");', 'push("当前表无「TaskType」或「任务类型」列");'],
  ['push(headerName ? "??????" : "?????");', 'push(headerName ? "已冻结到此列" : "已取消冻结");'],
  ['push("?????");', 'push("请先勾选行");'],
  ['push("????????????");', 'push("记录类型不匹配，无法追加");'],
  ['push("????????????");', 'push("目标快照无表头，无法追加");'],
  ['push("???????????");', 'push("表头与目标快照不一致");'],
  ['push("???????????");', 'push("请先配置「物品备注」列");'],
  ['push(`??????${snap.title}?`);', 'push(`已追加快照「${snap.title}」`);'],
  ['const label = source === "item" ? "??" : "??";', 'const label = source === "item" ? "道具" : "任务";'],
  ['push(`???????${label}? ? ${rowCount} ??`);', 'push(`已保存到左侧（${label}表 · ${rowCount} 行）`);'],
  ['push("??????");', 'push("名称不能为空");'],
  ['push("????");', 'push("已重命名");'],
  ['push(`????? ${taskId}`);', 'push(`已完成任务 ${taskId}`);'],
  ['push(`GMT ????: ${result.message}`);', 'push(`GMT 发送失败: ${result.message}`);'],
  ['push(`GMT ????: ${e}`);', 'push(`GMT 发送失败: ${e}`);'],
  ['push("??????");', 'push("无法生成指令");'],
  ['push(`????: ${e}`);', 'push(`复制失败: ${e}`);'],
  ['{ex || "???"}', '{ex || "未选择"}'],
  ['pickFolder("?? Excel ???")', 'pickFolder("选择 Excel 工作区")'],
  ['pickFolder("Excel ???")', 'pickFolder("Excel 工作区")'],
  ['<h2>????</h2>', '<h2>设置向导</h2>'],
  ['<label>Excel ???</label>', '<label>Excel 工作区</label>'],
  ['<h2>??</h2>', '<h2>设置</h2>'],
  ['<h2>???????</h2>', '<h2>保存快照到左侧</h2>'],
  ['<h2>?????</h2>', '<h2>重命名快照</h2>'],
  ['<h2>????</h2>', '<h2>删除快照</h2>'],
  ['<label htmlFor="snapshot-title-input">??</label>', '<label htmlFor="snapshot-title-input">标题</label>'],
  ['<label htmlFor="snapshot-rename-input">??</label>', '<label htmlFor="snapshot-rename-input">标题</label>'],
  ['{gmtSessionChecking ? "GMT?" : gmtLoggedIn ? "GMT ???" : "GMT ???"}', '{gmtSessionChecking ? "GMT…" : gmtLoggedIn ? "GMT 已登录" : "GMT 未登录"}'],
  ['{gmtLoggedIn ? "????" : "??"}', '{gmtLoggedIn ? "重新登录" : "登录"}'],
  ['<option value="">??</option>', '<option value="">区服</option>'],
  ['placeholder="?? ID"', 'placeholder="账号 ID"'],
  ['<div className="card-title">????</div>', '<div className="card-title">全部道具</div>'],
  ['<motion.div className="card-title">????</motion.div>', '<div className="card-title">全部任务</div>'],
  ['<div className="card-title">????</div>\n            <div className="card-sub">Mission', '<div className="card-title">全部任务</div>\n            <div className="card-sub">Mission'],
  ['Item.xlsx ? Item', 'Item.xlsx · Item'],
  ['Mission.xlsx ? Task', 'Mission.xlsx · Task'],
  ['? "????????"', '? "请先完成设置向导"'],
  ['? "???"', '? "无数据"'],
  ['? "??????"', '? "暂无表格数据"'],
  ['? "???"', '? "刷新中"'],
  [': "????????"', ': "获取本地数据中…"'],
  ['aria-label="??"', 'aria-label="全选"'],
  ['title="??"', 'title="升序"'],
  ['title="?????"', 'title="降序"'],
  ['title="???????"', 'title="取消排序"'],
  ['if (src === "item") return "????";', 'if (src === "item") return "去 GMT 发道具";'],
  ['if (src === "task") return "????";', 'if (src === "task") return "去 GMT 完成任务";'],
  ['return "??GMT ??";', 'return "去 GMT 执行";'],
  ['const defaultTitle = `?? ${new Date', 'const defaultTitle = `快照 ${new Date'],
  ['}??`);', '}行）`);'],
  ['`${s.title.slice(0, 20)}?`', '`${s.title.slice(0, 20)}…`'],
  ['`????{label}?`', '`添加到「{label}」`'],
  ['title="??????????"', 'title="已保存的类型备注筛选"'],
  ['<span className="topbar-filter-summary-label">????</span>', '<span className="topbar-filter-summary-label">类型备注</span>'],
  ['              ????\n            </button>\n            onClick={() => openTableFilterModal()}', '              刷新\n            </button>\n            onClick={() => openTableFilterModal()}'],
  ['              ????\n            </button>\n          {savedItemTypeRemarkKey', '              筛选\n            </button>\n          {savedItemTypeRemarkKey'],
  ['????????/ ????????????????????????????????????????????????????', '右键「全部道具 / 全部任务」卡片打开隐藏列；右键表头可冻结列；右键快照或发送模板可重命名/删除。'],
  ['<h2>? GMT ??</h2>', '<h2>去 GMT 执行</h2>'],
  ['<label>????</label>', '<label>指令预览</label>'],
  ['return <motion.div className="empty">?????</motion.div>', 'return <div className="empty">加载配置…</div>'],
  ['return <div className="empty">?????</motion.div>', 'return <motion.div className="empty">加载配置…</div>'],
];

body = body.replace(/if \(k === "\?"\)/g, 'if (k === "空")');
body = body.replace(/s\.has\("\?"\)/g, 's.has("空")');
body = body.replace(/s\.delete\("\?"\)/g, 's.delete("空")');
body = body.replace(/\["\?"\]/g, '["空"]');
body = body.replace(/if \(k === "\?"\)/g, 'if (k === "空")');

for (const [a, b] of pairs) {
  if (a !== b) body = body.split(a).join(b);
}

body = body.replaceAll("<" + "motion.div", "<" + "div").replaceAll("</" + "motion.div>", "</" + "div>");

// snapshot delete modal
if (body.includes("pendingDeleteSnapshot.title}")) {
  body = body.replace(
    "<h2>????</h2>\n            <p className=\"help\">\n              ???????<span title={pendingDeleteSnapshot.title}>{pendingDeleteSnapshot.title}</span>",
    "<h2>删除快照</h2>\n            <p className=\"help\">\n              确定删除快照「<span title={pendingDeleteSnapshot.title}>{pendingDeleteSnapshot.title}</span>」？此操作不可恢复。",
  );
}

// snapshot name modal help
body = body.replace(
  /将保存当前勾选的 \{snapshotNameModal\.source === "item" \? "道具" : "任务"\} 行（共 \{snapshotNameModal\.rowCount\}\{" "\}\n              行）到左侧快照列表。可修改标题后点「保存」。/,
  '将保存当前勾选的 {snapshotNameModal.source === "item" ? "道具" : "任务"} 行（共 {snapshotNameModal.rowCount}{" "}\n              行）到左侧快照列表。可修改标题后点「保存」。',
);

fs.writeFileSync(appPath, body, "utf8");
const left = (body.match(/\?\?\?/g) || []).length;
console.log("remaining ???", left);

