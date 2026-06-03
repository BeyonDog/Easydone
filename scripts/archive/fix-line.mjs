// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = new URL("../src/App.tsx", import.meta.url);
const lines = fs.readFileSync(p, "utf8").split("\n");
lines[2380] = '    return <div className="empty">加载配置…</motion>;';
lines[2380] = '    return <motion className="empty">加载配置…</motion>;';
const d = "div";
lines[2380] = `    return <${d} className="empty">加载配置…</${d}>;`;
fs.writeFileSync(p, lines.join("\n"), "utf8");
console.log(lines[2380]);

