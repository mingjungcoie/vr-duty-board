// 執行：node --test test/test_publish_mode_regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { showStaffTools } from "../src/publish-mode.js";

test("只有本機能看到檢查頁和調整標記", () => {
  assert.equal(showStaffTools("127.0.0.1"), true);
  assert.equal(showStaffTools("localhost"), true);
  assert.equal(showStaffTools("::1"), true);
  assert.equal(showStaffTools("mingjungcoie.github.io"), false);
  assert.equal(showStaffTools("vr-duty-board.mingjungcoie.workers.dev"), false);
});
