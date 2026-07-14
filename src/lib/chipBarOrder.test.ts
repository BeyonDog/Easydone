import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { splitChipBarPinnedAndMore } from "./chipBarOrder.ts";

describe("splitChipBarPinnedAndMore", () => {
  const all = ["低品质", "绿", "蓝", "紫", "空"];

  it("puts all keys in pinned when no saved order", () => {
    const { pinned, more } = splitChipBarPinnedAndMore(all, null, all);
    assert.deepEqual(pinned, all);
    assert.deepEqual(more, []);
  });

  it("demoted keys appear in more", () => {
    const saved = ["低品质", "绿", "蓝"];
    const { pinned, more } = splitChipBarPinnedAndMore(all, saved, all);
    assert.deepEqual(pinned, saved);
    assert.deepEqual(more, ["紫", "空"]);
  });

  it("filters saved order to valid allKeys only", () => {
    const { pinned, more } = splitChipBarPinnedAndMore(all, ["绿", "gone"], all);
    assert.deepEqual(pinned, ["绿"]);
    assert.deepEqual(more, ["低品质", "蓝", "紫", "空"]);
  });
});
