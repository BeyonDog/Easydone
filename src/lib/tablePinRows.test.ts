import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergePinnedOrder, partitionRowsByPinOrder } from "./tablePinRows.ts";

describe("mergePinnedOrder", () => {
  it("appends new ids in selectionOrder first, deduped", () => {
    const result = mergePinnedOrder([1, 2], [3, 4, 2], [4, 3]);
    assert.deepEqual(result, [1, 2, 4, 3]);
  });

  it("returns existing when toAdd is empty", () => {
    assert.deepEqual(mergePinnedOrder([1, 2], [], [3]), [1, 2]);
  });

  it("uses toAdd order when selectionOrder has no overlap", () => {
    const result = mergePinnedOrder([], [5, 6], [99]);
    assert.deepEqual(result, [5, 6]);
  });
});

describe("partitionRowsByPinOrder", () => {
  const rows = [
    { dataIdx: 10, v: "a" },
    { dataIdx: 20, v: "b" },
    { dataIdx: 30, v: "c" },
    { dataIdx: 40, v: "d" },
  ];

  it("puts pinned rows first in pinnedOrder sequence", () => {
    const result = partitionRowsByPinOrder(rows, [30, 10]);
    assert.deepEqual(
      result.map((r) => r.dataIdx),
      [30, 10, 20, 40],
    );
  });

  it("only pins rows present in current visible set (filter simulation)", () => {
    const filtered = rows.filter((r) => r.dataIdx !== 10);
    const result = partitionRowsByPinOrder(filtered, [30, 10, 40]);
    assert.deepEqual(
      result.map((r) => r.dataIdx),
      [30, 40, 20],
    );
  });

  it("returns rows unchanged when pinnedOrder is empty", () => {
    assert.deepEqual(partitionRowsByPinOrder(rows, []), rows);
  });

  it("returns rows unchanged when no pinned rows are visible", () => {
    assert.deepEqual(partitionRowsByPinOrder([{ dataIdx: 99 }], [10, 20]), [{ dataIdx: 99 }]);
  });
});
