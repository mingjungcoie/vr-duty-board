// 執行：node --test test/test_open_tasks_regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { recordDetailsToggle } from "../src/open-tasks.js";

test("同一個展開事件再送一次，不能當成新的變更", () => {
  const once = recordDetailsToggle(new Set(), "1028:場控", true, true);
  assert.equal(once.has("1028:場控"), true);
  const again = recordDetailsToggle(once, "1028:場控", true, true);
  assert.equal(again, once);
});

test("畫面換掉時，舊元件的收合事件不能清掉已展開的任務", () => {
  const open = recordDetailsToggle(new Set(), "1028:場控", true, true);
  const after = recordDetailsToggle(open, "1028:場控", false, false);
  assert.equal(after, open);
  assert.equal(after.has("1028:場控"), true);
});
