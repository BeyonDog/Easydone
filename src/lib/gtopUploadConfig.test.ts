import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeCsvPathsByBasename,
  formatBatchUploadToast,
  formatRestoreConfirmMessage,
  formatSingleRestoreConfirmMessage,
  formatUploadConfirmMessage,
} from "./gtopUploadConfig.ts";

describe("dedupeCsvPathsByBasename", () => {
  it("removes duplicate basenames case-insensitively", () => {
    const out = dedupeCsvPathsByBasename([
      "C:/ws/Config/Task.csv",
      "D:/other/task.csv",
      "C:/ws/Config/Item.csv",
    ]);
    assert.equal(out.length, 2);
    assert.equal(out[0], "C:/ws/Config/Task.csv");
    assert.equal(out[1], "C:/ws/Config/Item.csv");
  });

  it("filters non-csv paths", () => {
    const out = dedupeCsvPathsByBasename(["C:/ws/Config/readme.txt", "C:/ws/Config/a.csv"]);
    assert.deepEqual(out, ["C:/ws/Config/a.csv"]);
  });
});

describe("formatUploadConfirmMessage", () => {
  it("formats single file confirm", () => {
    const msg = formatUploadConfirmMessage({
      envLabel: "测试环境",
      serverLabel: "分支1",
      localPaths: ["C:/ws/Config/Task.csv"],
    });
    assert.match(msg, /待上传：1 个文件/);
    assert.match(msg, /Task\.csv/);
  });

  it("formats multi file confirm with truncation hint", () => {
    const paths = Array.from({ length: 15 }, (_, i) => `C:/ws/Config/File${i}.csv`);
    const msg = formatUploadConfirmMessage({
      envLabel: "E",
      serverLabel: "S",
      localPaths: paths,
    });
    assert.match(msg, /待上传：15 个文件/);
    assert.match(msg, /等共 15 个文件/);
  });
});

describe("formatRestoreConfirmMessage", () => {
  it("lists only modified filenames for restore", () => {
    const msg = formatRestoreConfirmMessage({
      envLabel: "测试",
      serverLabel: "分支",
      filenames: ["Task.csv", "Item.csv"],
    });
    assert.match(msg, /待恢复：2 个已改配置/);
    assert.match(msg, /Task\.csv/);
    assert.match(msg, /Item\.csv/);
    assert.match(msg, /工作区 Config 原版/);
  });
});

describe("formatSingleRestoreConfirmMessage", () => {
  it("includes filename and local path", () => {
    const msg = formatSingleRestoreConfirmMessage({
      envLabel: "测试",
      serverLabel: "分支",
      csvFilename: "Task.csv",
      localPath: "C:/ws/Config/Task.csv",
    });
    assert.match(msg, /Task\.csv/);
    assert.match(msg, /C:\/ws\/Config\/Task\.csv/);
    assert.match(msg, /工作区 Config 原版/);
  });
});

describe("formatBatchUploadToast", () => {
  it("summarizes all success", () => {
    const toast = formatBatchUploadToast({
      ok: true,
      okCount: 3,
      failCount: 0,
      results: [],
      toast: "",
    });
    assert.equal(toast, "已全部上传成功（3 个）");
  });

  it("summarizes partial failure", () => {
    const toast = formatBatchUploadToast({
      ok: false,
      okCount: 2,
      failCount: 1,
      results: [],
      toast: "",
    });
    assert.equal(toast, "上传完成：成功 2，失败 1");
  });
});
