// 執行：node --test test/test_reserve_regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { reserveCollapsed } from "../src/reserve-row.js";

test("預備人員預設收合，展開後才顯示，其他任務不受影響", () => {
  assert.equal(reserveCollapsed("預備人員", false), true);
  assert.equal(reserveCollapsed("預備人員", true), false);
  assert.equal(reserveCollapsed("場控", false), false);
});
