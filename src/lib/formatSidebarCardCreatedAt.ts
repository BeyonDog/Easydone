export function formatSidebarCardCreatedAt(createdAt: number): string {
  return new Date(createdAt).toLocaleString("zh-CN", { hour12: false });
}
