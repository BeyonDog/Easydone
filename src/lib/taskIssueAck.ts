export type IssueAckKey = {
  taskId: string;
  kind: string;
  conditionId: string;
  message: string;
};

export function issueReportSignature(issues: readonly IssueAckKey[]): string {
  if (issues.length === 0) return "";
  return [...issues]
    .map((i) => `${i.taskId}\t${i.kind}\t${i.conditionId}\t${i.message}`)
    .sort()
    .join("\n");
}

export function isTaskIssueAlertActive(signature: string, ackedSignature: string | null): boolean {
  if (!signature) return false;
  return signature !== ackedSignature;
}
