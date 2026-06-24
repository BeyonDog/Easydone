import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TABLE_ROW_HEIGHT_ESTIMATE,
  TABLE_ROW_HEIGHT_WITH_WEAR_ESTIMATE,
  estimateDataTableRowHeight,
} from "./dataTableRowHeight.ts";

describe("estimateDataTableRowHeight", () => {
  it("returns base height for non-item tables", () => {
    assert.equal(
      estimateDataTableRowHeight({ isItemTableView: false, isSelected: true, supportsValueInput: true }),
      TABLE_ROW_HEIGHT_ESTIMATE,
    );
  });

  it("returns base height for unselected item rows", () => {
    assert.equal(
      estimateDataTableRowHeight({ isItemTableView: true, isSelected: false, supportsValueInput: true }),
      TABLE_ROW_HEIGHT_ESTIMATE,
    );
  });

  it("returns base height for selected item rows without value input", () => {
    assert.equal(
      estimateDataTableRowHeight({ isItemTableView: true, isSelected: true, supportsValueInput: false }),
      TABLE_ROW_HEIGHT_ESTIMATE,
    );
  });

  it("returns expanded height for selected rows with wear or durability", () => {
    assert.equal(
      estimateDataTableRowHeight({ isItemTableView: true, isSelected: true, supportsValueInput: true }),
      TABLE_ROW_HEIGHT_WITH_WEAR_ESTIMATE,
    );
  });
});
