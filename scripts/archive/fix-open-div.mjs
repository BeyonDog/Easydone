// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = new URL("../src/App.tsx", import.meta.url);
let s = fs.readFileSync(p, "utf8");
const tag = "motion";
s = s.replaceAll("<" + tag + ' className="gmt-bar">', "<" + "div" + ' className="gmt-bar">');
fs.writeFileSync(p, s, "utf8");
console.log("ok");

