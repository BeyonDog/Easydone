/** Parse Roman numeral 1–3999; returns null if invalid. */
export function romanToInt(input: string): number | null {
  const s = input.trim().toUpperCase();
  if (!s || !/^[IVXLCDM]+$/.test(s)) return null;
  const V: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = V[s[i]!];
    if (cur == null) return null;
    const next = i + 1 < s.length ? V[s[i + 1]!] : 0;
    if (next > cur) total -= cur;
    else total += cur;
  }
  if (total < 1 || total > 3999) return null;
  return total;
}

/** Unicode Roman numeral single codepoint → equivalent ASCII Roman substring for {@link romanToInt}. */
const UNICODE_ROMAN_TO_ASCII: Record<string, string> = {
  Ⅰ: "I",
  Ⅱ: "II",
  Ⅲ: "III",
  Ⅳ: "IV",
  Ⅴ: "V",
  Ⅵ: "VI",
  Ⅶ: "VII",
  Ⅷ: "VIII",
  Ⅸ: "IX",
  Ⅹ: "X",
  Ⅺ: "XI",
  Ⅻ: "XII",
  Ⅼ: "L",
  Ⅽ: "C",
  Ⅾ: "D",
  Ⅿ: "M",
  ⅰ: "I",
  ⅱ: "II",
  ⅲ: "III",
  ⅳ: "IV",
  ⅴ: "V",
  ⅵ: "VI",
  ⅶ: "VII",
  ⅷ: "VIII",
  ⅸ: "IX",
  ⅹ: "X",
  ⅺ: "XI",
  ⅻ: "XII",
};

function unicodeRomanRunToInt(run: string): number | null {
  let ascii = "";
  for (const ch of run) {
    const frag = UNICODE_ROMAN_TO_ASCII[ch];
    if (frag == null) return null;
    ascii += frag;
  }
  return romanToInt(ascii);
}

/**
 * 将任务名中的罗马数字改为阿拉伯数字：如「魔药之心 I」→「魔药之心1」，
 * 也处理「心II」紧贴汉字等情况。
 * 含 Unicode 罗马数字（如 Ⅱ、Ⅹ）时同样转换，例如「猎人集结Ⅱ」→「猎人集结2」。
 */
export function normalizeTaskNameForInstruction(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\s+([\u2160-\u217f]+)(?=\s|$)/g, (full, run: string) => {
    const n = unicodeRomanRunToInt(run);
    return n != null ? String(n) : full;
  });
  s = s.replace(/([\u4e00-\u9fff])([\u2160-\u217f]+)/g, (m, ch: string, run: string) => {
    const n = unicodeRomanRunToInt(run);
    return n != null ? `${ch}${n}` : m;
  });
  s = s.replace(/\s+([IVXLCDM]{1,8})\b/gi, (full, rom: string) => {
    const n = romanToInt(rom);
    return n != null ? String(n) : full;
  });
  s = s.replace(/([\u4e00-\u9fff])([IVXLCDM]{1,8})\b/gi, (m, ch: string, rom: string) => {
    const n = romanToInt(rom);
    return n != null ? `${ch}${n}` : m;
  });
  return s;
}
