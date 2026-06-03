/**
 * UTF-8 patches: Emote help text, send-template minus button.
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
  `                              预设「Emote」：类型备注含 Emote 且不含「大红检视」（如秀肌肉Emote、贵族礼仪Emote；排除大红检视Emote 类）。`,
  `                              预设「Emote」：保留「动作名+Emote」（如秀肌肉Emote、贵族礼仪Emote）；排除含「大红检视」的 Emote（如大红检视Emote…）。`,
  "emote help text",
);

mustReplace(
  `                        >
                          ?
                        </button>
                        <button
                          type="button"
                          className="btn btn-tiny"
                          onClick={() =>
                            setSendTemplateModal((m) =>
                              m
                                ? {
                                    ...m,
                                    draftItems: m.draftItems.map((row, i) =>
                                      i === idx ? { ...row, qty: Math.min(9999, row.qty + 1) } : row,
                                    ),
                                  }
                                : m,
                            )
                          }
                        >
                          +`,
  `                        >
                          -
                        </button>
                        <button
                          type="button"
                          className="btn btn-tiny"
                          onClick={() =>
                            setSendTemplateModal((m) =>
                              m
                                ? {
                                    ...m,
                                    draftItems: m.draftItems.map((row, i) =>
                                      i === idx ? { ...row, qty: Math.min(9999, row.qty + 1) } : row,
                                    ),
                                  }
                                : m,
                            )
                          }
                        >
                          +`,
  "send template minus",
);

fs.writeFileSync(appPath, s, "utf8");
const rem = (s.match(/\?\?\?/g) || []).length;
console.log("remaining ???", rem);
if (rem) process.exit(1);
console.log("OK");
