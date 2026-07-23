/**
 * Scan CNRCT player-facing text against 屏蔽词库.pdf and export Excel report.
 * Usage: node scripts/scan-banned-words.mjs
 */
import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import XLSX from "xlsx";

const CNRCT = "D:/WorkSpacelml/Branches/CNRCT";
const PDF_PATH = "C:/Users/user/Desktop/屏蔽词库.pdf";
const OUT_PATH = "C:/Users/user/Desktop/屏蔽词扫描结果.xlsx";
const FINANCE_OUT_PATH = "C:/Users/user/Desktop/理财助手违禁词扫描.xlsx";
const BIZ_CTRL_DIR =
  "D:/WorkSpacelml/Branches/CNRCT/Client/Assets/Scripts/KradGame/UI/Controller/BusinessmanControllers";

const CATEGORY_HEADERS = new Set([
  "屏蔽词库",
  "政治类",
  "犯罪词汇",
  "宗教、迷信",
  "国内政要人物：",
  "国外政要人物：",
  "敏感人物名称或代号：",
  "涉嫌反动、恐怖主义敏感词汇",
  "维稳类防绕词",
  "共产党与政府相关",
  "国家领导人相关",
  "邪教组织相关",
  "两会专题",
  "社会性事件",
  "社会性事件（单词）",
  "主词：",
  "副词：",
  "九八印尼",
  "配置说明",
]);

/** @typedef {{ module: string, file: string, id: string, field: string, stringKey: string, text: string }} CorpusEntry */

/** @param {string} key */
function classifyModule(key) {
  const k = String(key || "").toUpperCase();
  if (/^TXT_(ITEM|RYO_ITEM|COMMON_UI_QUALITY|COMMON_CLASS|HERO|GREATCHEST|CONSUMABLE|WEAPON|ARMOR|TREASURE|MATERIAL|JEWELRY|COSTUME|BUNDLE|CHEST|COUPON|EMOTE|HEAD_|BANNER|ID_CARD|CUISINE|INGAME)/.test(k))
    return "道具Popover";
  if (/^TXT_(TASK|CONDITION|TASKCHAIN|TASKTAB|TERM|MISSION|INGAME_MISSION|HUNTER_TRIAL|LEVEL_ROAD|BP_|BATTLEPASS)/.test(k))
    return "任务";
  if (/^TXT_(DIALOG|NPC|MERCHANT|TALK|RECRUIT)/.test(k))
    return "NPC对话";
  if (/^TXT_(CAMP|YQY_CAMP|WAREHOUSE|ALCHEMY|MAKE_ITEM|HUNTER_ROAD)/.test(k))
    return "营地/升级";
  if (/^TXT_(HH_|ZF_|WCL_|HH_MODE|SELECTION_MODE)/.test(k))
    return "模式/大厅UI";
  if (/^TXT_/.test(k)) return "其它本地化";
  return "其它";
}

/** @param {unknown[][]} rows @param {number} headerRow */
function findCol(rows, headerRow, names) {
  const h = rows[headerRow] || [];
  for (let i = 0; i < h.length; i++) {
    const v = String(h[i] || "").trim();
    if (names.some((n) => v === n || v.includes(n))) return i;
  }
  return -1;
}

/** @param {string} filePath */
function readXlsx(filePath) {
  return XLSX.readFile(filePath, { cellDates: false, cellNF: false, cellText: false });
}

/** @returns {Map<string, string>} */
function loadLocalization() {
  const wb = readXlsx(path.join(CNRCT, "Excel/Item.xlsx"));
  const sheetName = wb.SheetNames.find((n) => n.includes("正式名称"));
  if (!sheetName) throw new Error("找不到本地化 sheet @正式名称&音效查找");
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
  /** @type {Map<string, string>} */
  const map = new Map();
  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][0] || "").trim();
    const zh = String(rows[i][1] || "").trim();
    if (!key || !zh || key === "Key") continue;
    map.set(key, zh);
  }
  return map;
}

/**
 * @param {Map<string, string>} loc
 * @returns {CorpusEntry[]}
 */
function collectCorpus(loc) {
  /** @type {CorpusEntry[]} */
  const entries = [];
  const seen = new Set();

  /** @param {CorpusEntry} e */
  function add(e) {
    const sig = `${e.module}|${e.stringKey}|${e.text}|${e.field}|${e.id}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    entries.push(e);
  }

  /** @param {string} key @param {string} module @param {string} file @param {string} id @param {string} field */
  function addKey(key, module, file, id, field) {
    if (!key || key === "null" || key === "NULL") return;
    const k = String(key).trim();
    const text = loc.get(k);
    if (!text) return;
    add({
      module: module || classifyModule(k),
      file,
      id: String(id ?? ""),
      field,
      stringKey: k,
      text,
    });
  }

  // --- 全量本地化（按 key 前缀分类）---
  for (const [key, text] of loc) {
    if (!text || text.length < 1) continue;
    add({
      module: classifyModule(key),
      file: "Excel/Item.xlsx (@正式名称&音效查找)",
      id: "",
      field: "Chinese Simplified",
      stringKey: key,
      text,
    });
  }

  // --- Item: 名称/描述/效用 ---
  {
    const wb = readXlsx(path.join(CNRCT, "Excel/Item.xlsx"));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets["Item"], { header: 1, defval: "" });
    const dataStart = 5;
    for (let i = dataStart; i < rows.length; i++) {
      const r = rows[i];
      const itemId = r[0];
      if (itemId === "" || itemId == null) continue;
      addKey(r[3], "道具Popover", "Excel/Item.xlsx (Item)", itemId, "物品名称");
      addKey(r[17], "道具Popover", "Excel/Item.xlsx (Item)", itemId, "通用效用描述");
      addKey(r[18], "道具Popover", "Excel/Item.xlsx (Item)", itemId, "背景故事");
    }
    // QualityType
    const qrows = XLSX.utils.sheet_to_json(wb.Sheets["QualityType"], { header: 1, defval: "" });
    for (let i = 5; i < qrows.length; i++) {
      addKey(qrows[i][4], "道具Popover", "Excel/Item.xlsx (QualityType)", qrows[i][0], "品质名");
    }
    // ItemType subtypes
    const trows = XLSX.utils.sheet_to_json(wb.Sheets["ItemType"], { header: 1, defval: "" });
    for (let i = 5; i < trows.length; i++) {
      addKey(trows[i][4], "道具Popover", "Excel/Item.xlsx (ItemType)", trows[i][0], "子类名称");
    }
  }

  // --- Mission: Task / TaskChain / Condition ---
  {
    const wb = readXlsx(path.join(CNRCT, "Excel/Mission.xlsx"));
    const taskRows = XLSX.utils.sheet_to_json(wb.Sheets["Task"], { header: 1, defval: "" });
    for (let i = 5; i < taskRows.length; i++) {
      const r = taskRows[i];
      addKey(r[3], "任务", "Excel/Mission.xlsx (Task)", r[0], "任务标题");
      addKey(r[4], "任务", "Excel/Mission.xlsx (Task)", r[0], "任务描述");
    }
    const chainRows = XLSX.utils.sheet_to_json(wb.Sheets["TaskChain"], { header: 1, defval: "" });
    for (let i = 5; i < chainRows.length; i++) {
      const r = chainRows[i];
      addKey(r[3], "任务", "Excel/Mission.xlsx (TaskChain)", r[1], "任务链名称");
      addKey(r[4], "任务", "Excel/Mission.xlsx (TaskChain)", r[1], "任务链描述");
    }
    const cRows = XLSX.utils.sheet_to_json(wb.Sheets["Condition"], { header: 1, defval: "" });
    for (let i = 5; i < cRows.length; i++) {
      const r = cRows[i];
      addKey(r[2], "任务", "Excel/Mission.xlsx (Condition)", r[0], "任务条件文本");
    }
    const tabSheet = wb.Sheets["TaskTab"];
    if (tabSheet) {
      const tabRows = XLSX.utils.sheet_to_json(tabSheet, { header: 1, defval: "" });
      for (let i = 5; i < tabRows.length; i++) {
        addKey(tabRows[i][1], "任务", "Excel/Mission.xlsx (TaskTab)", tabRows[i][0], "页签名称");
      }
    }
  }

  // --- Dialog ---
  {
    const wb = readXlsx(path.join(CNRCT, "Excel/Dialog.xlsx"));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets["DialogContent"], { header: 1, defval: "" });
    for (let i = 5; i < rows.length; i++) {
      const r = rows[i];
      addKey(r[2], "NPC对话", "Excel/Dialog.xlsx (DialogContent)", r[0], "对话文本");
    }
  }

  // --- MerchantDialog ---
  {
    const p = path.join(CNRCT, "Excel/MerchantDialog.xlsx");
    if (fs.existsSync(p)) {
      const wb = readXlsx(p);
      const sheet = wb.Sheets["MerchantDialog"];
      if (sheet) {
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const keyCol = findCol(rows, 3, ["DialogStringKey", "StringKey", "对话"]);
        const idCol = findCol(rows, 3, ["ID", "MerchantDialogID"]);
        for (let i = 5; i < rows.length; i++) {
          const r = rows[i];
          const keys = [];
          if (keyCol >= 0) keys.push(r[keyCol]);
          // scan all string-key-like cells
          for (const cell of r) {
            const s = String(cell || "").trim();
            if (/^TXT_/.test(s)) keys.push(s);
          }
          for (const k of keys) addKey(k, "NPC对话", "Excel/MerchantDialog.xlsx", r[idCol >= 0 ? idCol : 0], "商人对话");
        }
      }
    }
  }

  // --- Camp upgrade ---
  {
    const wb = readXlsx(path.join(CNRCT, "Excel/Camp.xlsx"));
    for (const sn of wb.SheetNames) {
      if (!/Upgrade|Camp|Privilege|WareHouse|Alchem|MakeItem|Hunter/.test(sn)) continue;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: "" });
      for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < (rows[i]?.length || 0); j++) {
          const s = String(rows[i][j] || "").trim();
          if (/^TXT_/.test(s)) {
            addKey(s, "营地/升级", `Excel/Camp.xlsx (${sn})`, rows[i][0] ?? i, "StringKey");
          }
        }
      }
    }
  }

  // --- Reward names (任务奖励) ---
  {
    const wb = readXlsx(path.join(CNRCT, "Excel/Item.xlsx"));
    // Reward might be in Mission or separate - check AppItemReward
    const rp = path.join(CNRCT, "Excel/AppItemReward.xlsx");
    if (fs.existsSync(rp)) {
      const rwb = readXlsx(rp);
      for (const sn of rwb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(rwb.Sheets[sn], { header: 1, defval: "" });
        for (let i = 0; i < rows.length; i++) {
          for (const cell of rows[i] || []) {
            const s = String(cell || "").trim();
            if (/^TXT_/.test(s)) addKey(s, "任务", `Excel/AppItemReward.xlsx (${sn})`, "", "奖励名");
          }
        }
      }
    }
  }

  return entries;
}

/** @param {string} dir @returns {string[]} */
function listCsFiles(dir) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...listCsFiles(p));
    else if (name.endsWith(".cs")) out.push(p);
  }
  return out;
}

/**
 * 理财助手（批量处理）页面专属语料。
 * @param {Map<string, string>} loc
 * @returns {CorpusEntry[]}
 */
function collectFinanceHelper(loc) {
  /** @type {CorpusEntry[]} */
  const entries = [];
  const seen = new Set();
  const MODULE = "理财助手(批量处理)";

  /** @param {CorpusEntry} e */
  function add(e) {
    const sig = `${e.module}|${e.stringKey}|${e.text}|${e.field}|${e.id}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    entries.push(e);
  }

  /** @param {string} key @param {string} file @param {string} field @param {string} [id] */
  function addKey(key, file, field, id = "") {
    if (!key || key === "null") return;
    const k = String(key).trim();
    const text = loc.get(k);
    if (!text) return;
    add({ module: MODULE, file, id: String(id), field, stringKey: k, text });
  }

  // 1) 全部 TXT_WX_FINANCIAL_*
  for (const [key, text] of loc) {
    if (!/^TXT_WX_FINANCIAL_/.test(key)) continue;
    add({
      module: MODULE,
      file: "Excel/Item.xlsx (@正式名称&音效查找)",
      id: "",
      field: "UI文案",
      stringKey: key,
      text,
    });
  }

  // 2) BusinessmanControllers 内引用的 StringKey.TXT_*
  const csFiles = listCsFiles(BIZ_CTRL_DIR);
  const keyRe = /StringKey\.(TXT_[A-Z0-9_]+)/g;
  for (const csPath of csFiles) {
    const src = fs.readFileSync(csPath, "utf8");
    const rel = path.relative(BIZ_CTRL_DIR, csPath).replace(/\\/g, "/");
    /** @type {Set<string>} */
    const keys = new Set();
    let m;
    while ((m = keyRe.exec(src))) keys.add(m[1]);
    // 字符串字面量里的 key（少数直接写 "TXT_..."）
    const litRe = /"(TXT_[A-Z0-9_]+)"/g;
    while ((m = litRe.exec(src))) keys.add(m[1]);
    for (const k of keys) {
      addKey(k, `BusinessmanControllers/${rel}`, "代码引用StringKey");
    }
  }

  // 3) 批量处理商人 NPC 气泡：TXT_DIALOG_NPC01_2201*
  for (const [key, text] of loc) {
    if (!/^TXT_DIALOG_NPC01_2201/.test(key)) continue;
    add({
      module: MODULE,
      file: "Excel/Dialog.xlsx / 本地化",
      id: key.replace(/^TXT_DIALOG_NPC01_/, ""),
      field: "NPC台词",
      stringKey: key,
      text,
    });
  }

  return entries;
}

/**
 * @param {CorpusEntry[]} corpus
 * @param {string[]} bannedWords
 * @param {RegExp[]} matchers
 */
function scanCorpus(corpus, bannedWords, matchers) {
  /** @type {Record<string, unknown>[]} */
  const bannedRows = [];
  /** @type {Record<string, unknown>[]} */
  const englishRows = [];
  const englishSeen = new Set();

  for (const e of corpus) {
    const hits = findBannedMatches(e.text, matchers, bannedWords);
    if (hits.length) {
      bannedRows.push({
        模块: e.module,
        文件: e.file,
        ID: e.id,
        字段: e.field,
        StringKey: e.stringKey,
        原文: e.text.length > 500 ? e.text.slice(0, 500) + "…" : e.text,
        命中违禁词: hits.join(" | "),
        命中数: hits.length,
      });
    }
    const frags = extractEnglishFragments(e.text);
    if (frags.length) {
      const sig = `${e.stringKey}|${e.text}`;
      if (!englishSeen.has(sig)) {
        englishSeen.add(sig);
        englishRows.push({
          模块: e.module,
          文件: e.file,
          ID: e.id,
          字段: e.field,
          StringKey: e.stringKey,
          原文: e.text.length > 500 ? e.text.slice(0, 500) + "…" : e.text,
          英文字母片段: frags.join(" | "),
        });
      }
    }
  }

  bannedRows.sort(
    (a, b) =>
      String(a.模块).localeCompare(String(b.模块), "zh") ||
      Number(b.命中数) - Number(a.命中数)
  );
  englishRows.sort((a, b) => String(a.模块).localeCompare(String(b.模块), "zh"));
  return { bannedRows, englishRows };
}

/**
 * Append finance rows into existing 屏蔽词扫描结果.xlsx (dedupe by StringKey+原文+模块).
 * @param {Record<string, unknown>[]} bannedRows
 * @param {Record<string, unknown>[]} englishRows
 */
function appendToMainReport(bannedRows, englishRows) {
  if (!fs.existsSync(OUT_PATH)) {
    console.warn(`主报告不存在，跳过追加: ${OUT_PATH}`);
    return;
  }
  const wb = XLSX.readFile(OUT_PATH);
  const bannedSheet = wb.Sheets["违禁词命中"];
  const englishSheet = wb.Sheets["含英文字母"];
  const metaSheet = wb.Sheets["扫描说明"];

  const existingBanned = bannedSheet
    ? XLSX.utils.sheet_to_json(bannedSheet)
    : [];
  const existingEnglish = englishSheet
    ? XLSX.utils.sheet_to_json(englishSheet)
    : [];

  const bannedSig = new Set(
    existingBanned.map(
      (r) => `${r["模块"]}|${r["StringKey"]}|${r["原文"]}|${r["字段"]}`
    )
  );
  const englishSig = new Set(
    existingEnglish.map(
      (r) => `${r["模块"]}|${r["StringKey"]}|${r["原文"]}|${r["字段"]}`
    )
  );

  let addedBanned = 0;
  for (const r of bannedRows) {
    const sig = `${r["模块"]}|${r["StringKey"]}|${r["原文"]}|${r["字段"]}`;
    if (bannedSig.has(sig)) continue;
    existingBanned.push(r);
    bannedSig.add(sig);
    addedBanned++;
  }
  let addedEnglish = 0;
  for (const r of englishRows) {
    const sig = `${r["模块"]}|${r["StringKey"]}|${r["原文"]}|${r["字段"]}`;
    if (englishSig.has(sig)) continue;
    existingEnglish.push(r);
    englishSig.add(sig);
    addedEnglish++;
  }

  existingBanned.sort(
    (a, b) =>
      String(a["模块"]).localeCompare(String(b["模块"]), "zh") ||
      Number(b["命中数"] || 0) - Number(a["命中数"] || 0)
  );
  existingEnglish.sort((a, b) =>
    String(a["模块"]).localeCompare(String(b["模块"]), "zh")
  );

  const metaRows = metaSheet ? XLSX.utils.sheet_to_json(metaSheet) : [];
  metaRows.push({
    项: "理财助手追加时间",
    值: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
  });
  metaRows.push({
    项: "理财助手追加违禁词行",
    值: addedBanned,
  });
  metaRows.push({
    项: "理财助手追加英文字母行",
    值: addedEnglish,
  });

  const out = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    out,
    XLSX.utils.json_to_sheet(existingBanned),
    "违禁词命中"
  );
  XLSX.utils.book_append_sheet(
    out,
    XLSX.utils.json_to_sheet(existingEnglish),
    "含英文字母"
  );
  XLSX.utils.book_append_sheet(
    out,
    XLSX.utils.json_to_sheet(metaRows),
    "扫描说明"
  );
  XLSX.writeFile(out, OUT_PATH);
  console.log(
    `已追加进主报告: +违禁词 ${addedBanned}, +英文字母 ${addedEnglish} -> ${OUT_PATH}`
  );
}

/** @param {string} pdfText */
function extractBannedWords(pdfText) {
  const raw = pdfText
    .replace(/\r\n/g, "\n")
    .replace(/(\d+)\s+of\s+(\d+)/gi, "\n")
    .split(/[\n,、，；;]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  /** @type {Set<string>} */
  const words = new Set();
  /** @type {string[]} */
  const skippedShort = [];

  for (let token of raw) {
    // strip page-only numbers
    if (/^\d+$/.test(token)) continue;
    if (CATEGORY_HEADERS.has(token)) continue;
    if (/^[\u4e00-\u9fff]{1,8}类/.test(token)) continue;
    if (/^[\u4e00-\u9fff]+：$/.test(token)) continue;
    // remove leading enumeration
    token = token.replace(/^[\d\.]+、/, "").trim();
    if (!token) continue;
    if (token.length < 2) {
      skippedShort.push(token);
      continue;
    }
    words.add(token);
  }

  // sort longest first for reporting priority
  const list = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b, "zh"));
  return { list, skippedShort: [...new Set(skippedShort)] };
}

/** @param {string} word */
function escapeRegExp(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build batched matchers to avoid O(n*m) string scans on huge word lists.
 * @param {string[]} words
 */
function buildBannedMatchers(words) {
  const BATCH = 400;
  /** @type {RegExp[]} */
  const regexes = [];
  for (let i = 0; i < words.length; i += BATCH) {
    const batch = words.slice(i, i + BATCH).map(escapeRegExp);
    if (!batch.length) continue;
    regexes.push(new RegExp(batch.join("|"), "gi"));
  }
  return regexes;
}

/** @param {string} text @param {RegExp[]} matchers @param {string[]} words */
function findBannedMatches(text, matchers, words) {
  if (!text) return [];
  /** @type {Set<string>} */
  const hitSet = new Set();
  for (const re of matchers) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      hitSet.add(m[0]);
    }
  }
  // map back to canonical word from list (case-insensitive)
  const lowerText = text.toLowerCase();
  /** @type {string[]} */
  const hits = [];
  for (const w of words) {
    if (hitSet.has(w) || lowerText.includes(w.toLowerCase())) hits.push(w);
    if (hits.length >= 20) break; // cap per row
  }
  return hits;
}

/** @param {string} frag */
function isRichTextColorNoise(frag) {
  const f = String(frag || "");
  if (!f) return true;
  if (/^color$/i.test(f)) return true;
  // hex color tokens from <color=#RRGGBB> etc.
  if (/^[0-9A-Fa-f]{3}$/.test(f)) return true;
  if (/^[0-9A-Fa-f]{6}$/.test(f)) return true;
  if (/^[0-9A-Fa-f]{8}$/.test(f)) return true;
  return false;
}

/** @param {string} text */
function extractEnglishFragments(text) {
  if (!text || !/[A-Za-z]/.test(text)) return [];
  /** @type {Set<string>} */
  const frags = new Set();
  const re = /[A-Za-z][A-Za-z0-9._\-]*/g;
  let m;
  while ((m = re.exec(text))) {
    if (isRichTextColorNoise(m[0])) continue;
    frags.add(m[0]);
  }
  return [...frags];
}

/**
 * Clean 「英文字母片段」cell: drop color/hex noise; return null if empty after filter.
 * @param {string} fragmentCell
 * @returns {string|null}
 */
function cleanEnglishFragmentCell(fragmentCell) {
  const parts = String(fragmentCell || "")
    .split(/\s*\|\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => !isRichTextColorNoise(p));
  if (!parts.length) return null;
  return parts.join(" | ");
}

async function runFinanceScan(bannedWords, skippedShort, loc, matchers) {
  console.log("Collecting 理财助手(批量处理) corpus...");
  const financeCorpus = collectFinanceHelper(loc);
  console.log(`Finance corpus entries: ${financeCorpus.length}`);

  const { bannedRows, englishRows } = scanCorpus(
    financeCorpus,
    bannedWords,
    matchers
  );
  console.log(
    `Finance hits: banned=${bannedRows.length}, english=${englishRows.length}`
  );

  const metaRows = [
    {
      项: "扫描时间",
      值: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    },
    { 项: "词库来源", 值: PDF_PATH },
    { 项: "词库词条数(长度>=2)", 值: bannedWords.length },
    {
      项: "跳过短词(长度<2)",
      值:
        skippedShort.slice(0, 50).join("、") +
        (skippedShort.length > 50 ? "…" : ""),
    },
    { 项: "模块", 值: "理财助手(批量处理)" },
    {
      项: "语料来源",
      值: "TXT_WX_FINANCIAL_* + BusinessmanControllers/*.cs 引用键 + TXT_DIALOG_NPC01_2201* NPC台词",
    },
    { 项: "扫描语料条", 值: financeCorpus.length },
    { 项: "违禁词命中条", 值: bannedRows.length },
    { 项: "含英文字母条", 值: englishRows.length },
    { 项: "短词策略", 值: "长度<2的词条不参与子串匹配" },
    {
      项: "英文检测",
      值: "原文中匹配 [A-Za-z] 连续片段（含 Lv、S 占位等）",
    },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(bannedRows),
    "违禁词命中"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(englishRows),
    "含英文字母"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(metaRows),
    "扫描说明"
  );
  XLSX.writeFile(wb, FINANCE_OUT_PATH);
  console.log(`新表已写出: ${FINANCE_OUT_PATH}`);

  appendToMainReport(bannedRows, englishRows);
  return { bannedRows, englishRows, financeCorpus };
}

async function main() {
  const financeOnly = process.argv.includes("--finance");

  console.log("Reading PDF...");
  const pdfBuf = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: pdfBuf });
  const pdfData = await parser.getText();
  const { list: bannedWords, skippedShort } = extractBannedWords(pdfData.text);
  console.log(
    `Banned words (len>=2): ${bannedWords.length}, skipped short: ${skippedShort.length}`
  );

  console.log("Loading localization...");
  const loc = loadLocalization();
  console.log(`Localization entries: ${loc.size}`);

  console.log("Building matchers...");
  const matchers = buildBannedMatchers(bannedWords);

  if (financeOnly) {
    await runFinanceScan(bannedWords, skippedShort, loc, matchers);
    return;
  }

  console.log("Collecting corpus...");
  const corpus = collectCorpus(loc);
  console.log(`Corpus entries: ${corpus.length}`);

  console.log("Scanning...");
  let done = 0;
  /** @type {Record<string, unknown>[]} */
  const bannedRows = [];
  /** @type {Record<string, unknown>[]} */
  const englishRows = [];
  const englishSeen = new Set();

  for (const e of corpus) {
    const hits = findBannedMatches(e.text, matchers, bannedWords);
    done++;
    if (done % 3000 === 0) console.log(`  scanned ${done}/${corpus.length}`);
    if (hits.length) {
      bannedRows.push({
        模块: e.module,
        文件: e.file,
        ID: e.id,
        字段: e.field,
        StringKey: e.stringKey,
        原文: e.text.length > 500 ? e.text.slice(0, 500) + "…" : e.text,
        命中违禁词: hits.join(" | "),
        命中数: hits.length,
      });
    }

    const frags = extractEnglishFragments(e.text);
    if (frags.length) {
      const sig = `${e.stringKey}|${e.text}`;
      if (!englishSeen.has(sig)) {
        englishSeen.add(sig);
        englishRows.push({
          模块: e.module,
          文件: e.file,
          ID: e.id,
          字段: e.field,
          StringKey: e.stringKey,
          原文: e.text.length > 500 ? e.text.slice(0, 500) + "…" : e.text,
          英文字母片段: frags.join(" | "),
        });
      }
    }
  }

  bannedRows.sort(
    (a, b) =>
      String(a.模块).localeCompare(String(b.模块), "zh") ||
      Number(b.命中数) - Number(a.命中数)
  );
  englishRows.sort((a, b) => String(a.模块).localeCompare(String(b.模块), "zh"));

  const metaRows = [
    {
      项: "扫描时间",
      值: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    },
    { 项: "词库来源", 值: PDF_PATH },
    { 项: "词库词条数(长度>=2)", 值: bannedWords.length },
    {
      项: "跳过短词(长度<2)",
      值:
        skippedShort.slice(0, 50).join("、") +
        (skippedShort.length > 50 ? "…" : ""),
    },
    { 项: "本地化条目", 值: loc.size },
    { 项: "扫描语料条", 值: corpus.length },
    { 项: "违禁词命中条", 值: bannedRows.length },
    { 项: "含英文字母条", 值: englishRows.length },
    {
      项: "扫描范围",
      值: "道具Popover/任务/NPC对话/营地升级/全量本地化(@正式名称&音效查找)",
    },
    { 项: "短词策略", 值: "长度<2的词条不参与子串匹配" },
    {
      项: "英文检测",
      值: "原文中匹配 [A-Za-z] 连续片段（含 Lv 等）",
    },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(bannedRows),
    "违禁词命中"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(englishRows),
    "含英文字母"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(metaRows),
    "扫描说明"
  );

  XLSX.writeFile(wb, OUT_PATH);
  console.log(`\nDone. Output: ${OUT_PATH}`);
  console.log(
    `违禁词命中: ${bannedRows.length}, 含英文字母: ${englishRows.length}`
  );

  // 全量扫描后也跑理财助手专属报告
  await runFinanceScan(bannedWords, skippedShort, loc, matchers);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
