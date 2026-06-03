import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
let bad = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(name)) {
      const text = fs.readFileSync(p, "utf8");
      const m = text.match(/\?\?\?/g);
      if (m?.length) {
        console.error(`${path.relative(root, p)}: ${m.length} × '???'`);
        bad += m.length;
      }
    }
  }
}

walk(srcDir);
if (bad) {
  console.error(`\nverify:zh failed (${bad} occurrences)`);
  process.exit(1);
}
console.log("verify:zh OK — no ??? in src/");
