import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classLoadoutAccentForGroup } from "./classLoadoutColors.ts";

describe("classLoadoutAccentForGroup", () => {
  it("returns same color for same classGroupId", () => {
    assert.equal(classLoadoutAccentForGroup("1"), classLoadoutAccentForGroup("1"));
  });

  it("returns different colors for different numeric groups", () => {
    assert.notEqual(classLoadoutAccentForGroup("1"), classLoadoutAccentForGroup("2"));
  });
});
