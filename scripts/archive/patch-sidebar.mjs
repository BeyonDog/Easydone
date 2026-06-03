// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = new URL("../src/App.tsx", import.meta.url);
let s = fs.readFileSync(p, "utf8");
const old = `          {config.savedSnapshots.map((s) => {
            const rowCount = Math.max(0, s.aoa.length - 1);
            const srcLabel = s.source === "item" ? "??" : "??";
            const timeStr = new Date(s.createdAt).toLocaleString("zh-CN", { hour12: false });
            return (
              <div
                key={s.id}
                className={\`card \${activeView.kind === "snapshot" && activeView.id === s.id ? "active" : ""}\`}
                onClick={() => {
                  if (filterSheetOpen) return;
                  setActiveView({ kind: "snapshot", id: s.id });
                  setSelectedRows(new Set());
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtxMenu(null);
                  setColumnHeaderMenu(null);
                  setSnapshotSidebarMenu({ x: e.clientX, y: e.clientY, id: s.id, title: s.title });
                }}
              >
                <div className="card-title">{s.title}</motion.div>
                <div className="card-sub">
                  ?? ? {srcLabel} ? {rowCount} ? ? {timeStr}
                </div>
              </div>
            );
          })}`;

const neu = `          {sidebarCards.map((entry) => {
            const timeStr = new Date(entry.createdAt).toLocaleString("zh-CN", { hour12: false });
            if (entry.kind === "snapshot") {
              const s = entry.snap;
              const rowCount = Math.max(0, s.aoa.length - 1);
              const srcLabel = s.source === "item" ? "道具" : "任务";
              return (
                <div
                  key={\`snap-\${s.id}\`}
                  className={\`card \${activeView.kind === "snapshot" && activeView.id === s.id ? "active" : ""}\`}
                  onClick={() => {
                    if (filterSheetOpen) return;
                    setActiveView({ kind: "snapshot", id: s.id });
                    setSelectedRows(new Set());
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCtxMenu(null);
                    setTemplateSidebarMenu(null);
                    setColumnHeaderMenu(null);
                    setSnapshotSidebarMenu({ x: e.clientX, y: e.clientY, id: s.id, title: s.title });
                  }}
                >
                  <div className="card-title">{s.title}</div>
                  <div className="card-sub">
                    快照 · {srcLabel} · {rowCount} 行 · {timeStr}
                  </div>
                </div>
              );
            }
            const t = entry.tpl;
            return (
              <div
                key={\`tpl-\${t.id}\`}
                className="card card--send-template"
                onClick={() => {
                  if (filterSheetOpen) return;
                  setSendTemplateModal({
                    templateId: t.id,
                    title: t.title,
                    draftItems: t.items.map((it) => ({ ...it })),
                  });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtxMenu(null);
                  setColumnHeaderMenu(null);
                  setSnapshotSidebarMenu(null);
                  setTemplateSidebarMenu({ x: e.clientX, y: e.clientY, id: t.id, title: t.title });
                }}
              >
                <div className="card-title-row">
                  <span className="card-badge-send">发送</span>
                  <span className="card-title">{t.title}</span>
                </div>
                <div className="card-sub">
                  发送 · {t.items.length} 种物品 · {timeStr}
                </div>
              </div>
            );
          })}`.replaceAll("<" + "motion.div", "<" + "div").replaceAll("</" + "motion.div>", "</" + "motion.div>").replaceAll("</" + "motion.div>", "</" + "motion.div>");

const fixed = neu.replaceAll("<" + "motion.div", "<" + "div").replaceAll("</" + "motion.div>", "</" + "div>");

if (!s.includes("{config.savedSnapshots.map((s) =>")) {
  console.log("already patched or marker missing");
  process.exit(0);
}
const idx = s.indexOf("{config.savedSnapshots.map((s) =>");
const end = s.indexOf("})}", idx) + 3;
const actual = s.slice(idx - 10, end + 2);
console.log("found block len", actual.length);
// simpler: regex
s = s.replace(
  /\{config\.savedSnapshots\.map\(\(s\) => \{[\s\S]*?\}\)\}/,
  fixed.trim().replace(/^\s+/, ""),
);
fs.writeFileSync(p, s, "utf8");
console.log("done");

