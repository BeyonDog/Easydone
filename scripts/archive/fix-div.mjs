// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = new URL("../src/App.tsx", import.meta.url);
let s = fs.readFileSync(p, "utf8");
const bad = "</" + "motion" + ">";
const good = "</" + "div" + ">";
s = s.replaceAll(bad, good);
fs.writeFileSync(p, s, "utf8");
console.log("replaced", bad, "->", good);

