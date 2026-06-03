// DEPRECATED — use npm run restore:zh + verify:zh instead.
/**
 * One-shot UTF-8 restore: manifest + pass2 + splice filter fragment.
 * Run: node scripts/restore-app-zh-final.mjs
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bak = path.join(root, "src/App.tsx.bak");

if (!fs.existsSync(bak)) {
  console.error("Missing App.tsx.bak — run restore-app-zh.mjs once first.");
  process.exit(1);
}

fs.copyFileSync(bak, path.join(root, "src/App.tsx"));

const r1 = spawnSync(process.execPath, ["scripts/restore-app-zh.mjs"], { cwd: root, encoding: "utf8" });
console.log(r1.stdout || r1.stderr);

const pass2Fixes = [
  ['/** ????? Excel ???????????? */', '/** 不可隐藏的 Excel 表头（列隐藏面板中禁用） */'],
  ['/** ??? JSON ??? AppConfig???????? */', '/** 从磁盘 JSON 规范化 AppConfig（筛选、快照等） */'],
  ['/** ????????????????? source ??? */', '/** 当前表格勾选行所属业务类型（与快照 source 对齐） */'],
  ['/** ?????? localeCompare ?????? a ?????? */', '/** 表头排序：与 localeCompare 一致，升序为 a 在前时返回负 */'],
  ['/** ? currentAoa ? selectedRows ???????????? */', '/** 从 currentAoa 与 selectedRows 构建选中行子表（含表头） */'],
  ['/** ????? S + ???? O??? O ???? S ??????????? S ???? */', '/** 数据键集合 S + 保存顺序 O：先按 O 保留仍在 S 的键，再按默认规则追加 S 中剩余键 */'],
  ['  /** ????????dataIdx ? qty???? 1 */', '  /** 道具表每行数量（dataIdx → qty），默认 1 */'],
  ['  /** ???? Excel ????fetch=???refresh=?????? */', '  /** 主表拉取 Excel 时空态：fetch=首次；refresh=工具栏刷新后 */'],
  ['  /** GMT ??????? / ??? / ??????? openUrl */', '  /** GMT 登录态：检查中 / 已登录 / 未登录；登录用 openUrl */'],
  ['  /** ?? / ????? GMT ???????? */', '  /** 道具 / 任务表顶栏 GMT 发送前置校验提示 */'],
  ['    // eslint-disable-next-line react-hooks/exhaustive-deps -- ? Cookie/????????', '    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅 Cookie/登录态变化时探测'],
  ['      push(`?? GMT ?????: ${e}`);', '      push(`打开 GMT 登录窗失败: ${e}`);'],
  ['    // eslint-disable-next-line react-hooks/exhaustive-deps -- ??????? Excel', '    // eslint-disable-next-line react-hooks/exhaustive-deps -- 向导关闭后加载 Excel'],
  ['    push(`??????${snap.title}?`);', '    push(`已追加快照「${snap.title}」`);'],
  ['      push(`????: ${e}`);', '      push(`复制失败: ${e}`);'],
  [
    '      push("? ???? GMT ???????? ID");\n    } else {\n      push("? ? GMT ?????? Ctrl+V ?????");',
    '      push("请去 GMT 中粘贴指令（已复制到剪贴板）");\n    } else {\n      push("已复制指令，请按弹窗步骤在浏览器中操作");',
  ],
  ['        setErr("??? Excel ???");', '        setErr("请配置 Excel 工作区");'],
  ['        setErr(`Excel ?????\\n${ip}\\n${mp}`);', '        setErr(`Excel 文件未找到\\n${ip}\\n${mp}`);'],
  [
    '<p className="help">选择 Excel ?????????? Excel\\\\Item.xlsx ? Excel\\\\Mission.xlsx?</p>',
    '<p className="help">选择 Excel 工作区根目录，须包含 Excel\\\\Item.xlsx 与 Excel\\\\Mission.xlsx。</p>',
  ],
  ['<label>Excel ???</label>', '<label>Excel 工作区</label>'],
  ['pickFolder("Excel ???")', 'pickFolder("Excel 工作区")'],
  [
    '            <p className="help" style={{ marginTop: "0.35rem" }}>\n              ????????????\n            </p>\n          </div>\n          <motion.div className="field">\n            <label htmlFor="settings-theme-bg">背景底色</label>',
    '            <p className="help" style={{ marginTop: "0.35rem" }}>\n              用于界面强调色，保存后写入配置。\n            </p>\n          </motion.div>\n          <div className="field">\n            <label htmlFor="settings-theme-bg">背景底色</label>',
  ],
  [
    '            <p className="help" style={{ marginTop: "0.35rem" }}>\n              ??????????????????\n            </p>\n          </motion.div>\n          <div className="field">\n            <label>桌面壁纸</label>',
    '            <p className="help" style={{ marginTop: "0.35rem" }}>\n              浅色背景时会自动切换为深色文字以保证可读性。\n            </p>\n          </motion.div>\n          <div className="field">\n            <label>桌面壁纸</label>',
  ],
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
          </p>`,
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
          </p>`,
  ],
  ['            <h2>???????</h2>', '<h2>保存快照到左侧</h2>'],
  ['<h2>????</h2>\n            <p className="help">\n              确定删除快照', '<h2>删除快照</h2>\n            <p className="help">\n              确定删除快照'],
  [
    '            <h2>???????</h2>\n            <div className="field">\n              <label htmlFor="template-rename-input">??</label>',
    '            <h2>重命名发送模板</h2>\n            <div className="field">\n              <label htmlFor="template-rename-input">名称</label>',
  ],
  [': "???"}', ': "无数据"}'],
  [
    '            ???\n          </button>\n          <button\n            type="button"\n            onClick={() => {\n              const { id, title } = snapshotSidebarMenu;\n              setSnapshotSidebarMenu(null);\n              setPendingDeleteSnapshot({ id, title });',
    '            重命名\n          </button>\n          <button\n            type="button"\n            onClick={() => {\n              const { id, title } = snapshotSidebarMenu;\n              setSnapshotSidebarMenu(null);\n              setPendingDeleteSnapshot({ id, title });',
  ],
];

const appPath = path.join(root, "src/App.tsx");
let s = fs.readFileSync(appPath, "utf8");
for (const [a, b] of pass2Fixes) {
  if (s.includes(a)) s = s.split(a).join(b);
}
s = s.replace(
  'onClick={() => void commitSnapshotSave(snapshotNameDraft)}>\n                取消',
  'onClick={() => void commitSnapshotSave(snapshotNameDraft)}>\n                保存',
);
s = s.replace(
  'onClick={() => void commitSnapshotRename(snapshotRenameModal.draft)}>\n                取消',
  'onClick={() => void commitSnapshotRename(snapshotRenameModal.draft)}>\n                保存',
);
// Fix GoGmt mismatched closing tags (div open, motion close)
s = s.replace(
  /(<div className="modal-back" onMouseDown=\{\(\) => setGoGmtModal\(null\}\">\s*<div className="modal"[\s\S]*?<\/div>\s*)<\/motion\.motion>\s*<\/motion\.div>/,
  "$1</motion.div>\n      </motion.div>",
);
s = s.replace(
  /(<motion\.motion className="modal-back" onMouseDown=\{\(\) => setGoGmtModal\(null\}\">\s*<div className="modal"[\s\S]*?<\/motion\.div>\s*)<\/motion\.div>/,
  "$1</motion.div>",
);
s = s.replace(
  /(<div className="modal-back" onMouseDown=\{\(\) => setGoGmtModal\(null\}\">\s*<div className="modal"[\s\S]*?<\/motion\.motion>\s*)<\/motion\.div>/,
  "$1</motion.div>\n      </motion.div>",
);
s = s.replace(
  /(<div className="modal-back" onMouseDown=\{\(\) => setGoGmtModal\(null\}\">\s*<div className="modal"[\s\S]*?<\/motion\.div>\s*)<\/motion\.motion>/,
  "$1</motion.div>\n      </motion.div>",
);
s = s.replace(
  /(<div className="modal-back" onMouseDown=\{\(\) => setGoGmtModal\(null\}\">\s*<motion\.div className="modal"[\s\S]*?<\/motion\.div>\s*)<\/motion\.div>/,
  "$1</motion.div>\n      </motion.div>",
);

fs.writeFileSync(appPath, s, "utf8");

const rem = (fs.readFileSync(appPath, "utf8").match(/\?\?\?/g) || []).length;
console.log("final remaining ???", rem);
if (rem > 0) {
  fs.readFileSync(appPath, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes("???")) console.log(i + 1, line.trim().slice(0, 100));
    });
  process.exit(1);
}

