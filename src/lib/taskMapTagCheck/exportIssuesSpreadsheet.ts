import { formatIssueDescription, formatIssueReason } from "./formatIssueSummary.ts";
import type { TagCheckIssue } from "./types.ts";

/** 浅色填充，按任务 ID 循环使用 */
export const TASK_ID_FILL_COLORS = [
  "#E8F0FE",
  "#E6F4EA",
  "#FEF7E0",
  "#FCE8E6",
  "#F3E8FD",
  "#E0F2F1",
  "#FFF3E0",
  "#F1F8E9",
] as const;

/** 按任务 ID 首次出现顺序分配浅色；相同 taskId 同色 */
export function buildTaskIdFillColorMap(taskIds: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  let colorIndex = 0;
  for (const id of taskIds) {
    if (map.has(id)) continue;
    map.set(id, TASK_ID_FILL_COLORS[colorIndex % TASK_ID_FILL_COLORS.length]!);
    colorIndex++;
  }
  return map;
}

function escapeSpreadsheetXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cellXml(value: string): string {
  return `<Cell><Data ss:Type="String">${escapeSpreadsheetXml(value)}</Data></Cell>`;
}

/**
 * 导出 Excel 2003 XML（.xls），支持按任务 ID 行背景色。
 * 纯 CSV 无法携带单元格填充色，故使用 SpreadsheetML。
 */
export function exportIssuesToSpreadsheetXml(issues: TagCheckIssue[]): string {
  const headers = ["任务ID", "问题描述", "问题原因"];
  const fillByTaskId = buildTaskIdFillColorMap(issues.map((i) => i.taskId));

  const colorToStyleId = new Map<string, string>();
  const styleDefs: string[] = [
    `<Style ss:ID="header"><Font ss:Bold="1"/><Interior ss:Color="#F5F5F5" ss:Pattern="Solid"/></Style>`,
  ];
  const taskIdToStyleId = new Map<string, string>();
  let styleCounter = 0;

  for (const issue of issues) {
    const taskId = issue.taskId;
    if (taskIdToStyleId.has(taskId)) continue;
    const color = fillByTaskId.get(taskId) ?? TASK_ID_FILL_COLORS[0]!;
    let styleId = colorToStyleId.get(color);
    if (!styleId) {
      styleId = `fill${styleCounter++}`;
      colorToStyleId.set(color, styleId);
      styleDefs.push(
        `<Style ss:ID="${styleId}"><Interior ss:Color="${color}" ss:Pattern="Solid"/></Style>`,
      );
    }
    taskIdToStyleId.set(taskId, styleId);
  }

  const headerRow = `<Row ss:StyleID="header">${headers.map((h) => cellXml(h)).join("")}</Row>`;
  const dataRows = issues
    .map((issue) => {
      const styleId = taskIdToStyleId.get(issue.taskId) ?? "fill0";
      const cells = [
        issue.taskId,
        formatIssueDescription(issue),
        formatIssueReason(issue),
      ]
        .map((v) => cellXml(v))
        .join("");
      return `<Row ss:StyleID="${styleId}">${cells}</Row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>${styleDefs.join("")}</Styles>
<Worksheet ss:Name="问题列表">
<Table>
<Column ss:Width="72"/>
<Column ss:Width="240"/>
<Column ss:Width="360"/>
${headerRow}
${dataRows}
</Table>
</Worksheet>
</Workbook>`;
}

/** Excel 打开 UTF-8 XML 时需要 BOM */
export function spreadsheetXmlWithBom(xml: string): string {
  return `\uFEFF${xml}`;
}
