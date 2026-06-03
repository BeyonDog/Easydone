// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = new URL("../src/App.tsx", import.meta.url);
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("  const Wizard = () => {");
const end = s.indexOf("  const SettingsModal = () => {");
if (start < 0 || end < 0) throw new Error("markers not found");

const wizard = `  const Wizard = () => {
    const [ex, setEx] = useState("");
    const [err, setErr] = useState<string | null>(null);

    const finish = async () => {
      setErr(null);
      const er = ex.trim();
      if (!er) {
        setErr("请选择 Excel 工作区根");
        return;
      }
      const ip = excelItemPath(er);
      const mp = excelMissionPath(er);
      try {
        await invoke("read_file_base64", { path: ip });
        await invoke("read_file_base64", { path: mp });
      } catch {
        setErr(\`Excel 文件无法读取：\\n\${ip}\\n\${mp}\`);
        return;
      }
      const next = { ...defaultConfig(), excelWorkspaceRoot: er, gmAssistantLocalPath: "" };
      await invoke("save_config", { config: next });
      setConfig(next);
      setWizardOpen(false);
      void loadExcelData(next);
    };

    return (
      <div className="modal-back">
        <motion className="modal">
          <h2>首次设置</h2>
          <p className="help">选择 Excel 工作区根目录（其下应有 Excel\\\\Item.xlsx 与 Excel\\\\Mission.xlsx）。</p>
          <motion className="field">
            <label>Excel 工作区根</label>
            <motion className="path">{ex || "未选择"}</motion>
            <motion className="btn-row">
              <button type="button" className="btn" onClick={() => void pickFolder("选择 Excel 工作区根").then(setEx)}>
                选择文件夹
              </button>
            </motion>
          </motion>
          {err ? <motion className="error">{err}</motion> : null}
          <motion className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              保存并开始
            </button>
          </motion>
        </motion>
      </motion>
    );
  };

`;

const fixed = wizard.replace(/motion/g, "div");
s = s.slice(0, start) + fixed + s.slice(end);
fs.writeFileSync(p, s, "utf8");
console.log("wizard patched");

