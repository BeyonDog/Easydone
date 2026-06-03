// DEPRECATED — use npm run restore:zh + verify:zh instead.
import fs from "fs";
const p = "D:/AIWorkspace/easydone/src/App.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replaceAll('<motion.div className="card-title">????</motion.div>', '<div className="card-title">PLACEHOLDER</motion.div>');
s = s.replaceAll('<div className="card-title">????</motion.div>', '<div className="card-title">PLACEHOLDER</motion.div>');
s = s.replaceAll('<div className="card-title">????</motion.div>', '<div className="card-title">PLACEHOLDER</motion.div>');
// fix: first placeholder item, second task
let n = 0;
s = s.replace(/<div className="card-title">PLACEHOLDER<\/motion.div>/g, () => {
  n++;
  return n === 1 ? '<div className="card-title">全部道具</div>' : '<div className="card-title">全部任务</div>';
});
s = s.replace(/Item\.xlsx \? Item/g, "Item.xlsx · Item");
s = s.replace(/Mission\.xlsx . Task/g, "Mission.xlsx · Task");
s = s.replaceAll("<" + "motion.div", "<" + "div").replaceAll("</" + "motion.div>", "</" + "div>");
fs.writeFileSync(p, s, "utf8");
console.log("done", n);

