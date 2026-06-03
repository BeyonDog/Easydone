import fs from "node:fs";

const p = "src/App.tsx";
let s = fs.readFileSync(p, "utf8");

function cut(startMarker, endMarker, label) {
  const a = s.indexOf(startMarker);
  const b = s.indexOf(endMarker, a);
  if (a < 0 || b < 0) throw new Error(`cut ${label}: ${a} ${b}`);
  s = s.slice(0, a) + s.slice(b);
}

// Remove snapshot state declarations
cut(
  `  const [snapshotNameModal, setSnapshotNameModal]`,
  `  const [templateNameModal, setTemplateNameModal]`,
  "snapshot state",
);

// Remove snapshot functions block
cut(`  const removeSnapshot = async`, `  const openTemplateNameModal = () => {`, "snapshot fns");

// Remove snapshot modals JSX
cut(`      {snapshotNameModal ? (`, `      {templateNameModal ? (`, "snapshot name modal");
cut(`      {snapshotRenameModal ? (`, `      {pendingDeleteSnapshot ? (`, "snapshot rename modal");
cut(`      {pendingDeleteSnapshot ? (`, `      {pendingDeleteTemplate ? (`, "pending delete snapshot");

// snapshot sidebar menu - merge into template only (remove snapshot menu block)
cut(`      {snapshotSidebarMenu ? (`, `      {templateSidebarMenu ? (`, "snapshot sidebar menu");

// template menu: fix sendTemplates -> savedTemplates, remove 一键/编辑 buttons
s = s.replace(
  `          <button
            type="button"
            onClick={() => {
              const tpl = config.sendTemplates.find((t) => t.id === templateSidebarMenu.id);
              setTemplateSidebarMenu(null);
              if (tpl) void sendTemplateItemsNow(tpl.title, tpl.items);
            }}
          >
            一键发送
          </button>
          <button
            type="button"
            onClick={() => {
              const tpl = config.sendTemplates.find((t) => t.id === templateSidebarMenu.id);
              setTemplateSidebarMenu(null);
              if (tpl) {
                setSendTemplateModal({
                  templateId: tpl.id,
                  title: tpl.title,
                  draftItems: tpl.items.map((it) => ({ ...it })),
                });
              }
            }}
          >
            编辑并发送
          </button>
          <button`,
  `          <button`,
);

s = s.replace(/void removeSendTemplate\(id\)/g, "void removeTemplate(id)");
s = s.replace(/activeView\.kind === "snapshot"/g, '(activeView.kind === "template" || activeView.kind === "snapshot")');

// freeze anchor - fix line that still checks only snapshot
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

// send template modal title 批量发送
s = s.replace("                发送\n              </button>", "                批量发送\n              </button>");

// help text
s = s.replace("右键快照/模板可重命名或删除", "右键模板可重命名或删除");

// save template modal h2
s = s.replace("<h2>保存为发送模板</h2>", "<h2>保存为模板</h2>");

fs.writeFileSync(p, s);
console.log("patch-remove-snapshot OK");
