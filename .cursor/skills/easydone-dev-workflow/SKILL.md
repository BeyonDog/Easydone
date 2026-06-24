---
name: easydone-dev-workflow
description: Guides easydone feature work on tables, filters, pin/sort, selection cache, and GTOP CSV upload. Use when adding table UX, item/task filters, pinned rows, column sort, view selection persistence, or GTOP Item/Task price upload.
---

# easydone 功能开发工作流

## 何时使用

- 主表 UI：筛选、置顶、排序、框选、虚拟滚动
- 勾选/数量/耐久状态与视图切换
- GTOP 上传 Item.csv / Task.csv（改价、还原默认）

## 表格显示顺序

`src/lib/tableDisplayRows.ts` → `computeDisplayBodyRows`：

- **有列排序**（`tableSort`）：全局按列排序，**置顶不覆盖排序**
- **无排序**：`partitionRowsByPinOrder` 将 `pinnedRowOrder` 置顶

`App.tsx` 中 `tableSort` 变化时调用 `scrollTableToTop()`。

## 置顶

- 库：`src/lib/tablePinRows.ts`（`pinSelectionToFront`、`pinVisibleSelectionToFront`）
- 手动「置顶已勾选」：可见已选行移到最前 + 滚到表顶
- 「取消置顶」后：`pinAutoSuppressedRef` 阻止筛选自动再置顶，直到勾选变化或再次手动置顶
- 筛选变更自动置顶：仅处理**当前可见且已勾选**行

## 框选

- `src/lib/tableBoxSelect.ts` + `App.tsx` `beginBoxSelect`
- 规则：框内有已选 → 只取消框内已选；框内无已选 → 全选框内行
- `thead` / `button` 不触发框选

## 勾选缓存

- `src/lib/viewSelectionCache.ts`：按视图 key 保存 `selectedRows`、`itemLineQty`、`itemLineWear`、`durability` 等
- 切换 item / task / 模板视图时 `switchActiveView` 读写缓存

## GTOP CSV

- 路径解析：`resolveItemCsvPath` / `resolveTaskCsvPath`（相对 `excelWorkspaceRoot`）
- **内存 patch + 上传**，不修改工作区原 CSV 文件
- 参考：`gtopModifyItemPrices.ts`、右键改价/还原默认

## 完成前检查

```
- [ ] npm test
- [ ] npm run build
- [ ] 若改 src-tauri：cargo check
- [ ] 手动：排序、置顶、筛选、发送（若触及 GMT）各测一条路径
```

## 文件索引

| 区域 | 主文件 |
|------|--------|
| 主 UI | `src/App.tsx` |
| 表体 | `src/DataTableBody.tsx` |
| 横向滚动 | `src/hooks/useTableAxisScroll.ts` |
| 样式 | `src/App.css` |
