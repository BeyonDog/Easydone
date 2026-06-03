// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = "D:/AIWorkspace/easydone/src/App.tsx";
let s = fs.readFileSync(p, "utf8");
const m = "motion";
s = s.replaceAll(`<${m}.motion.div`, "<div").replaceAll(`<${m}.div`, "<motion.div");
// brute
s = s.replaceAll("<" + m + ".motion.div", "<div").replaceAll("</" + m + ".motion.div>", "</div>");
s = s.replaceAll("<" + m + ".div", "<div").replaceAll("</" + m + ".motion.div>", "</div>");
s = s.replaceAll("</" + m + ".div>", "</div>");
// fix item/task cards block
s = s.replace(
  /<div className="card-title">[^<]*<\/div>\s*<motion.div className="card-sub">Item\.xlsx[^<]*<\/motion.div>\s*<\/motion.div>\s*<motion.div/,
  `<motion.div className="card ${'${'}activeView.kind === "item" ? "active" : ""}${'}'}">PLACEHOLDER`,
);
// simpler line-based fix around 3308
const lines = s.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i]?.includes('card-title">????')) lines[i] = '            <div className="card-title">全部道具</div>';
  if (lines[i]?.includes('card-title">全部道具') && lines[i + 2]?.includes("Mission.xlsx")) {
    lines[i] = '            <div className="card-title">全部任务</div>';
  }
}
s = lines.join("\n");
s = s.replaceAll("<" + m + ".div", "<div").replaceAll("</" + m + ".motion.div>", "</div>").replaceAll("</" + m + ".motion.div>", "</div>");
s = s.replaceAll("</" + m + ".div>", "</motion.div>");
s = s.replaceAll("</" + m + ".div>", "</div>");
fs.writeFileSync(p, s, "utf8");
console.log("ok");

