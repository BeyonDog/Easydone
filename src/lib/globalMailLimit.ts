export function isGlobalMailLimitError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("limit") ||
    m.includes("上限") ||
    m.includes("maximum") ||
    m.includes("10") && (m.includes("mail") || m.includes("邮件"))
  );
}

export function globalMailLimitUserMessage(_raw: string): string {
  return "单环境全服邮件已达上限（通常为 10 封），请先在 GMT 清理后再发。";
}
