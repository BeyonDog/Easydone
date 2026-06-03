/**
 * UTF-8 patches for Emote filter reinforcement in App.tsx
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src/App.tsx");
let s = fs.readFileSync(appPath, "utf8");

function mustReplace(old, neu, label) {
  if (!s.includes(old)) {
    console.error(`MISSING [${label}]`);
    process.exit(1);
  }
  s = s.split(old).join(neu);
}

mustReplace(
  `  ITEM_TYPE_REMARK_PRESET_EMOTE,
  rowMatchesEmotePreset,
  rowMatchesKeyword,`,
  `  ITEM_TYPE_REMARK_PRESET_EMOTE,
  isDaHongJianShiEmoteTypeRemark,
  rowMatchesEmotePreset,
  rowMatchesKeyword,`,
  "import isDaHongJianShiEmoteTypeRemark",
);

mustReplace(
  `      if (itemFilterColIdx.tr >= 0) typeSet.add(typeRemarkFilterKey(row[itemFilterColIdx.tr]));`,
  `      if (itemFilterColIdx.tr >= 0) {
        const trKey = typeRemarkFilterKey(row[itemFilterColIdx.tr]);
        if (!isDaHongJianShiEmoteTypeRemark(trKey)) typeSet.add(trKey);
      }`,
  "filter typeRemark options",
);

mustReplace(
  `                            </div>
                            <div ref={itemFilterTypeRemarkScrollRef} className="item-filter-scroll item-filter-scroll--flex">
                              <FilterDnDOptionList
                                items={itemTypeRemarkDisplayKeys}`,
  `                            </div>
                            <p className="help muted" style={{ marginBottom: "0.35rem" }}>
                              预设「Emote」：类型备注含 Emote 且不含「大红检视」（如秀肌肉Emote、贵族礼仪Emote；排除大红检视Emote 类）。
                            </p>
                            <div ref={itemFilterTypeRemarkScrollRef} className="item-filter-scroll item-filter-scroll--flex">
                              <FilterDnDOptionList
                                items={itemTypeRemarkDisplayKeys}`,
  "emote help",
);

fs.writeFileSync(appPath, s, "utf8");
const rem = (s.match(/\?\?\?/g) || []).length;
console.log("remaining ???", rem);
if (rem) process.exit(1);
console.log("OK");
