// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src/App.tsx");
let s = fs.readFileSync(appPath, "utf8");

s = s.replaceAll("<motion.div", "<motion.div"); // noop guard
s = s.replaceAll("<motion.div", "<div").replaceAll("</motion.div>", "</div>");

const exact = [
  ['/** ??Excel ????????????? */', '/** 不可隐藏的 Excel 表头（列隐藏面板中禁用） */'],
  ['const NON_HIDEABLE_ITEM_HEADERS = new Set(["??ID"]);', 'const NON_HIDEABLE_ITEM_HEADERS = new Set(["物品ID"]);'],
  ['const NON_HIDEABLE_TASK_HEADERS = new Set(["??ID"]);', 'const NON_HIDEABLE_TASK_HEADERS = new Set(["任务ID"]);'],
  ['const TYPE_REMARK_PRIORITY = ["??", "??", "??", "??", "??"];', 'const TYPE_REMARK_PRIORITY = ["武器", "防具", "食材", "材料", "藏品"];'],
  ['const QUALITY_LABEL_ORDER = ["???", "?", "?", "?", "?", "?"];', 'const QUALITY_LABEL_ORDER = ["低品质", "绿", "蓝", "紫", "金", "红"];'],
  ['/** ??????S + ???? O????O ???? S ????????????S ???? */', '/** 数据键集合 S + 保存顺序 O：先按 O 保留仍在 S 的键，再按默认规则追加 S 中剩余键 */'],
  ['/** ??????????????????config????????*/', '/** 从磁盘 JSON 规范化 AppConfig（筛选、快照等） */'],
  ['/** ??????????????????source ????*/', '/** 当前表格勾选行所属业务类型（与快照 source 对齐） */'],
  ['/** ?????? localeCompare ???????a ?????? */', '/** 表头排序：与 localeCompare 一致，升序为 a 在前时返回负 */'],
  ['/** ????????????????????????aoa????????*/', '/** 从 currentAoa 与 selectedRows 构建选中行子表（含表头） */'],
  ['  /** ??????????=???????????????????????? */', '  /** 道具表每行数量（dataIdx → qty），默认 1 */'],
  ['  /** ???? Excel ????fetch=??/?????????refresh=??????????????*/', '  /** 主表拉取 Excel 时空态：fetch=首次；refresh=工具栏刷新后 */'],
  ['  /** ?????????????GMT ?????????? GMT??????openUrl */', '  /** GMT 登录态：检查中 / 已登录 / 未登录；登录用 openUrl */'],
  ['  /** ???? / ???????????? GMT??????????????*/', '  /** 道具 / 任务表顶栏 GMT 发送前置校验提示 */'],
  ['    // eslint-disable-next-line react-hooks/exhaustive-deps -- ??Cookie/????????????', '    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅 Cookie/登录态变化时探测'],
  ['    // eslint-disable-next-line react-hooks/exhaustive-deps -- ???????????? Excel', '    // eslint-disable-next-line react-hooks/exhaustive-deps -- 向导关闭后加载 Excel'],
  ['title="拖拽调整顺序"', 'title="拖拽调整顺序"'],
  ['title="????????"', 'title="拖拽调整区块顺序"'],
  ['              title="????"', '              title="拖拽调整顺序"'],
  ['              ⋮⋮\n            </span>', '              ⋮⋮\n            </span>'],
  ['              ??\n            </span>\n            <div className="filter-section-dnd-slot">', '              ⋮⋮\n            </span>\n            <div className="filter-section-dnd-slot">'],
  ['push(`?? Excel ??: ${msg}`);', 'push(`读 Excel 失败: ${msg}`);'],
  ['push(`GMT ??????: ${e}`);', 'push(`GMT 登录检查失败: ${e}`);'],
  ['push("GMT ????");', 'push("GMT 已登录");'],
  ['push(`GMT ????: ${e}`);', 'push(`GMT 登录失败: ${e}`);'],
  ['push("GMT ???");', 'push("GMT 已退出");'],
  ['push(`?? GMT ??????: ${e}`);', 'push(`打开 GMT 登录窗失败: ${e}`);'],
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
  ['push("???????????????");', 'push("记录类型不匹配，无法追加");'],
  ['push("???????????????");', 'push("目标快照无表头，无法追加");'],
  ['push("???????????");', 'push("表头与目标快照不一致");'],
  ['push("??????????????");', 'push("请先配置「物品备注」列");'],
  ['push(`?????${snap.title}?`);', 'push(`已追加快照「${snap.title}」`);'],
  ['push(`???????${label}? ? ${rowCount} ??`);', 'push(`已保存到左侧（${label}表 · ${rowCount} 行）`);'],
  ['push("??????");', 'push("名称不能为空");'],
  ['push("????");', 'push("已重命名");'],
  ['push("?????ID??");', 'push("所选行物品 ID 为空");'],
  ['push(`????${rewardItems.length} ??????${idxs.length} ??`);', 'push(`已发送 ${rewardItems.length} 种物品（共 ${idxs.length} 行）`);'],
  ['push(`GMT ????: ${result.message}`);', 'push(`GMT 发送失败: ${result.message}`);'],
  ['push(`GMT ????: ${e}`);', 'push(`GMT 发送失败: ${e}`);'],
  ['push(`??????${taskId}`);', 'push(`已完成任务 ${taskId}`);'],
  ['push("???????");', 'push("无法生成指令");'],
  ['push(`???????: ${e}`);', 'push(`复制失败: ${e}`);'],
  ['setErr("??? Excel ????");', 'setErr("请配置 Excel 工作区");'],
  ['setErr(`Excel ???????\\n${ip}\\n${mp}`);', 'setErr(`Excel 文件未找到\\n${ip}\\n${mp}`);'],
  ['setErr("????????");', 'setErr("壁纸文件过大");'],
  ['setErr("???????????????");', 'setErr("壁纸格式不支持或读取失败");'],
  ['setErr("Excel ????????");', 'setErr("Excel 工作区无效");'],
  ['setErr(`Excel ??????\\n${ip}\\n${mp}`);', 'setErr(`Excel 文件未找到\\n${ip}\\n${mp}`);'],
  ['const defaultTitle = `?? ${new Date(now).toLocaleString("zh-CN", { hour12: false })}?${built.idxs.length}??`;', 'const defaultTitle = `快照 ${new Date(now).toLocaleString("zh-CN", { hour12: false })}（${built.idxs.length}行）`;'],
  ['const label = source === "item" ? "??" : "??";', 'const label = source === "item" ? "道具" : "任务";'],
  ['const srcLabel = s.source === "item" ? "??" : "??";', 'const srcLabel = s.source === "item" ? "道具" : "任务";'],
  ['{ex || "???"}', '{ex || "未选择"}'],
  ['pickFolder("?? Excel ????")', 'pickFolder("选择 Excel 工作区")'],
  ['pickFolder("Excel ????")', 'pickFolder("Excel 工作区")'],
  ['<h2>????</h2>\n          <p className="help">?? Excel', '<h2>设置向导</h2>\n          <p className="help">选择 Excel'],
  ['<label>Excel ????</label>', '<label>Excel 工作区</label>'],
  ['title: "??????"', 'title: "选择壁纸"'],
  ['<label htmlFor="settings-theme-accent">?????</label>', '<label htmlFor="settings-theme-accent">主题强调色</label>'],
  ['<label htmlFor="settings-theme-bg">?????</label>', '<label htmlFor="settings-theme-bg">背景底色</label>'],
  ['<label>??????</label>', '<label>桌面壁纸</label>'],
  ['<h2>???? ? {hiddenPanel === "item" ? "???" : "???"}</h2>', '<h2>隐藏列 · {hiddenPanel === "item" ? "道具" : "任务"}</h2>'],
  ['<span className="muted">????</span>', '<span className="muted">不可隐藏</span>'],
  ['<label>????</label>\n            <textarea', '<label>指令预览</label>\n            <textarea'],
  ['              ???\n            </button>\n          </div>\n        </div>\n      </motion.div>\n    );\n  };', '              知道了\n            </button>\n          </div>\n        </div>\n      </div>\n    );\n  };'],
  ['              ???\n            </button>\n          </div>\n        </div>\n      </div>\n    );\n  };', '              知道了\n            </button>\n          </div>\n        </motion.div>\n      </div>\n    );\n  };'],
  ['            <h2>设置向导</h2>\n            <p className="help">\n              ???????', '<h2>删除快照</h2>\n            <p className="help">\n              确定删除快照「'],
  ['              ???????<span title={pendingDeleteSnapshot.title}>{pendingDeleteSnapshot.title}</span>??????????', '              确定删除快照「<span title={pendingDeleteSnapshot.title}>{pendingDeleteSnapshot.title}</span>」？此操作不可恢复。'],
  ['              ???????? {snapshotNameModal.source === "item" ? "??" : "??"} ??? {snapshotNameModal.rowCount}{" "}\n              ??????????????????????', '              将保存当前勾选的 {snapshotNameModal.source === "item" ? "道具" : "任务"} 行（共 {snapshotNameModal.rowCount}{" "}\n              行）到左侧快照列表。可修改标题后点「保存」。'],
  ['<label htmlFor="snapshot-title-input">??</label>', '<label htmlFor="snapshot-title-input">标题</label>'],
  ['title="??????????"', 'title="已保存的类型备注筛选"'],
  ['<span className="topbar-filter-summary-label">????</span>', '<span className="topbar-filter-summary-label">类型备注</span>'],
  ['{gmtSessionChecking ? "GMT?" : gmtLoggedIn ? "GMT ???" : "GMT ???"}', '{gmtSessionChecking ? "GMT…" : gmtLoggedIn ? "GMT 已登录" : "GMT 未登录"}'],
  ['{gmtLoggedIn ? "????" : "??"}', '{gmtLoggedIn ? "重新登录" : "登录"}'],
  ['<option value="">??</option>', '<option value="">区服</option>'],
  ['placeholder="?? ID"', 'placeholder="账号 ID"'],
  ['<motion.div className="card-title">全部道具</motion.div>', '<div className="card-title">全部道具</div>'],
  ['<div className="card-title">??????</motion.div>', '<div className="card-title">全部道具</div>'],
  ['<div className="card-title">??????</div>', '<div className="card-title">全部道具</motion.div>'],
  ['<div className="card-sub">Item.xlsx ??Item</div>', '<div className="card-sub">Item.xlsx · Item</div>'],
  ['<div className="card-title">??????</div>\n            <div className="card-sub">Mission.xlsx', '<div className="card-title">全部任务</div>\n            <div className="card-sub">Mission.xlsx'],
  ['Mission.xlsx ??Task</div>', 'Mission.xlsx · Task</div>'],
  ['                  ???{srcLabel} ? {rowCount} ??? {timeStr}', '                  快照 · {srcLabel} · {rowCount} 行 · {timeStr}'],
  ['? "????????"', '? "请先完成设置向导"'],
  ['? "???"', '? "无数据"'],
  ['? "??????"', '? "暂无表格数据"'],
  ['? "???"', '? "刷新中"'],
  [': "????????"', ': "获取本地数据中…"'],
  ['                  ???<strong>{itemQtyTotal}</strong>', '                  合计：<strong>{itemQtyTotal}</strong>'],
  ['title="?????"', 'title="升序"'],
  ['title="?????"', 'title="降序"'],
  ['title="???????"', 'title="取消排序"'],
  ['aria-label="??"', 'aria-label="全选"'],
  ['onClick={() => openSnapshotNameModal()}>\n            ????????          </button>', 'onClick={() => openSnapshotNameModal()}>\n            保存选中到左侧\n          </button>'],
  ['                ????{label}??              </button>', '                添加到「{label}」\n              </button>'],
  ['if (src === "item") return "????";', 'if (src === "item") return "去 GMT 发道具";'],
  ['if (src === "task") return "????";', 'if (src === "task") return "去 GMT 完成任务";'],
  ['return "??GMT ??";', 'return "去 GMT 执行";'],
  ['            ????          </button>', '            重命名\n          </button>'],
  ['            ??\n          </button>', '            删除\n          </button>'],
  ['            ????\n          </button>', '            冻结此列\n          </button>'],
  ['            ????\n          </button>\n        </div>\n      ) : null}\n\n      <div className="toasts">', '            取消冻结\n          </button>\n        </div>\n      ) : null}\n\n      <div className="toasts">'],
  ['                ??\n              </button>', '                取消\n              </button>'],
  ['                ??\n              </button>\n              <button type="button" className="btn primary"', '                保存\n              </button>\n              <button type="button" className="btn primary"'],
  ['                ?????\n              </button>', '                选择文件夹\n              </button>'],
  ['                ??????\n              </button>', '                恢复默认\n              </button>'],
  ['                ????????              </button>', '                选择图片\n              </button>'],
  ['                ????\n              </button>', '                清除\n              </button>'],
  ['              ??????\n            </button>', '              打开登录\n            </button>'],
  ['              ????\n            </button>', '              取消\n            </button>'],
  ['              ????\n            </button>\n          </div>\n        </div>\n      </header>', '              刷新\n            </button>\n          </div>\n        </div>\n      </header>'],
  ['              ????\n            </button>\n            onClick={() => openTableFilterModal()}', '              筛选\n            </button>\n            onClick={() => openTableFilterModal()}'],
  ['              ??\n          </button>\n        </div>\n      </header>', '              设置\n          </button>\n        </div>\n      </header>'],
];

// Fix 空 in sort functions - replace quoted ? that's meant to be 空 when in filter/sort context
s = s.replace(/if \(k === "\?"\)/g, 'if (k === "空")');
s = s.replace(/s\.has\("\?"\)/g, 's.has("空")');
s = s.replace(/s\.delete\("\?"\)/g, 's.delete("空")');
s = s.replace(/\["\?"\]/g, '["空"]');

for (const [a, b] of exact) {
  if (a !== b && s.includes(a)) s = s.split(a).join(b);
}

// Button labels in modals - last resort for standalone ??
s = s.replace(
  /<button type="button" className="btn" onClick=\{\(\) => setSnapshotNameModal\(null\)\}>\s*\?\?\s*<\/button>/,
  '<button type="button" className="btn" onClick={() => setSnapshotNameModal(null)}>\n                取消\n              </button>',
);

fs.writeFileSync(appPath, s, "utf8");
console.log("remaining ???", (s.match(/\?\?\?/g) || []).length);

