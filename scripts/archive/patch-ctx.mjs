// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = new URL("../src/App.tsx", import.meta.url);
let s = fs.readFileSync(p, "utf8");
s = s.replace(
  /<button type="button" onClick=\{\(\) => openSnapshotNameModal\(\)\}>\s*[^<]+\s*<\/button>/,
  `<button type="button" onClick={() => openSnapshotNameModal()}>
            保存选中到左侧
          </button>
          {isItemTableView ? (
            <button type="button" onClick={() => openTemplateNameModal()}>
              保存为发送模板
            </button>
          ) : null}`,
);
fs.writeFileSync(p, s, "utf8");
console.log("ctx patched");

