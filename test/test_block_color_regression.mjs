// 執行：node --test test/test_block_color_regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { blockColor, personBlockColor } from "../src/block-color.js";

test("相鄰任務用不同色塊，同一任務維持同色", () => {
  const colors = Array.from({ length: 20 }, (_, index) => blockColor(index));
  assert.equal(new Set(colors).size, 20);
  assert.equal(blockColor(0), colors[0]);
  assert.notEqual(blockColor(0), blockColor(1));
  for (const color of colors) assert.match(color, /^#[0-9a-f]{6}$/);
});

test("總表只有選到的人那一格才上色", () => {
  assert.equal(personBlockColor(0, ["1", "2"], ""), "");
  assert.equal(personBlockColor(0, ["1", "2"], "9"), "");
  assert.equal(personBlockColor(3, ["1", "2"], "2"), blockColor(3));
  assert.equal(personBlockColor(3, [1, 2], 2), blockColor(3));
});
