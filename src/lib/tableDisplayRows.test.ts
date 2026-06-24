import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeDisplayBodyRows } from "./tableDisplayRows.ts";

type Row = { dataIdx: number; row: unknown[] };

function cmp(a: unknown, b: unknown): number {
  const sa = String(a ?? "");
  const sb = String(b ?? "");
  return sa.localeCompare(sb, "zh-CN", { numeric: true, sensitivity: "accent" });
}

describe("computeDisplayBodyRows", () => {
  const rows: Row[] = [
    { dataIdx: 1, row: ["b", 2] },
    { dataIdx: 2, row: ["a", 3] },
    { dataIdx: 3, row: ["c", 1] },
  ];

  it("keeps original order when no sort and no pin", () => {
    const out = computeDisplayBodyRows(rows, null, [], cmp);
    assert.deepEqual(
      out.map((r) => r.dataIdx),
      [1, 2, 3],
    );
  });

  it("partitions pinned rows to front when no sort", () => {
    const out = computeDisplayBodyRows(rows, null, [3, 2], cmp);
    assert.deepEqual(
      out.map((r) => r.dataIdx),
      [3, 2, 1],
    );
  });

  it("globally sorts when sort is active (pin does not override)", () => {
    const out = computeDisplayBodyRows(rows, { colIndex: 0, descending: false }, [3, 2], cmp);
    assert.deepEqual(
      out.map((r) => r.dataIdx),
      [2, 1, 3],
    );
  });

  it("supports descending sort", () => {
    const out = computeDisplayBodyRows(rows, { colIndex: 1, descending: true }, [2], cmp);
    assert.deepEqual(
      out.map((r) => r.dataIdx),
      [2, 1, 3],
    );
  });
});

