// 執行：node --test test/test_board_fit_regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { boardHeight } from "../src/board-fit.js";

test("總表框剛好填滿畫面剩下的高度，整頁不用捲", () => {
  assert.equal(boardHeight({ viewportHeight: 900, boardTop: 300, stickyHeight: 52, mobile: false }), 592);
});

test("畫面剩下太矮時，總表框改成填滿分頁列以下的高度", () => {
  assert.equal(boardHeight({ viewportHeight: 700, boardTop: 420, stickyHeight: 52, mobile: false }), 636);
});

test("手機上總表框不會蓋滿整個畫面，留空間拉動網頁", () => {
  assert.equal(boardHeight({ viewportHeight: 700, boardTop: 420, stickyHeight: 52, mobile: true }), 504);
});

test("總表框最少維持 280px", () => {
  assert.equal(boardHeight({ viewportHeight: 300, boardTop: 280, stickyHeight: 52, mobile: false }), 280);
});
