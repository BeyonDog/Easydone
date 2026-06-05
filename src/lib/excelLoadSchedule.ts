/** silent 在已有 Excel 加载进行中时不启动 */
export function shouldSkipSilentExcelLoad(inFlightCount: number): boolean {
  return inFlightCount > 0;
}

/** 请求序号落后于当前序号时，应忽略其 setState / toast */
export function isStaleExcelLoadSeq(requestSeq: number, currentSeq: number): boolean {
  return requestSeq !== currentSeq;
}
