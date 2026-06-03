import fs from "node:fs";

let s = fs.readFileSync("src/App.tsx", "utf8");

const a = s.indexOf("      {snapshotNameModal ? (");
const b = s.indexOf("      {templateNameModal ? (", a);
if (a < 0 || b < 0) throw new Error("snapshot modals block");
s = s.slice(0, a) + s.slice(b);

const snapMenu = s.indexOf("      {snapshotSidebarMenu ? (");
const tplMenu = s.indexOf("      {templateSidebarMenu ? (", snapMenu);
if (snapMenu >= 0 && tplMenu > snapMenu) s = s.slice(0, snapMenu) + s.slice(tplMenu);

s = s.replace(
  /          <button\s+type="button"\s+onClick=\{\(\) => \{\s+const tpl = config\.savedTemplates\.find[\s\S]*?编辑并发送\s*<\/button>\s*/m,
  "",
);

s = s.replace(/config\.sendTemplates\.find/g, "config.savedTemplates.find");
s = s.replace("void removeSendTemplate(id)", "void removeTemplate(id)");
s = s.replaceAll("setSnapshotSidebarMenu(null);\n", "");
s = s.replaceAll("setSnapshotSidebarMenu(null);", "");

s = s.replace(
  `  const closeCtx = () => {
    setCtxMenu(null);
    setTemplateSidebarMenu(null);
    setColumnHeaderMenu(null);
  };`,
  `  const closeCtx = () => {
    setCtxMenu(null);
    setTemplateSidebarMenu(null);
    setColumnHeaderMenu(null);
  };`,
);

if (s.includes("setCtxMenu(null);\n    setSnapshotSidebarMenu")) {
  s = s.replace(
    `  const closeCtx = () => {
    setCtxMenu(null);
    setSnapshotSidebarMenu(null);
    setTemplateSidebarMenu(null);
    setColumnHeaderMenu(null);
  };`,
    `  const closeCtx = () => {
    setCtxMenu(null);
    setTemplateSidebarMenu(null);
    setColumnHeaderMenu(null);
  };`,
  );
}

s = s.replace(
  `    if (activeView.kind === "snapshot") {
      return config.savedSnapshots.find((s) => s.id === activeView.id)?.freezeThroughHeader ?? null;
    }`,
  `    if (activeView.kind === "template" || activeView.kind === "snapshot") {
      return config.savedTemplates.find((t) => t.id === activeView.id)?.freezeThroughHeader ?? null;
    }`,
);

s = s.replace(
  `    if (!config || activeView.kind === "snapshot") return;`,
  `    if (!config || activeView.kind === "template" || activeView.kind === "snapshot") return;`,
);

s = s.replace("<h2>保存为发送模板</h2>", "<h2>保存为模板</h2>");
s = s.replace("右键快照/模板可重命名或删除", "右键模板可重命名或删除");

fs.writeFileSync("src/App.tsx", s);
console.log("patch-modals-menu OK");
