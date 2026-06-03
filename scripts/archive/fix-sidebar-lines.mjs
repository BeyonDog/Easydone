// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = "D:/AIWorkspace/easydone/src/App.tsx";
const lines = fs.readFileSync(p, "utf8").split("\n");
// 0-based: line 3309-3328 in file = index 3308-3327
lines[3308] = '            <motion.div className="card-title">全部道具</motion.div>'.replaceAll("motion.", "");
lines[3309] = '            <div className="card-sub">Item.xlsx · Item</div>';
lines[3310] = "          </div>";
lines[3325] = '            <div className="card-title">全部任务</div>';
lines[3326] = '            <div className="card-sub">Mission.xlsx · Task</div>';
lines[3327] = "          </div>";
let s = lines.join("\n");
s = s.replaceAll("<" + "motion.div", "<div").replaceAll("</" + "motion.div>", "</div>");
fs.writeFileSync(p, s, "utf8");
console.log("fixed lines");

