/**
 * Seed or remove「里程碑奖励」item send template in easydone config.json.
 * Usage:
 *   node scripts/seed-milestone-reward-template.mjs [--config <path>]
 *   node scripts/seed-milestone-reward-template.mjs --remove [--config <path>]
 */
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MILESTONE_ITEM_IDS = [
  "1001",
  "1331002",
  "1331003",
  "610427",
  "621065",
  "621085",
  "621156",
  "621167",
  "621176",
  "621217",
  "621227",
  "622055",
  "622075",
  "622106",
  "622136",
  "622157",
  "1264006",
  "1264007",
  "1264016",
  "1264017",
  "1264026",
  "1264027",
  "1264036",
  "1264037",
  "1264046",
  "1264047",
  "1264056",
  "1264057",
  "1264066",
  "1264067",
  "1264076",
  "1264077",
  "1264086",
  "1264087",
  "1264106",
  "1264107",
  "1264108",
  "1264115",
  "1269011",
  "1269112",
  "1269113",
  "1269114",
];

const TEMPLATE_TITLE = "里程碑奖励";

const DEFAULT_CONFIG_PATH = path.join(
  os.homedir(),
  "AppData",
  "Roaming",
  "com.easydone.desktop",
  "config.json",
);

const SIDEBAR_PINNED_IDS = [
  "pinned:item",
  "pinned:task",
  "pinned:addExp",
  "pinned:addSprout",
  "pinned:resetMatch",
  "pinned:uploadConfig",
];

function parseArgs(argv) {
  let configPath = DEFAULT_CONFIG_PATH;
  let remove = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--config" && argv[i + 1]) {
      configPath = path.resolve(argv[++i]);
    } else if (argv[i] === "--remove") {
      remove = true;
    }
  }
  return { configPath, remove };
}

function cellStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

function resolveItemIdColumnIndex(headers) {
  return headers.findIndex((h) => cellStr(h) === "物品ID");
}

function resolveRemarkColumnIndex(headers, saved) {
  if (saved) {
    const idx = headers.findIndex((h) => cellStr(h) === cellStr(saved));
    if (idx >= 0) return idx;
  }
  const remark = headers.findIndex((h) => cellStr(h) === "备注");
  if (remark >= 0) return remark;
  return headers.findIndex((h) => cellStr(h).includes("备注"));
}

function templateSidebarCardId(templateId) {
  return `template:${templateId}`;
}

function parseTemplateIdFromSidebarCardId(id) {
  return id.startsWith("template:") ? id.slice("template:".length) : null;
}

function mergeSidebarTemplateOrder(templates, savedOrder) {
  if (!templates.length) return [];
  const byId = new Map(templates.map((t) => [t.id, t]));
  const ordered = [];
  const used = new Set();
  if (savedOrder?.length) {
    for (const id of savedOrder) {
      const t = byId.get(id);
      if (t) {
        ordered.push(t);
        used.add(id);
      }
    }
  }
  const rest = templates
    .filter((t) => !used.has(t.id))
    .sort((a, b) => b.createdAt - a.createdAt);
  return [...ordered, ...rest];
}

function defaultSidebarCardOrder(config) {
  const templates = mergeSidebarTemplateOrder(
    config.savedTemplates ?? [],
    config.sidebarTemplateOrder,
  );
  const templateIds = templates.map((t) => templateSidebarCardId(t.id));
  return [...SIDEBAR_PINNED_IDS, ...templateIds];
}

function resolveSidebarCardOrder(config) {
  const savedTemplates = config.savedTemplates ?? [];
  const validPinned = new Set(SIDEBAR_PINNED_IDS);
  const validTemplateIds = new Set(savedTemplates.map((t) => templateSidebarCardId(t.id)));
  const valid = new Set([...validPinned, ...validTemplateIds]);

  const raw = config.sidebarCardOrder?.length
    ? config.sidebarCardOrder
    : defaultSidebarCardOrder(config);

  const ordered = [];
  const used = new Set();
  for (const id of raw) {
    if (!valid.has(id) || used.has(id)) continue;
    ordered.push(id);
    used.add(id);
  }

  for (const id of defaultSidebarCardOrder(config)) {
    if (!used.has(id)) {
      ordered.push(id);
      used.add(id);
    }
  }

  return ordered;
}

function extractTemplateOrderFromCardOrder(cardOrder) {
  const ids = [];
  for (const id of cardOrder) {
    const tid = parseTemplateIdFromSidebarCardId(id);
    if (tid) ids.push(tid);
  }
  return ids;
}

function applySidebarCardOrder(config, cardOrder) {
  const resolved = resolveSidebarCardOrder({ ...config, sidebarCardOrder: cardOrder });
  return {
    ...config,
    sidebarCardOrder: resolved,
    sidebarTemplateOrder: extractTemplateOrderFromCardOrder(resolved),
  };
}

function appendSidebarCardToLayout(config, cardId) {
  const order = resolveSidebarCardOrder(config);
  if (order.includes(cardId)) return config;
  return applySidebarCardOrder(config, [...order, cardId]);
}

function removeSidebarCardFromLayout(config, cardId) {
  const order = resolveSidebarCardOrder(config).filter((id) => id !== cardId);
  const hidden = (config.sidebarCardHidden ?? []).filter((id) => id !== cardId);
  return applySidebarCardOrder({ ...config, sidebarCardHidden: hidden }, order);
}

function removeMilestoneTemplate(config) {
  const savedTemplates = Array.isArray(config.savedTemplates) ? config.savedTemplates : [];
  const removed = savedTemplates.find((t) => t.title === TEMPLATE_TITLE);
  if (!removed) {
    return { config, removed: false };
  }

  const list = savedTemplates.filter((t) => t.title !== TEMPLATE_TITLE);
  const recycled = (config.recycledTemplates ?? []).filter(
    (r) => r.template?.title !== TEMPLATE_TITLE && r.template?.id !== removed.id,
  );
  const cardId = templateSidebarCardId(removed.id);
  const nextConfig = removeSidebarCardFromLayout(
    {
      ...config,
      savedTemplates: list,
      recycledTemplates: recycled,
    },
    cardId,
  );

  return { config: nextConfig, removed: true, id: removed.id };
}

function readItemSheetAoa(excelWorkspaceRoot) {
  const itemPath = path.join(excelWorkspaceRoot, "Excel", "Item.xlsx");
  if (!fs.existsSync(itemPath)) {
    throw new Error(`Item.xlsx not found: ${itemPath}`);
  }
  const wb = XLSX.read(fs.readFileSync(itemPath));
  const ws = wb.Sheets.Item ?? wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("No Item sheet in Item.xlsx");
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

function buildItemRowMap(aoa, idCol) {
  const map = new Map();
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row) continue;
    const id = cellStr(row[idCol]);
    if (!id) continue;
    if (!map.has(id)) map.set(id, row);
  }
  return map;
}

function alignRowToHeader(headerRow, row) {
  return Array.from({ length: headerRow.length }, (_, ci) =>
    row[ci] != null && row[ci] !== "" ? row[ci] : "",
  );
}

function sparseRowForId(headerRow, idCol, remarkCol, itemId, label) {
  const row = headerRow.map(() => "");
  row[idCol] = itemId;
  if (remarkCol >= 0 && label) row[remarkCol] = label;
  return row;
}

function buildTemplate(itemAoa, itemRemarkColumn) {
  const headerRow = itemAoa[0] ?? [];
  const headers = headerRow.map((h) => cellStr(h));
  const idCol = resolveItemIdColumnIndex(headers);
  if (idCol < 0) throw new Error("Item sheet missing 物品ID column");

  const remarkCol = resolveRemarkColumnIndex(headers, itemRemarkColumn);
  const rowMap = buildItemRowMap(itemAoa, idCol);

  const dataRows = [];
  const items = [];
  const missing = [];

  for (const itemId of MILESTONE_ITEM_IDS) {
    const fullRow = rowMap.get(itemId);
    let label = "";
    if (fullRow) {
      dataRows.push(alignRowToHeader(headerRow, fullRow));
      if (remarkCol >= 0) label = cellStr(fullRow[remarkCol]);
    } else {
      missing.push(itemId);
      dataRows.push(sparseRowForId(headerRow, idCol, remarkCol, itemId, ""));
    }
    items.push({
      itemId,
      qty: 1,
      label: label || undefined,
      wearValue: null,
      durabilityValue: null,
    });
  }

  return {
    template: {
      id: crypto.randomUUID(),
      title: TEMPLATE_TITLE,
      createdAt: Date.now(),
      source: "item",
      aoa: [headerRow.slice(), ...dataRows],
      items,
      freezeThroughHeader: null,
      cardColor: null,
    },
    missing,
  };
}

function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

function mainRemove(configPath) {
  if (!fs.existsSync(configPath)) {
    console.error("Config not found:", configPath);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const { config: nextConfig, removed, id } = removeMilestoneTemplate(config);
  if (!removed) {
    console.log(`Template "${TEMPLATE_TITLE}" not found in ${configPath} (nothing to do)`);
    return;
  }

  atomicWriteJson(configPath, nextConfig);
  console.log(`Removed template "${TEMPLATE_TITLE}" (id: ${id}) from ${configPath}`);
}

function main() {
  const { configPath, remove } = parseArgs(process.argv);
  if (remove) {
    mainRemove(configPath);
    return;
  }

  if (!fs.existsSync(configPath)) {
    console.error("Config not found:", configPath);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const excelRoot = config.excelWorkspaceRoot;
  if (!excelRoot?.trim()) {
    console.error("config.excelWorkspaceRoot is empty");
    process.exit(1);
  }

  const itemAoa = readItemSheetAoa(excelRoot);
  const { template, missing } = buildTemplate(itemAoa, config.itemRemarkColumn ?? null);

  const savedTemplates = Array.isArray(config.savedTemplates) ? [...config.savedTemplates] : [];
  const existingIdx = savedTemplates.findIndex((t) => t.title === TEMPLATE_TITLE);
  let finalId = template.id;
  if (existingIdx >= 0) {
    finalId = savedTemplates[existingIdx].id;
    savedTemplates[existingIdx] = { ...template, id: finalId };
    console.log(`Replaced existing template "${TEMPLATE_TITLE}" (id: ${finalId})`);
  } else {
    savedTemplates.push(template);
    console.log(`Added template "${TEMPLATE_TITLE}" (id: ${finalId})`);
  }

  let nextConfig = {
    ...config,
    savedTemplates,
  };

  const cardId = templateSidebarCardId(finalId);
  nextConfig = appendSidebarCardToLayout(nextConfig, cardId);

  atomicWriteJson(configPath, nextConfig);

  console.log(`Wrote ${MILESTONE_ITEM_IDS.length} items to ${configPath}`);
  if (missing.length) {
    console.warn(`Missing from Item.xlsx (${missing.length}):`, missing.join(", "));
  } else {
    console.log("All item IDs found in Item.xlsx");
  }
}

main();
