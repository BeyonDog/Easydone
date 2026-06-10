import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildItemTypeLookupIndex,
  formatItemIdWithTypeLabel,
  resolveItemTypeDisplayName,
} from "./itemTypeLookup.ts";

describe("buildItemTypeLookupIndex", () => {
  it("maps type and subtype names by id (legacy split sheets)", () => {
    const index = buildItemTypeLookupIndex(
      [["TypeID", "TypeName"], ["40", "消耗品"]],
      [["SubTypeID", "SubTypeName"], ["120000", "皮肤礼包"]],
    );
    assert.equal(index.typeNameById.get("40"), "消耗品");
    assert.equal(index.subTypeNameById.get("120000"), "皮肤礼包");
  });

  it("parses unified RCT ItemType sheet with metadata rows", () => {
    const rctLike = [
      ["子类型ID", "交易行索引", "交易行索引命名", "子类名称", "子类名称", "所属类型ID", "类型名称", "类型名称"],
      ["C+B+G", "Client", "Client", "N/A", "Client", "C+G", "N/A", "Client"],
      ["SubTypeID", "Index", "IndexName", null, "SubTypeName", "TypeID", null, "TypeName"],
      ["子类型ID", "待删除", "待删除", "子类名称", "desc", "所属类型ID", "类型名称", "类型名称"],
      [150000, 0, "null", "个人资料-头像", "null", 15, "头像", "TXT_RYO_ITEM_TYPE_15"],
    ];
    const index = buildItemTypeLookupIndex(rctLike, null);
    assert.equal(index.subTypeNameById.get("150000"), "个人资料-头像");
    assert.equal(index.typeNameById.get("15"), "头像");
  });
});

describe("resolveItemTypeDisplayName", () => {
  const index = buildItemTypeLookupIndex(
    [["TypeID", "TypeName"], ["40", "消耗品"]],
    [["SubTypeID", "SubTypeName"], ["120000", "皮肤礼包"]],
  );

  it("prefers subtype name when present", () => {
    assert.equal(resolveItemTypeDisplayName("40", "120000", index), "皮肤礼包");
  });

  it("falls back to typename when subtype empty", () => {
    assert.equal(resolveItemTypeDisplayName("40", "", index), "消耗品");
    assert.equal(resolveItemTypeDisplayName("40", "999", index), "消耗品");
  });
});

describe("formatItemIdWithTypeLabel", () => {
  const legacyIndex = buildItemTypeLookupIndex(
    [["TypeID", "TypeName"], ["40", "消耗品"]],
    [["SubTypeID", "SubTypeName"], ["120000", "皮肤礼包"]],
  );

  it("formats id with label in parentheses", () => {
    assert.equal(formatItemIdWithTypeLabel("1180147", "40", "120000", legacyIndex), "1180147(皮肤礼包)");
  });

  it("returns bare id when no label", () => {
    assert.equal(formatItemIdWithTypeLabel("1180147", "", "", legacyIndex), "1180147");
  });

  it("formats RCT item row with unified lookup", () => {
    const rctLike = [
      ["子类型ID", "子类名称", "子类名称", "所属类型ID", "类型名称", "类型名称"],
      [150000, "个人资料-头像", "null", 15, "头像", "TXT_RYO_ITEM_TYPE_15"],
    ];
    const index = buildItemTypeLookupIndex(rctLike, null);
    assert.equal(formatItemIdWithTypeLabel("1500017", 15, 150000, index), "1500017(个人资料-头像)");
  });
});
