export type ExcelWorkspaceMtimeFingerprint = {
  item: number;
  mission: number;
  account: number;
};

export const DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC = 1800;

export function fingerprintsEqual(
  a: ExcelWorkspaceMtimeFingerprint,
  b: ExcelWorkspaceMtimeFingerprint,
): boolean {
  return a.item === b.item && a.mission === b.mission && a.account === b.account;
}

export function normalizeExcelAutoRefreshIntervalSec(raw: unknown): number {
  if (raw === null || raw === undefined) return DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC;
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC;
  return Math.floor(n);
}
