/**
 * Integrate Sidebar component, settings colors, remove old sidebar/menu.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src/App.tsx");
let s = fs.readFileSync(appPath, "utf8");

function mustReplace(old, neu, label) {
  if (!s.includes(old)) {
    console.error(`MISSING [${label}]`);
    process.exit(1);
  }
  s = s.split(old).join(neu);
}

mustReplace(
  `import { migrateConfigTemplates } from "./lib/templateMigrate";`,
  `import { migrateConfigTemplates } from "./lib/templateMigrate";
import { Sidebar } from "./Sidebar.tsx";
import { SidebarColorSettings } from "./SidebarColorSettings.tsx";
import {
  DEFAULT_SIDEBAR_ITEM_CARD_COLOR,
  DEFAULT_SIDEBAR_TASK_CARD_COLOR,
  normalizeSidebarCardColor,
  sidebarItemDefaultColor,
  sidebarTaskDefaultColor,
} from "./lib/sidebarCardColor.ts";`,
  "imports",
);

mustReplace(
  `  themeWallpaperOpacity: DEFAULT_THEME_WALLPAPER_OPACITY,
  initialItemFilterSheetShown: false,
`,
  `  themeWallpaperOpacity: DEFAULT_THEME_WALLPAPER_OPACITY,
  sidebarItemCardColor: DEFAULT_SIDEBAR_ITEM_CARD_COLOR,
  sidebarTaskCardColor: DEFAULT_SIDEBAR_TASK_CARD_COLOR,
  sidebarItemCardColorOverride: null,
  sidebarTaskCardColorOverride: null,
  sidebarTemplateOrder: null,
  initialItemFilterSheetShown: false,
`,
  "defaultConfig",
);

mustReplace(
  `  const [templateSidebarMenu, setTemplateSidebarMenu] = useState<{
    x: number;
    y: number;
    id: string;
    title: string;
  } | null>(null);
`,
  "",
  "remove templateSidebarMenu state",
);

mustReplace(
  `  const sidebarTemplates = useMemo(() => {
    if (!config) return [] as SavedTemplate[];
    return [...config.savedTemplates].sort((a, b) => b.createdAt - a.createdAt);
  }, [config]);

`,
  "",
  "remove sidebarTemplates",
);

mustReplace(
  `  const closeCtx = () => {
    setCtxMenu(null);
        setTemplateSidebarMenu(null);
    setColumnHeaderMenu(null);
  };`,
  `  const closeCtx = () => {
    setCtxMenu(null);
    setColumnHeaderMenu(null);
  };`,
  "closeCtx",
);

mustReplace(
  `    const [wallPending, setWallPending] = useState<{ ext: string; dataBase64: string } | null>(null);
    const [err, setErr] = useState<string | null>(null);`,
  `    const [wallPending, setWallPending] = useState<{ ext: string; dataBase64: string } | null>(null);
    const [sidebarItemHex, setSidebarItemHex] = useState(() =>
      sidebarItemDefaultColor(config ?? { savedTemplates: [] } as AppConfig),
    );
    const [sidebarTaskHex, setSidebarTaskHex] = useState(() =>
      sidebarTaskDefaultColor(config ?? { savedTemplates: [] } as AppConfig),
    );
    const [err, setErr] = useState<string | null>(null);`,
  "settings state",
);

mustReplace(
  `      setWallPending(null);
    }, [settingsOpen, config]);`,
  `      setWallPending(null);
      if (config) {
        setSidebarItemHex(sidebarItemDefaultColor(config));
        setSidebarTaskHex(sidebarTaskDefaultColor(config));
      }
    }, [settingsOpen, config]);`,
  "settings sync effect",
);

mustReplace(
  `        themeWallpaperRelativePath: nextWpRel,
        themeWallpaperOpacity: nextWpOp,
      };`,
  `        themeWallpaperRelativePath: nextWpRel,
        themeWallpaperOpacity: nextWpOp,
        sidebarItemCardColor: normalizeSidebarCardColor(sidebarItemHex, DEFAULT_SIDEBAR_ITEM_CARD_COLOR),
        sidebarTaskCardColor: normalizeSidebarCardColor(sidebarTaskHex, DEFAULT_SIDEBAR_TASK_CARD_COLOR),
      };`,
  "settings save",
);

mustReplace(
  `            <p className="help" style={{ marginTop: "0.35rem" }}>
              浅色背景时会自动切换为深色文字以保证可读性。
            </p>
          </div>
          <div className="field">
            <label>桌面壁纸</label>`,
  `            <p className="help" style={{ marginTop: "0.35rem" }}>
              浅色背景时会自动切换为深色文字以保证可读性。
            </p>
          </div>
          <SidebarColorSettings
            itemHex={sidebarItemHex}
            taskHex={sidebarTaskHex}
            onItemHexChange={setSidebarItemHex}
            onTaskHexChange={setSidebarTaskHex}
          />
          <div className="field">
            <label>桌面壁纸</label>`,
  "settings SidebarColorSettings",
);

const asideStart = s.indexOf('      <div className="body">');
const asideBlockStart = s.indexOf("        <aside", asideStart);
const asideBlockEnd = s.indexOf("        <motion.div className=\"main-column\">", asideBlockStart);
if (asideBlockStart < 0 || asideBlockEnd < 0) {
  // fallback without motion
  const asideBlockEnd2 = s.indexOf('        <div className="main-column">', asideBlockStart);
  if (asideBlockStart < 0 || asideBlockEnd2 < 0) {
    console.error("aside block not found", asideBlockStart, asideBlockEnd2);
    process.exit(1);
  }
  var endIdx = asideBlockEnd2;
} else {
  var endIdx = asideBlockEnd;
}

const sidebarJsx = `        <Sidebar
          config={config}
          activeView={activeView}
          filterSheetOpen={filterSheetOpen}
          onSelectItem={() => {
            setActiveView({ kind: "item" });
            setSelectedRows(new Set());
          }}
          onSelectTask={() => {
            setActiveView({ kind: "task" });
            setSelectedRows(new Set());
          }}
          onSelectTemplate={(id) => {
            setActiveView({ kind: "template", id });
            setSelectedRows(new Set());
          }}
          onPersist={persist}
          onOpenHiddenPanel={(panel) => {
            setColumnHeaderMenu(null);
            setHiddenPanel(panel);
          }}
          onTemplateRename={(id, title) => {
            setTemplateRenameModal({ id, draft: title });
          }}
          onTemplateDelete={(id, title) => {
            setPendingDeleteTemplate({ id, title });
          }}
          onSendTemplateNow={(title, items) => void sendTemplateItemsNow(title, items)}
          onBatchSend={(templateId, title, items) =>
            setSendTemplateModal({
              templateId,
              title,
              draftItems: items.map((it) => ({ ...it })),
            })
          }
          onCloseMenus={() => closeCtx()}
        />
`;

s = s.slice(0, asideBlockStart) + sidebarJsx + s.slice(endIdx);

mustReplace(
  `      {templateSidebarMenu ? (
        <div
          className="context-menu"
          style={{ left: templateSidebarMenu.x, top: templateSidebarMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const { id, title } = templateSidebarMenu;
              setTemplateSidebarMenu(null);
              setTemplateRenameModal({ id, draft: title });
            }}
          >
            重命名
          </button>
          <button
            type="button"
            onClick={() => {
              const { id, title } = templateSidebarMenu;
              setTemplateSidebarMenu(null);
              setPendingDeleteTemplate({ id, title });
            }}
          >
            删除
          </button>
        </div>
      ) : null}

`,
  "",
  "remove templateSidebarMenu menu",
);

fs.writeFileSync(appPath, s);
console.log("apply-sidebar-integration OK");
