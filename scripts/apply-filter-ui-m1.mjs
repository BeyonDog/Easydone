/**
 * Modal M1 grid + type remark multi-select in filter modal.
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

const D = "div";

mustReplace(
  `                            <${D} className="filter-selection-summary" role="status">
                              <span className="filter-selection-summary-label">当前选择</span>
                              {itemFilterDraft.typeRemarkKeys[0] ? (
                                <span className="filter-selection-summary-value">
                                  {typeRemarkLabelPrefix(itemFilterDraft.typeRemarkKeys[0])}
                                  <span>{itemFilterDraft.typeRemarkKeys[0]}</span>
                                </span>
                              ) : (
                                <span className="filter-selection-summary-empty">（未选择）</span>
                              )}
                            </${D}>
                            <p className="help muted" style={{ marginBottom: "0.35rem" }}>`,
  `                            <p className="help muted" style={{ marginBottom: "0.35rem" }}>`,
  "remove filter-selection-summary",
);

mustReplace(
  `                            <${D} ref={itemFilterTypeRemarkScrollRef} className="item-filter-scroll item-filter-scroll--flex">
                              <FilterDnDOptionList
                                items={itemTypeRemarkDisplayKeys}
                                selectedKeys={itemFilterDraft.typeRemarkKeys}
                                labelPrefix={typeRemarkLabelPrefix}
                                onToggle={(opt) =>
                                  setItemFilterDraft((d) => ({
                                    ...d,
                                    typeRemarkKeys: d.typeRemarkKeys[0] === opt ? [] : [opt],
                                  }))
                                }
                                onReorderKeys={(orderedKeys) => setItemFilterDraft((d) => ({ ...d, typeRemarkKeyOrder: orderedKeys }))}
                              />
                            </${D}>`,
  `                            <${D} ref={itemFilterTypeRemarkScrollRef} className="item-filter-section-grid-wrap">
                              <FilterOptionGrid
                                items={itemTypeRemarkDisplayKeys}
                                selectedKeys={itemFilterDraft.typeRemarkKeys}
                                labelPrefix={typeRemarkLabelPrefix}
                                onToggle={(opt) =>
                                  setItemFilterDraft((d) => {
                                    const s = new Set(d.typeRemarkKeys);
                                    if (s.has(opt)) s.delete(opt);
                                    else s.add(opt);
                                    return { ...d, typeRemarkKeys: [...s] };
                                  })
                                }
                              />
                            </${D}>`,
  "typeRemark grid",
);

mustReplace(
  `                          <${D} className="item-filter-scroll item-filter-scroll--flex">
                            <FilterDnDOptionList
                              items={itemQualityDisplayKeys}
                              selectedKeys={itemFilterDraft.qualityKeys}
                              onToggle={(opt) =>
                                setItemFilterDraft((d) => {
                                  const s = new Set(d.qualityKeys);
                                  if (s.has(opt)) s.delete(opt);
                                  else s.add(opt);
                                  return { ...d, qualityKeys: [...s] };
                                })
                              }
                              onReorderKeys={(orderedKeys) => setItemFilterDraft((d) => ({ ...d, qualityKeyOrder: orderedKeys }))}
                            />
                          </${D}>`,
  `                          <${D} className="item-filter-section-grid-wrap">
                            <FilterOptionGrid
                              items={itemQualityDisplayKeys}
                              selectedKeys={itemFilterDraft.qualityKeys}
                              qualityDots
                              onToggle={(opt) =>
                                setItemFilterDraft((d) => {
                                  const s = new Set(d.qualityKeys);
                                  if (s.has(opt)) s.delete(opt);
                                  else s.add(opt);
                                  return { ...d, qualityKeys: [...s] };
                                })
                              }
                            />
                          </${D}>`,
  "quality grid",
);

fs.writeFileSync(appPath, s, "utf8");
const rem = (s.match(/\?\?\?/g) || []).length;
console.log("remaining ???", rem);
if (rem) process.exit(1);
console.log("OK");
