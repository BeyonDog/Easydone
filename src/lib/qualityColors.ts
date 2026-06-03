/** 物品品质 Chip 色点（筛选条 / 弹窗网格） */
const QUALITY_DOT: Record<string, string> = {
  低品质: "#9aa3b2",
  绿: "#3dd68c",
  蓝: "#5b8cff",
  紫: "#b48cff",
  金: "#e8c547",
  红: "#f07178",
  空: "#6b7280",
};

export function qualityDotColor(label: string): string {
  return QUALITY_DOT[label] ?? "#9aa3b2";
}
