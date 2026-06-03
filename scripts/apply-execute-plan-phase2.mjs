/**
 * Phase 2: template merge UI + sidebar + context menu
 */
import fs from "node:fs";
import path from "node:path";

const appPath = path.join(process.cwd(), "src", "App.tsx");
let s = fs.readFileSync(appPath, "utf8");

function rep(from, to, label) {
  if (!s.includes(from)) throw new Error(`phase2 missing: ${label}`);
  s = s.replace(from, to);
}

// template name modal state type - find and replace openTemplateNameModal block
rep(
  `  const [templateNameModal, setTemplateNameModal] = useState<{ defaultTitle: string; items: SendTemplateItem[] } | null>(
    null,
  );`,
  `  const [templateNameModal, setTemplateNameModal] = useState<{
    defaultTitle: string;
    source: "item" | "task";
    aoa: SheetMatrix;
    items: SendTemplateItem[];
  } | null>(null);`,
  "templateNameModal type",
);

rep(
  `  const openTemplateNameModal = () => {
    closeCtx();
    if (!currentAoa || !config || !isItemTableView) return;
    const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
    const ridx = resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn);
    const items = buildSendItemsFromSelection(currentAoa, selectedRows, itemLineQty, ridx);
    if (items.length === 0) {
      notify("所选行物品 ID 为空", { action: "保存发送模板", outcome: "failure" });
      return;
    }
    const now = Date.now();
    const defaultTitle = \`模板 \${new Date(now).toLocaleString("zh-CN", { hour12: false })}（\${items.length} 种）\`;
    setTemplateNameDraft(defaultTitle);
    setTemplateNameModal({ defaultTitle, items });
  };`,
  `  const openTemplateNameModal = () => {
    closeCtx();
    if (!currentAoa || !config) return;
    const built = buildSelectedDataRows(currentAoa, selectedRows);
    if (!built) {
      push("请先勾选行");
      return;
    }
    const source = getCurrentTableSource(activeView, config) ?? "item";
    let items: SendTemplateItem[] = [];
    if (source === "item") {
      const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
      const ridx = resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn);
      items = buildSendItemsFromSelection(currentAoa, selectedRows, itemLineQty, ridx);
    }
    const now = Date.now();
    const rowCount = built.idxs.length;
    const defaultTitle =
      source === "item" && items.length > 0
        ? \`模板 \${new Date(now).toLocaleString("zh-CN", { hour12: false })}（\${rowCount} 行 · \${items.length} 种）\`
        : \`模板 \${new Date(now).toLocaleString("zh-CN", { hour12: false })}（\${rowCount} 行）\`;
    setTemplateNameDraft(defaultTitle);
    setTemplateNameModal({ defaultTitle, source, aoa: built.fullAoa, items });
  };`,
  "openTemplateNameModal",
);

rep(
  `  const commitTemplateSave = async (titleInput: string) => {
    if (!templateNameModal || !config) return;
    const trimmed = titleInput.trim();
    const title = trimmed || templateNameModal.defaultTitle;
    const items = mergeSendTemplateItems(templateNameModal.items);
    let list = [...config.sendTemplates];
    while (list.length >= MAX_SEND_TEMPLATES) {
      list.sort((a, b) => a.createdAt - b.createdAt);
      list.shift();
    }
    const tpl: SavedSendTemplate = {
      id: crypto.randomUUID(),
      title,
      createdAt: Date.now(),
      items,
    };
    await persist({ ...config, sendTemplates: [...list, tpl] });
    setTemplateNameModal(null);
    setTemplateNameDraft("");
    setSelectedRows(new Set());
    notify(\`已保存发送模板「\${title}」（\${items.length} 种道具）\`, {
      action: "保存发送模板",
      outcome: "success",
      detail: title,
    });
  };`,
  `  const commitTemplateSave = async (titleInput: string) => {
    if (!templateNameModal || !config) return;
    const trimmed = titleInput.trim();
    const title = trimmed || templateNameModal.defaultTitle;
    const items = mergeSendTemplateItems(templateNameModal.items);
    const { source, aoa } = templateNameModal;
    let list = [...config.savedTemplates];
    while (list.length >= MAX_TEMPLATES) {
      list.sort((a, b) => a.createdAt - b.createdAt);
      list.shift();
    }
    const tpl: SavedTemplate = {
      id: crypto.randomUUID(),
      title,
      createdAt: Date.now(),
      source,
      aoa,
      items,
    };
    await persist({ ...config, savedTemplates: [...list, tpl] });
    setTemplateNameModal(null);
    setTemplateNameDraft("");
    setSelectedRows(new Set());
    setActiveView({ kind: "template", id: tpl.id });
    const label = source === "item" ? "道具" : "任务";
    notify(\`已保存模板「\${title}」（\${label} · \${Math.max(0, aoa.length - 1)} 行）\`, {
      action: "保存为模板",
      outcome: "success",
      detail: title,
    });
  };`,
  "commitTemplateSave",
);

rep(
  `    const list = config.sendTemplates.map((t) => (t.id === id ? { ...t, title: trimmed } : t));
    await persist({ ...config, sendTemplates: list });`,
  `    const list = config.savedTemplates.map((t) => (t.id === id ? { ...t, title: trimmed } : t));
    await persist({ ...config, savedTemplates: list });`,
  "commitTemplateRename",
);

rep(
  `  const removeSendTemplate = async (id: string) => {
    if (!config) return;
    const list = config.sendTemplates.filter((t) => t.id !== id);
    await persist({ ...config, sendTemplates: list });
  };`,
  `  const removeTemplate = async (id: string) => {
    if (!config) return;
    const removed = config.savedTemplates.find((t) => t.id === id);
    const list = config.savedTemplates.filter((t) => t.id !== id);
    await persist({ ...config, savedTemplates: list });
    if (
      (activeView.kind === "template" || activeView.kind === "snapshot") &&
      activeView.id === id
    ) {
      setActiveView({ kind: removed?.source === "task" ? "task" : "item" });
      setSelectedRows(new Set());
    }
  };`,
  "removeTemplate",
);

// freeze template
rep(
  `    } else if (activeView.kind === "snapshot") {
      const list = config.savedSnapshots.map((s) =>
        s.id === activeView.id ? { ...s, freezeThroughHeader: headerName } : s,
      );
      await persist({ ...config, savedSnapshots: list });
    }`,
  `    } else if (activeView.kind === "template" || activeView.kind === "snapshot") {
      const list = config.savedTemplates.map((t) =>
        t.id === activeView.id ? { ...t, freezeThroughHeader: headerName } : t,
      );
      await persist({ ...config, savedTemplates: list });
    }`,
  "freeze template",
);

// freezeAnchorHeader
rep(
  `    if (activeView.kind === "snapshot") {
      return config.savedSnapshots.find((s) => s.id === activeView.id)?.freezeThroughHeader ?? null;
    }`,
  `    if (activeView.kind === "template" || activeView.kind === "snapshot") {
      return config.savedTemplates.find((t) => t.id === activeView.id)?.freezeThroughHeader ?? null;
    }`,
  "freezeAnchorHeader",
);

// goGmtExecute snapshot source
rep(
  `          : (config.savedSnapshots.find((s) => s.id === activeView.id)?.source ?? null);`,
  `          : (config.savedTemplates.find((t) => t.id === activeView.id)?.source ?? null);`,
  "goGmt snapshot source",
);

// context menu
rep(
  `      {ctxMenu ? (
        <motion.div className="context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => openSnapshotNameModal()}>
            保存选中到左侧
          </button>
          {isItemTableView ? (
            <button type="button" onClick={() => openTemplateNameModal()}>
              保存为发送模板
            </button>
          ) : null}
          {config.savedSnapshots.map((s) => {
            const label = s.title.length > 22 ? \`\${s.title.slice(0, 20)}…\` : s.title;
            return (
              <button
                key={s.id}
                type="button"
                title={s.title}
                onClick={() => void appendSelectedRowsToSnapshot(s.id)}
              >
                添加到「{label}」
              </button>
            );
          })}
          <button type="button" onClick={() => void goGmtExecute()}>`,
  `      {ctxMenu ? (
        <motion.div className="context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => openTemplateNameModal()}>
            保存为模板
          </button>
          <button type="button" onClick={() => void goGmtExecute()}>`,
  "context menu",
);

// Fix motion.div if introduced - use div
s = s.split("motion.div").join("motion.div");
s = s.split("motion.div").join("motion.div");

// sidebar - large block replace
const sidebarOld = `{sidebarCards.map((entry) => {
            const timeStr = new Date(entry.createdAt).toLocaleString("zh-CN", { hour12: false });
            if (entry.kind === "snapshot") {
              const s = entry.snap;
              const rowCount = Math.max(0, s.aoa.length - 1);
              const srcLabel = s.source === "item" ? "道具" : "任务";
              return (
                <motion.div
                  key={` + "`snap-${s.id}`" + `}
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
                  <motion.div className="card-title">{s.title}</motion.div>
                  <motion.div className="card-sub">
                    快照 · {srcLabel} · {rowCount} 行 · {timeStr}
                  </motion.div>
                </motion.div>
              );
            }
            const t = entry.tpl;
            return (
              <motion.div
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
                <motion.div className="card-title-row">
                  <span className="card-badge-send">发送</span>
                  <span className="card-title">{t.title}</span>
                </motion.div>
                <motion.div className="card-sub">
                  模板 · {t.items.length} 种道具 · {timeStr}
                </motion.div>
              </motion.div>
            );
          })}`;

// Read actual sidebar from file - it uses div not motion.div
const sidebarStart = s.indexOf("{sidebarCards.map((entry) => {");
const sidebarEnd = s.indexOf("})}\n          <p className=\"help\"", sidebarStart);
if (sidebarStart < 0 || sidebarEnd < 0) throw new Error("sidebar block not found");

const sidebarNew = `{sidebarTemplates.map((t) => {
            const timeStr = new Date(t.createdAt).toLocaleString("zh-CN", { hour12: false });
            const rowCount = Math.max(0, t.aoa.length - 1);
            const srcLabel = t.source === "item" ? "道具" : "任务";
            const isActive =
              (activeView.kind === "template" || activeView.kind === "snapshot") && activeView.id === t.id;
            const sendHint =
              t.source === "item" && t.items.length > 0 ? \` · \${t.items.length} 种可发\` : "";
            return (
              <motion.div
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
                  <motion.div className="card-template-actions" onClick={(e) => e.stopPropagation()}>
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

s = s.slice(0, sidebarStart) + sidebarNew + s.slice(sidebarEnd);

// fix motion.div in inserted block
s = s.split("motion.div").join("motion.div");

// template sidebar menu - use removeTemplate, remove 一键 from menu (on card now)
rep(
  `              const tpl = config.sendTemplates.find((t) => t.id === templateSidebarMenu.id);
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
  "template menu trim send",
);

rep(
  `              setPendingDeleteTemplate({ id, title });
            }}
          >
            删除
          </button>
        </motion.div>
      ) : null}

      {columnHeaderMenu`,
  `              setPendingDeleteTemplate({ id, title });
            }}
          >
            删除
          </button>
        </motion.div>
      ) : null}

      {columnHeaderMenu`,
  "template menu end",
);

rep(
  `    const list = config.sendTemplates.filter((t) => t.id !== id);
    await persist({ ...config, sendTemplates: list });`,
  `    void removeTemplate(id);`,
  "pending delete template - skip if already changed",
);

fs.writeFileSync(appPath, s, "utf8");
console.log("phase2 OK");
