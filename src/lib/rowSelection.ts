/** 表头/工具栏「全选可见行」三态切换：无选→全选；半选或全选→取消可见行勾选 */
export function toggleVisibleRowSelection(
  prev: Set<number>,
  order: number[],
  visibleIdxs: number[],
): { selectedRows: Set<number>; selectedRowOrder: number[] } {
  const next = new Set(prev);
  const someSelected = visibleIdxs.some((di) => prev.has(di));
  if (someSelected) {
    for (const di of visibleIdxs) next.delete(di);
    return {
      selectedRows: next,
      selectedRowOrder: order.filter((di) => !visibleIdxs.includes(di)),
    };
  }
  for (const di of visibleIdxs) next.add(di);
  const merged = [...order];
  for (const di of visibleIdxs) {
    if (!merged.includes(di)) merged.push(di);
  }
  return { selectedRows: next, selectedRowOrder: merged };
}
