import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SheetMatrix } from "./lib/xlsxHelpers.ts";
import { readOptionalSheetFromWorkbook } from "./lib/xlsxHelpers.ts";
import { parseCsvToMatrix } from "./lib/rankLadder.ts";
import type { AppConfig, SendTemplateItem } from "./types.ts";
import type { ClassLoadoutCatalog } from "./lib/classLoadoutCatalog.ts";
import { buildClassLoadoutCatalog, collectQualitySendItems } from "./lib/classLoadoutCatalog.ts";
import { classLoadoutAccentForGroup } from "./lib/classLoadoutColors.ts";
import {
  classCsvCandidatePaths,
  classGroupCsvCandidatePaths,
  cookFixedRecipeCsvCandidatePaths,
  excelClassPath,
  itemTypeCsvCandidatePaths,
  purchasePlanCsvCandidatePaths,
  purchasePlanGroupCsvCandidatePaths,
  purchasePlanShowCsvCandidatePaths,
} from "./lib/paths.ts";

type Props = {
  config: AppConfig;
  itemAoa: SheetMatrix | null;
  onSendTemplateNow: (title: string, items: SendTemplateItem[]) => void | Promise<void>;
};

const QUALITY_CHIPS: readonly string[] = ["绿", "蓝", "紫", "金", "红"];

async function loadCsvAoa(candidatePaths: string[], parse: (text: string) => SheetMatrix): Promise<SheetMatrix> {
  let lastErr: unknown = null;
  for (const path of candidatePaths) {
    try {
      const text = await invoke<string>("read_text_file", { path });
      return parse(text);
    } catch (e) {
      lastErr = e;
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`读取 CSV 失败: ${msg}`);
}

export function ClassLoadoutPanel({ config, itemAoa, onSendTemplateNow }: Props) {
  const [catalog, setCatalog] = useState<ClassLoadoutCatalog | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const root = config.excelWorkspaceRoot?.trim();
    if (!root) return;
    if (!itemAoa) return;
    let cancelled = false;
    setLoadBusy(true);
    setLoadError(null);
    setCatalog(null);
    void (async () => {
      try {
        const [classGroupAoa, classAoa, itemTypeAoa, cookFixedRecipeAoa] = await Promise.all([
          loadCsvAoa(classGroupCsvCandidatePaths(root), parseCsvToMatrix),
          loadCsvAoa(classCsvCandidatePaths(root), parseCsvToMatrix),
          loadCsvAoa(itemTypeCsvCandidatePaths(root), parseCsvToMatrix),
          loadCsvAoa(cookFixedRecipeCsvCandidatePaths(root), parseCsvToMatrix),
        ]);

        let classGroupExcelAoa: SheetMatrix | null = null;
        let classExcelAoa: SheetMatrix | null = null;
        try {
          const classB64 = await invoke<string>("read_file_base64", { path: excelClassPath(root) });
          classGroupExcelAoa = readOptionalSheetFromWorkbook(classB64, "ClassGroup");
          classExcelAoa = readOptionalSheetFromWorkbook(classB64, "Class");
        } catch {
          // Excel Class.xlsx optional for display names; fall back to IDs in labels.
        }

        let purchasePlanShowAoa: SheetMatrix | null = null;
        let purchasePlanGroupAoa: SheetMatrix | null = null;
        let purchasePlanAoa: SheetMatrix | null = null;
        try {
          purchasePlanShowAoa = await loadCsvAoa(purchasePlanShowCsvCandidatePaths(root), parseCsvToMatrix);
          purchasePlanGroupAoa = await loadCsvAoa(purchasePlanGroupCsvCandidatePaths(root), parseCsvToMatrix);
          purchasePlanAoa = await loadCsvAoa(purchasePlanCsvCandidatePaths(root), parseCsvToMatrix);
        } catch {
          // optional
        }

        const built = buildClassLoadoutCatalog({
          classGroupAoa,
          classAoa,
          itemTypeAoa,
          itemAoa,
          cookFixedRecipeAoa,
          classGroupExcelAoa,
          classExcelAoa,
          purchasePlanShowAoa: purchasePlanShowAoa ?? null,
          purchasePlanGroupAoa: purchasePlanGroupAoa ?? null,
          purchasePlanAoa: purchasePlanAoa ?? null,
        });

        if (cancelled) return;
        setCatalog(built);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoadBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config.excelWorkspaceRoot, itemAoa]);

  useEffect(() => {
    if (!catalog?.browseEntries.length) return;
    if (selectedKey && catalog.browseEntries.some((e) => e.key === selectedKey)) return;
    setSelectedKey(catalog.browseEntries[0]!.key);
  }, [catalog, selectedKey]);

  const selectedEntry = useMemo(() => {
    if (!catalog || !selectedKey) return null;
    return catalog.browseEntries.find((e) => e.key === selectedKey) ?? null;
  }, [catalog, selectedKey]);

  const classNode = useMemo(() => {
    if (!catalog || !selectedEntry) return null;
    return catalog.classesById.get(selectedEntry.masteryId) ?? null;
  }, [catalog, selectedEntry]);

  const qualityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!classNode) return counts;
    for (const q of QUALITY_CHIPS) {
      counts[q] = collectQualitySendItems(classNode, q).length;
    }
    return counts;
  }, [classNode]);

  const sendQuality = async (qualityBucket: string) => {
    if (!classNode || !selectedEntry || sending) return;
    const items = collectQualitySendItems(classNode, qualityBucket);
    if (items.length === 0) return;
    setSending(true);
    try {
      const title = `职业出装 ${selectedEntry.label}·${qualityBucket}`;
      await onSendTemplateNow(title, items);
    } finally {
      setSending(false);
    }
  };

  if (loadError) {
    return <div className="empty error">{loadError}</div>;
  }

  if (!catalog) {
    return (
      <div className="empty">
        {loadBusy ? "加载职业出装数据中…" : itemAoa ? "初始化中…" : "缺少 Item.xlsx 数据"}
      </div>
    );
  }

  return (
    <div className="panel panel--class-loadout">
      <div className="panel-title">职业出装</div>
      <p className="help" style={{ marginBottom: 12 }}>
        选中精通后，点击品质即可发放该档全部武器、防具与对应料理
      </p>

      <div className="class-loadout-mastery-grid">
        {catalog.browseEntries.map((entry) => {
          const active = entry.key === selectedKey;
          const accent = classLoadoutAccentForGroup(entry.classGroupId);
          return (
            <button
              key={entry.key}
              type="button"
              className={`btn class-loadout-mastery-btn${active ? " is-active" : ""}`}
              style={{ "--cl-accent": accent } as CSSProperties}
              disabled={sending}
              aria-pressed={active}
              onClick={() => setSelectedKey(entry.key)}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="card-sub" style={{ marginBottom: 8 }}>
        品质一键发放
        {selectedEntry ? ` · ${selectedEntry.label}` : ""}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {QUALITY_CHIPS.map((q) => {
          const n = qualityCounts[q] ?? 0;
          return (
            <button
              key={q}
              type="button"
              className="btn chip"
              disabled={sending || !selectedEntry || n === 0}
              title={n === 0 ? "该品质暂无道具" : `发放 ${n} 件`}
              onClick={() => void sendQuality(q)}
            >
              {q}
              {n > 0 ? ` (${n})` : ""}
            </button>
          );
        })}
        {sending ? <span className="help">发放中…</span> : null}
      </div>
    </div>
  );
}
