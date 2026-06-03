import fs from "node:fs";

const p = "src/App.tsx";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("{sidebarCards.map((entry) => {");
const end = s.indexOf('})}\n          <p className="help"', start);
if (start < 0 || end < 0) throw new Error(`sidebar not found ${start} ${end}`);

const neu = `{sidebarTemplates.map((t) => {
            const timeStr = new Date(t.createdAt).toLocaleString("zh-CN", { hour12: false });
            const rowCount = Math.max(0, t.aoa.length - 1);
            const srcLabel = t.source === "item" ? "道具" : "任务";
            const isActive =
              (activeView.kind === "template" || activeView.kind === "snapshot") && activeView.id === t.id;
            const sendHint = t.source === "item" && t.items.length > 0 ? \` · \${t.items.length} 种可发\` : "";
            return (
              <div
                key={t.id}
                className={\`card card--template\${isActive ? " active" : ""}\`}
                onClick={() => {
                  if (filterSheetOpen) return;
                  setActiveView({ kind: "template", id: t.id });
                  setSelectedRows(new Set());
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtxMenu(null);
                  setColumnHeaderMenu(null);
                  setSnapshotSidebarMenu(null);
                  setTemplateSidebarMenu({ x: e.clientX, y: e.clientY, id: t.id, title: t.title });
                }}
              >
                {t.source === "item" && t.items.length > 0 ? (
                  <div className="card-template-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-tiny card-template-action"
                      onClick={() => void sendTemplateItemsNow(t.title, t.items)}
                    >
                      一键发送
                    </button>
                    <button
                      type="button"
                      className="btn btn-tiny card-template-action"
                      onClick={() =>
                        setSendTemplateModal({
                          templateId: t.id,
                          title: t.title,
                          draftItems: t.items.map((it) => ({ ...it })),
                        })
                      }
                    >
                      批量发送
                    </button>
                  </motion.div>
                ) : null}
                <motion.div className="card-title">{t.title}</motion.div>
                <motion.div className="card-sub">
                  模板 · {srcLabel} · {rowCount} 行{sendHint} · {timeStr}
                </motion.div>
              </motion.div>
            );
          })}`;

const fixed = neu.split("motion.div").join("div");
s = s.slice(0, start) + fixed + s.slice(end);
fs.writeFileSync(p, s);
console.log("patch-sidebar OK");
