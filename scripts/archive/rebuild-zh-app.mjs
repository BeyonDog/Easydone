// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(root, "src/App.tsx");
const fragmentPath = path.join(root, "scripts/filter-modals-fragment.txt");

let s = fs.readFileSync(appPath, "utf8");

// Splice filter modals from good fragment
const fragment = fs.readFileSync(fragmentPath, "utf8").trim();
const startMark = "      {itemFilterModalOpen && config ? (";
const endMark = "      ) : null}\n      {taskFilterModalOpen && config ? (";
const endMark2 = "      ) : null}\n      <header className=\"topbar\">";

const i0 = s.indexOf(startMark);
const i1 = s.indexOf(endMark);
const i2 = s.indexOf(endMark2);
if (i0 >= 0 && i1 > i0 && i2 > i1) {
  const taskStart = i1;
  const taskEnd = i2;
  const itemPart = fragment.split(endMark)[0];
  const taskPart = endMark + fragment.split(endMark).slice(1).join(endMark);
  s = s.slice(0, i0) + itemPart + "\n" + taskPart + s.slice(taskEnd);
  console.log("spliced filter modals");
} else {
  console.warn("filter modal splice skipped", i0, i1, i2);
}

const pairs = [
  ["/** ??Excel ????????????? */", "/** 不可隐藏的 Excel 表头（列隐藏面板中禁用） */"],
  ['const NON_HIDEABLE_ITEM_HEADERS = new Set(["??ID"]);', 'const NON_HIDEABLE_ITEM_HEADERS = new Set(["物品ID"]);'],
  ['const NON_HIDEABLE_TASK_HEADERS = new Set(["??ID"]);', 'const NON_HIDEABLE_TASK_HEADERS = new Set(["任务ID"]);'],
  ['const TYPE_REMARK_PRIORITY = ["??", "??", "??", "??", "??"];', 'const TYPE_REMARK_PRIORITY = ["武器", "防具", "食材", "材料", "藏品"];'],
  ['const hasEmpty = s.has("?");', 'const hasEmpty = s.has("空");'],
  ['if (hasEmpty) s.delete("?");', 'if (hasEmpty) s.delete("空");'],
  ['...(hasEmpty ? ["?"] : [])', '...(hasEmpty ? ["空"] : [])'],
  ['const QUALITY_LABEL_ORDER = ["???", "?", "?", "?", "?", "?"];', 'const QUALITY_LABEL_ORDER = ["低品质", "绿", "蓝", "紫", "金", "红"];'],
  ['if (k === "?") {', 'if (k === "空") {'],
  ['title="????"', 'title="拖拽调整顺序"'],
  ["              ??\n            </span>", "              ⋮⋮\n            </span>"],
  ['title="????????"', 'title="拖拽调整区块顺序"'],
  ["push(`?? Excel ??: ${msg}`);", "push(`读 Excel 失败: ${msg}`);"],
  ["push(`GMT ??????: ${e}`);", "push(`GMT 登录检查失败: ${e}`);"],
  ['push("GMT ????");', 'push("GMT 已登录");'],
  ["push(`GMT ????: ${e}`);", "push(`GMT 登录失败: ${e}`);"],
  ['push("GMT ???");', 'push("GMT 已退出");'],
  ["push(`?? GMT ??????: ${e}`);", "push(`打开 GMT 登录窗失败: ${e}`);"],
  ['push("请填写防护值范围的最小值或最大值");', 'push("请填写防护值范围的最小值或最大值");'],
  ["push(\"????????????????\");", 'push("请填写防护值范围的最小值或最大值");'],
  ["push(\"????????????????\");", 'push("防护值范围：最小值不能大于最大值");'],
  ["void saveItemTableFilterToDisk(nextFilter).catch((e) => push(`??????: ${e}`));", "void saveItemTableFilterToDisk(nextFilter).catch((e) => push(`筛选保存失败: ${e}`));"],
  ["void saveTaskTableFilterToDisk(nextFilter).catch((e) => push(`??????: ${e}`));", "void saveTaskTableFilterToDisk(nextFilter).catch((e) => push(`筛选保存失败: ${e}`));"],
  ['push("当前表无「类型备注」列");', 'push("当前表无「类型备注」列");'],
  ["push(\"???????????\");", 'push("无匹配的类型备注筛选项");'],
  ["if (ambiguous) push(`?????????${key}?`);", "if (ambiguous) push(`多个匹配，已选用「${key}」`);"],
  ['push("当前表无「TaskType」或「任务类型」列");', 'push("当前表无「TaskType」或「任务类型」列");'],
  ["push(\"?????TaskType?????????\");", 'push("当前表无「TaskType」或「任务类型」列");'],
  ['push("无匹配的任务类型筛选项");', 'push("无匹配的任务类型筛选项");'],
  ["push(headerName ? \"??????\" : \"?????\");", 'push(headerName ? "已冻结到此列" : "已取消冻结");'],
  ["push(\"?????\");", 'push("请先勾选行");'],
  ["push(\"???????????????\");", 'push("记录类型不匹配，无法追加");'],
  ["push(\"???????????????\");", 'push("目标快照无表头，无法追加");'],
  ["push(\"???????????\");", 'push("表头与目标快照不一致");'],
  ["push(\"??????????????\");", 'push("请先配置「物品备注」列");'],
  ["push(`?????${snap.title}?`);", "push(`已追加快照「${snap.title}」`);"],
  ["push(`???????${label}? ? ${rowCount} ??`);", "push(`已保存到左侧（${label}表 · ${rowCount} 行）`);"],
  ["push(\"??????\");", 'push("名称不能为空");'],
  ['push("已重命名");', 'push("已重命名");'],
  ["push(\"????\");", 'push("已重命名");'],
  ["push(\"?????ID??\");", 'push("所选行物品 ID 为空");'],
  ["push(`????${rewardItems.length} ??????${idxs.length} ??`);", "push(`已发送 ${rewardItems.length} 种物品（共 ${idxs.length} 行）`);"],
  ["push(`GMT ????: ${result.message}`);", "push(`GMT 发送失败: ${result.message}`);"],
  ["push(`GMT ????: ${e}`);", "push(`GMT 发送失败: ${e}`);"],
  ["push(`??????${taskId}`);", "push(`已完成任务 ${taskId}`);"],
  ["push(\"???????\");", 'push("无法生成指令");'],
  ["push(`???????: ${e}`);", "push(`复制失败: ${e}`);"],
  ['push("? ?????????????????? ?? GMT ??????");', 'push("① 请先登录 GMT 并填写区服与账号 ID");'],
  ['push("? ?????????????????? ?? GMT ??????????? GMT ??????");', 'push("② 在 GMT 命令列表页按 Ctrl+V 粘贴指令");'],
  ["push(`???????? ${e}`);", "push(`壁纸加载失败 ${e}`);"],
  ['setErr("??? Excel ????");', 'setErr("请配置 Excel 工作区");'],
  ["setErr(`Excel ???????\\n${ip}\\n${mp}`);", "setErr(`Excel 文件未找到\\n${ip}\\n${mp}`);"],
  ["<h2>????</h2>", "<h2>设置向导</h2>"],
  ["<p className=\"help\">?? Excel ??????????? Excel\\\\Item.xlsx ? Excel\\\\Mission.xlsx??</p>", "<p className=\"help\">选择 Excel 工作区根目录，应包含 Excel\\\\Item.xlsx 与 Excel\\\\Mission.xlsx。</p>"],
  ["<label>Excel ????</label>", "<label>Excel 工作区</label>"],
  ['<motion.div className="path">{ex || "???"}</motion.div>', '<motion.div className="path">{ex || "未选择"}</motion.div>'],
  ['<div className="path">{ex || "???"}</motion.div>', '<div className="path">{ex || "未选择"}</motion.div>'],
  ['pickFolder("?? Excel ????")', 'pickFolder("选择 Excel 工作区")'],
  ["              ?????\n            </button>", "              选择文件夹\n            </button>"],
  ["              ?????\n            </button>\n          </div>\n          <div className=\"btn-row\">", "              下一步\n            </button>\n          </div>\n          <div className=\"btn-row\">"],
  ['title: "??????"', 'title: "选择壁纸"'],
  ['setErr("????????");', 'setErr("壁纸文件过大");'],
  ['setErr("???????????????");', 'setErr("壁纸格式不支持或读取失败");'],
  ['setErr("Excel ????????");', 'setErr("Excel 工作区无效");'],
  ['setErr(`Excel ??????\\n${ip}\\n${mp}`);', 'setErr(`Excel 文件未找到\\n${ip}\\n${mp}`);'],
  ['pickFolder("Excel ????")', 'pickFolder("Excel 工作区")'],
  ['<label htmlFor="settings-theme-accent">?????</label>', '<label htmlFor="settings-theme-accent">主题强调色</label>'],
  ["                ??????              </button>", "                恢复默认\n              </button>"],
  ["              ????????????????????            </p>", "              用于按钮、链接等强调色。\n            </p>"],
  ['<label htmlFor="settings-theme-bg">?????</label>', '<label htmlFor="settings-theme-bg">背景底色</label>'],
  ["                ??????\n              </button>", "                恢复默认\n              </button>"],
  ["              ???????????????????????            </p>", "              页面与输入区底色，其它表面由此衍生。\n            </p>"],
  ["<label>??????</label>", "<label>桌面壁纸</label>"],
  ["                ????????              </button>", "                选择图片\n              </button>"],
  ["                ????\n              </button>", "                清除\n              </button>"],
  ["              ?????????????????????????????????????????????            </p>", "              壁纸保存在应用配置目录，透明度可调。\n            </p>"],
  ["                ???????{wallOpacityPct}%", "                不透明度 {wallOpacityPct}%"],
  ["{wallPending ? <p className=\"help\">???????????????</p> : null}", "{wallPending ? <p className=\"help\">正在处理壁纸…</p> : null}"],
  ["<h2>???? ? {hiddenPanel === \"item\" ? \"???\" : \"???\"}</h2>", "<h2>隐藏列 · {hiddenPanel === \"item\" ? \"道具\" : \"任务\"}</h2>"],
  ["<p className=\"help\">?????????????????????????????????????????????????????????</p>", "<p className=\"help\">取消勾选以隐藏列；应用后会重新加载表格并可能短暂显示「刷新中」。</p>"],
  ['<span className="muted">????</span>', '<span className="muted">不可隐藏</span>'],
  ["            ???????????? Garena SSO ????????????????????          </p>", "            将打开浏览器完成 Garena SSO 登录，登录成功后自动保存 Cookie。\n          </p>"],
  ["              ??????\n            </button>", "              打开登录\n            </button>"],
  ["              ????\n            </button>", "              取消\n            </button>"],
  ['? ?????????????????? <b>?? GMT ?????</b>???????????????', '① 在 easydone 顶栏完成 <b>GMT 登录与区服</b> 配置后发送。'],
  ['? ?????????????????? ? GM ??? <b>Ctrl+V</b> ?????', '② 或在 GM 工具页使用 <b>Ctrl+V</b> 粘贴指令。'],
  ["<label>????</label>", "<label>可交易</label>"],
  ["              ???\n            </label>", "              可交易\n            </label>"],
  ['return <div className="empty">?????</div>;', 'return <motion.div className="empty">加载配置…</motion.div>;'.replace("motion", "motion")],
  ["return <motion.div className=\"empty\">?????</motion.div>;", 'return <div className="empty">加载配置…</div>;'],
  ["<h2>???????</h2>", "<h2>保存快照到左侧</h2>"],
  ['将保存当前勾选的 {snapshotNameModal.source === "item" ? "??" : "??"} 行', '将保存当前勾选的 {snapshotNameModal.source === "item" ? "道具" : "任务"} 行'],
  ["<h2>?????</h2>", "<h2>重命名快照</h2>"],
  ["<h2>????</h2>\n            <p className=\"help\">\n              ???????", "<h2>删除快照</h2>\n            <p className=\"help\">\n              确定删除快照「"],
  ['<label htmlFor="snapshot-title-input">????</label>', '<label htmlFor="snapshot-title-input">标题</label>'],
  ['<label htmlFor="snapshot-rename-input">??</label>', '<label htmlFor="snapshot-rename-input">标题</label>'],
  ['push("已从磁盘重新加载表格");', 'push("已从磁盘重新加载表格");'],
  ["              push(\"??????????\");", '              push("已从磁盘重新加载表格");'],
  ['title="已保存的类型备注筛选"', 'title="已保存的类型备注筛选"'],
  ["title=\"??????????\"", 'title="已保存的类型备注筛选"'],
  ['<span className="topbar-filter-summary-label">类型备注</span>', '<span className="topbar-filter-summary-label">类型备注</span>'],
  ["<span className=\"topbar-filter-summary-label\">????</span>", '<span className="topbar-filter-summary-label">类型备注</span>'],
  ['{gmtSessionChecking ? "GMT…" : gmtLoggedIn ? "GMT 已登录" : "GMT 未登录"}', '{gmtSessionChecking ? "GMT…" : gmtLoggedIn ? "GMT 已登录" : "GMT 未登录"}'],
  ['{gmtSessionChecking ? "GMT?" : gmtLoggedIn ? "GMT ???" : "GMT ???"}', '{gmtSessionChecking ? "GMT…" : gmtLoggedIn ? "GMT 已登录" : "GMT 未登录"}'],
  ['{gmtLoggedIn ? "重新登录" : "登录"}', '{gmtLoggedIn ? "重新登录" : "登录"}'],
  ['{gmtLoggedIn ? "????" : "??"}', '{gmtLoggedIn ? "重新登录" : "登录"}'],
  ['<option value="">区服</option>', '<option value="">区服</option>'],
  ['<option value="">??</option>', '<option value="">区服</option>'],
  ['placeholder="账号 ID"', 'placeholder="账号 ID"'],
  ['placeholder="?? ID"', 'placeholder="账号 ID"'],
  [">刷新</button>", ">刷新</button>"],
  [">筛选</button>", ">筛选</button>"],
  [">\n            ??\n          </button>", ">\n            刷新\n          </button>"],
  [">\n            ??\n          </button>\n          {savedItemTypeRemarkKey", ">\n            筛选\n          </button>\n          {savedItemTypeRemarkKey"],
  [">\n            ??\n          </button>\n        </motion.div>", ">\n            设置\n          </button>\n        </div>"],
  [">\n            ??\n          </button>\n        </div>", ">\n            设置\n          </button>\n        </div>"],
  ['<div className="card-title">??????</div>', '<div className="card-title">全部道具</div>'],
  ['<div className="card-sub">Item.xlsx ??Item</div>', '<motion.div className="card-sub">Item.xlsx · Item</motion.div>'],
  ['<div className="card-sub">Item.xlsx ??Item</div>', '<div className="card-sub">Item.xlsx · Item</div>'],
  ['<div className="card-title">??????</div>\n            <div className="card-sub">Mission.xlsx', '<div className="card-title">全部任务</div>\n            <div className="card-sub">Mission.xlsx'],
  ['Mission.xlsx ??Task</motion.div>', 'Mission.xlsx · Task</div>'],
  ['Mission.xlsx ??Task</motion.div>', 'Mission.xlsx · Task</div>'],
  ['const srcLabel = s.source === "item" ? "??" : "??";', 'const srcLabel = s.source === "item" ? "道具" : "任务";'],
  ["                  ???{srcLabel} ? {rowCount} ??? {timeStr}", "                  快照 · {srcLabel} · {rowCount} 行 · {timeStr}"],
  ['? "请先完成设置向导"', '? "请先完成设置向导"'],
  ["? \"????????\"", '? "请先完成设置向导"'],
  ['? "无数据"', '? "无数据"'],
  ['? "???"', '? "无数据"'],
  ['? "暂无表格数据"', '? "暂无表格数据"'],
  ["? \"??????\"", '? "暂无表格数据"'],
  ['? "刷新中"', '? "刷新中"'],
  ['? "???"', '? "刷新中"'],
  [': "获取本地数据中…"', ': "获取本地数据中…"'],
  [': "????????"', ': "获取本地数据中…"'],
  ['合计：<strong>{itemQtyTotal}</strong>', '合计：<strong>{itemQtyTotal}</strong>'],
  ["                  ???<strong>{itemQtyTotal}</strong>", "                  合计：<strong>{itemQtyTotal}</strong>"],
  ['title="升序"', 'title="升序"'],
  ['title="?????"', 'title="升序"'],
  ['title="降序"', 'title="降序"'],
  ['title="?????"', 'title="降序"'],
  ['title="取消排序"', 'title="取消排序"'],
  ['title="???????"', 'title="取消排序"'],
  ['aria-label="??"', 'aria-label="全选"'],
  ["onClick={() => openSnapshotNameModal()}>\n            ????????          </button>", "onClick={() => openSnapshotNameModal()}>\n            保存选中到左侧\n          </button>"],
  ["                ????{label}??              </button>", "                添加到「{label}」\n              </button>"],
  ['if (src === "item") return "????";', 'if (src === "item") return "去 GMT 发道具";'],
  ['if (src === "task") return "????";', 'if (src === "task") return "去 GMT 完成任务";'],
  ['return "??GMT ??";', 'return "去 GMT 执行";'],
  ["            ????          </button>", "            重命名\n          </button>"],
  ["            ??\n          </button>", "            删除\n          </button>"],
  ["            ????\n          </button>", "            冻结此列\n          </button>"],
  ["            ????\n          </button>\n        </motion.div>\n      ) : null}\n\n      <motion.div className=\"toasts\">", "            取消冻结\n          </button>\n        </div>\n      ) : null}\n\n      <div className=\"toasts\">"],
  ["            ????\n          </button>\n        </div>\n      ) : null}\n\n      <div className=\"toasts\">", "            取消冻结\n          </button>\n        </div>\n      ) : null}\n\n      <div className=\"toasts\">"],
  ['const defaultTitle = `?? ${new Date(now).toLocaleString("zh-CN", { hour12: false })}?${built.idxs.length}??`;', 'const defaultTitle = `快照 ${new Date(now).toLocaleString("zh-CN", { hour12: false })}（${built.idxs.length}行）`;'],
  ["label={s.title.length > 22 ? `${s.title.slice(0, 20)}?` : s.title}", "label={s.title.length > 22 ? `${s.title.slice(0, 20)}…` : s.title}"],
];

// fix motion typos from bad replaces
s = s.replaceAll("<motion.div", "<div").replaceAll("</motion.div>", "</div>");
s = s.replaceAll("<motion.div", "<div");

for (const [a, b] of pairs) {
  if (a === b) continue;
  if (s.includes(a)) {
    s = s.split(a).join(b);
  }
}

// Remaining single-char ? placeholders for 空 in sort functions - only if still wrong
s = s.replace(/if \(k === "\?"\)/g, 'if (k === "空")');

fs.writeFileSync(appPath, s, "utf8");
const left = (s.match(/\?\?\?/g) || []).length;
console.log("remaining ??? count:", left);

