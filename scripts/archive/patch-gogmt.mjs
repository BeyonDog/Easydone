// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = new URL("../src/App.tsx", import.meta.url);
const lines = fs.readFileSync(p, "utf8").split("\n");
const d = "motion.div";
const block = [
  "  const GoGmtModalView = () => {",
  "    if (!goGmtModal) return null;",
  "    const { instruction, repeatVisit } = goGmtModal;",
  "    return (",
  '      <div className="modal-back" onMouseDown={() => setGoGmtModal(null)}>',
  '        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>',
  "          <h2>去 GMT 执行</h2>",
  '          <p className="help">',
  "            {repeatVisit ? (",
  "              <>",
  "                ① 在 easydone 顶栏完成 <b>GMT 登录与区服</b> 配置后发送。",
  "              </>",
  "            ) : (",
  "              <>",
  "                ② 或在 GM 工具页使用 <b>Ctrl+V</b> 粘贴指令。",
  "              </>",
  "            )}",
  "          </p>",
  '          <div className="field">',
  "            <label>指令预览</label>",
  '            <textarea className="bookmark" readOnly value={instruction} />',
  "          </div>",
  '          <div className="btn-row">',
  '            <button type="button" className="btn primary" onClick={() => setGoGmtModal(null)}>',
  "              知道了",
  "            </button>",
  "          </div>",
  "        </div>",
  "      </div>",
  "    );",
  "  };",
].join("\n");

let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === "  const GoGmtModalView = () => {") start = i;
  if (start >= 0 && lines[i] === "  };" && lines[i + 1] === "" && lines[i + 2]?.startsWith("  if (!config)")) {
    end = i;
    break;
  }
}
if (start < 0 || end < 0) throw new Error("GoGmtModalView not found");
lines.splice(start, end - start + 1, ...block.split("\n"));
for (let i = 0; i < lines.length; i++) {
  if (lines[i]?.match(/return <.*className="empty"/)) {
    lines[i] = '    return <div className="empty">加载配置…</div>;';
  }
}
fs.writeFileSync(p, lines.join("\n"), "utf8");
console.log("ok");

