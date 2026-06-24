export const TABLE_ROW_HEIGHT_ESTIMATE = 30;
export const TABLE_ROW_HEIGHT_WITH_WEAR_ESTIMATE = 64;

export function estimateDataTableRowHeight(opts: {
  isItemTableView: boolean;
  isSelected: boolean;
  supportsValueInput: boolean;
}): number {
  if (!opts.isItemTableView || !opts.isSelected) return TABLE_ROW_HEIGHT_ESTIMATE;
  if (opts.supportsValueInput) return TABLE_ROW_HEIGHT_WITH_WEAR_ESTIMATE;
  return TABLE_ROW_HEIGHT_ESTIMATE;
}
