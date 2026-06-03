/**
 * Second-pass fixes after restore-app-zh.mjs (remaining ??? from strict-skip list).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function applyPass2Fixes(s) {
  const pairs = [
    ["/** ????? Excel ???????????? */", "/** 不可隐藏的 Excel 表头（列隐藏面板中禁用） */"],
    ["/** ??? JSON ??? AppConfig???????? */", "/** 从磁盘 JSON 规范化 AppConfig（筛选、快照等） */"],
    ["/** ????????????????? source ??? */", "/** 当前表格勾选行所属业务类型（与快照 source 对齐） */"],
    ["/** ?????? localeCompare ?????? a ?????? */", "/** 表头排序：与 localeCompare 一致，升序为 a 在前时返回负 */"],
    ["/** ? currentAoa ? selectedRows ???????????? */", "/** 从 currentAoa 与 selectedRows 构建选中行子表（含表头） */"],
    [
      "/** ????? S + ???? O??? O ???? S ??????????? S ???? */",
      "/** 数据键集合 S + 保存顺序 O：先按 O 保留仍在 S 的键，再按默认规则追加 S 中剩余键 */",
    ],
    ["  /** ????????dataIdx ? qty???? 1 */", "  /** 道具表每行数量（dataIdx → qty），默认 1 */"],
    ["  /** ???? Excel ????fetch=???refresh=?????? */", "  /** 主表拉取 Excel 时空态：fetch=首次；refresh=工具栏刷新后 */"],
    ["  /** GMT ??????? / ??? / ??????? openUrl */", "  /** GMT 登录态：检查中 / 已登录 / 未登录；登录用 openUrl */"],
    ["  /** ?? / ????? GMT ???????? */", "  /** 道具 / 任务表顶栏 GMT 发送前置校验提示 */"],
    [
      "    // eslint-disable-next-line react-hooks/exhaustive-deps -- ? Cookie/????????",
      "    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅 Cookie/登录态变化时探测",
    ],
    ["      push(`?? GMT ?????: ${e}`);", "      push(`打开 GMT 登录窗失败: ${e}`);"],
    [
      "    // eslint-disable-next-line react-hooks/exhaustive-deps -- ??????? Excel",
      "    // eslint-disable-next-line react-hooks/exhaustive-deps -- 向导关闭后加载 Excel",
    ],
    ["    push(`??????${snap.title}?`);", "    push(`已追加快照「${snap.title}」`);"],
    ["      push(`????: ${e}`);", "      push(`复制失败: ${e}`);"],
    ['push("? ???? GMT ???????? ID")', 'push("请去 GMT 中粘贴指令（已复制到剪贴板）")'],
    ['push("? ? GMT ?????? Ctrl+V ????")', 'push("已复制指令，请按弹窗步骤在浏览器中操作")'],
    ['        setErr("??? Excel ???");', '        setErr("请配置 Excel 工作区");'],
    ["        setErr(`Excel ?????\\n${ip}\\n${mp}`);", "        setErr(`Excel 文件未找到\\n${ip}\\n${mp}`);"],
    [
      '<p className="help">选择 Excel ?????????? Excel\\\\Item.xlsx ? Excel\\\\Mission.xlsx?</p>',
      '<p className="help">选择 Excel 工作区根目录，须包含 Excel\\\\Item.xlsx 与 Excel\\\\Mission.xlsx。</p>',
    ],
    ["<label>Excel ???</label>", "<label>Excel 工作区</label>"],
    ['pickFolder("Excel ???")', 'pickFolder("Excel 工作区")'],
    ["              ????????????", "              用于界面强调色，保存后写入配置。"],
    ["              ??????????????????", "              浅色背景时会自动切换为深色文字以保证可读性。"],
    ["<label>????</label>", "<label>桌面壁纸</label>"],
    [
      "                ? ? easydone ???? <b>GMT ?????</b> ??????",
      "                ① 请去已打开的 GMT 页面，在 GM 助手输入框 <b>Ctrl+V</b> 粘贴指令（本次不再打开浏览器）。",
    ],
    [
      "                ? ?? GM ????? <b>Ctrl+V</b> ?????",
      "                ① 指令已复制到剪贴板（见下方预览）。② 在 GM 助手输入框 <b>Ctrl+V</b> 粘贴即可。",
    ],
    ["<h2>? GMT ??</h2>", "<h2>去 GMT 执行（需要手动挂载）</h2>"],
    [': "???"}', ': "无数据"}'],
  ];

  for (const [a, b] of pairs) {
    if (s.includes(a)) s = s.split(a).join(b);
  }

  // Snapshot save modal title (unique context)
  s = s.replace(
    `{snapshotNameModal ? (
        <div className="modal-back" onMouseDown={() => setSnapshotNameModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>???????</h2>`,
    `{snapshotNameModal ? (
        <div className="modal-back" onMouseDown={() => setSnapshotNameModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>保存快照到左侧</h2>`,
  );

  s = s.replace(
    `{pendingDeleteSnapshot ? (
        <div className="modal-back" onMouseDown={() => setPendingDeleteSnapshot(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
<h2>????</h2>`,
    `{pendingDeleteSnapshot ? (
        <div className="modal-back" onMouseDown={() => setPendingDeleteSnapshot(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>删除快照</h2>`,
  );

  s = s.replace(
    `{templateRenameModal ? (
        <div className="modal-back" onMouseDown={() => setTemplateRenameModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>???????</h2>`,
    `{templateRenameModal ? (
        <div className="modal-back" onMouseDown={() => setTemplateRenameModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>重命名发送模板</h2>`,
  );

  s = s.replace(
    `            ???
          </button>
          <button
            type="button"
            onClick={() => {
              const { id, title } = snapshotSidebarMenu;
              setSnapshotSidebarMenu(null);
              setPendingDeleteSnapshot({ id, title });`,
    `            重命名
          </button>
          <button
            type="button"
            onClick={() => {
              const { id, title } = snapshotSidebarMenu;
              setSnapshotSidebarMenu(null);
              setPendingDeleteSnapshot({ id, title });`,
  );

  s = s.replace(
    `              setHiddenPanelDraft(null);
              }}
            >
              ??
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={applyDisabled}`,
    `              setHiddenPanelDraft(null);
              }}
            >
              取消
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={applyDisabled}`,
  );

  s = s.replace(
    `                  void loadExcelData(nextCfg, "refresh");
                })()
              }
            >
              ??
            </button>
          </div>
        </div>
      </div>
    );
  };

  const GmtLoginModal = () => {`,
    `                  void loadExcelData(nextCfg, "refresh");
                })()
              }
            >
              应用
            </button>
          </div>
        </div>
      </div>
    );
  };

  const GmtLoginModal = () => {`,
  );

  s = s.replace(
    `        </div>
      </motion.div>
    );
  };

  if (!config) {
    return <div className="empty">加载配置…</div>;`,
    `        </div>
      </div>
    );
  };

  if (!config) {
    return <div className="empty">加载配置…</div>;`,
  );

  s = s.replace(
    '<label htmlFor="template-rename-input">??</label>',
    '<label htmlFor="template-rename-input">名称</label>',
  );

  s = s.replace(
    "选择 Excel ?????????? Excel\\\\Item.xlsx ? Excel\\\\Mission.xlsx?",
    "选择 Excel 工作区根目录，须包含 Excel\\\\Item.xlsx 与 Excel\\\\Mission.xlsx。",
  );
  s = s.replace("用于界面强调色，保存后写入配置。??????", "浅色背景时会自动切换为深色文字以保证可读性。");
  s = s.replace("        </motion.div>\n      </div>", "        </div>\n      </div>");

  return s;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src/App.tsx");
  let s = fs.readFileSync(appPath, "utf8");
  s = applyPass2Fixes(s);
  fs.writeFileSync(appPath, s, "utf8");
  const rem = (s.match(/\?\?\?/g) || []).length;
  console.log("remaining ???", rem);
  if (rem) {
    s.split("\n").forEach((line, i) => {
      if (line.includes("???")) console.log(i + 1, line.trim());
    });
    process.exit(1);
  }
}
