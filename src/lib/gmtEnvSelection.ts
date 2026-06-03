/** 分支环境 name + id 是否满足 GMT exec 要求（请求头 env 需 id） */
export function gmtEnvSelectionBlockMessage(
  gmtEnvName: string | null | undefined,
  gmtEnvId: number | null | undefined,
): string | null {
  if (!gmtEnvName?.trim()) return "未选择区服";
  if (gmtEnvId == null) return "请在下拉框选择分支环境（需区服 ID）";
  return null;
}
