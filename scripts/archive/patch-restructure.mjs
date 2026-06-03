// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(root, "../src/App.tsx");
const fragPath = path.join(root, "filter-modals-fragment.txt");

let s = fs.readFileSync(appPath, "utf8");
const frag = fs.readFileSync(fragPath, "utf8").trim();

// Remove misplaced filter block (may start with or without indent)
const badStart = s.indexOf("{itemFilterModalOpen && config ? (");
const headerStart = s.indexOf("<header className=\"topbar\">");
if (badStart < 0 || headerStart < 0) throw new Error("markers " + badStart + " " + headerStart);

// find GoGmt before header
const gmtUse = s.lastIndexOf("<GoGmtModalView />", headerStart);
const gmtLogin = s.lastIndexOf("<GmtLoginModal />", headerStart);

let before = s.slice(0, badStart);
let after = s.slice(headerStart);

// remove any trailing GoGmt/GmtLogin between badStart and header
const middle = s.slice(badStart, headerStart);
if (middle.includes("GoGmtModalView")) {
  // strip filters + gmt from middle
} else {
  before = s.slice(0, badStart);
  after = s.slice(headerStart);
}

const cleaned = s.slice(0, badStart) + s.slice(headerStart);
const insert = `${frag}\n            <GoGmtModalView />\n      <GmtLoginModal />\n\n      `;
const headerIdx = cleaned.indexOf("<header className=\"topbar\">");
const out = cleaned.slice(0, headerIdx) + insert + cleaned.slice(headerIdx);
fs.writeFileSync(appPath, out, "utf8");
console.log("restructured");

