// 執行：node --test test/test_hotspots_regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { parseHotspots, moveRect, resizeRect, DEFAULT_HOTSPOTS } from "../src/hotspots.js";

test("拖曳會移動標記，並停在圖的範圍內", () => {
  const next = moveRect(DEFAULT_HOTSPOTS.hall, 10, -100);
  assert.equal(next.left, 17);
  assert.equal(next.top, 0);
  assert.equal(next.width, DEFAULT_HOTSPOTS.hall.width);
});

test("拉右下角會改大小，最小維持 4%", () => {
  const next = resizeRect(DEFAULT_HOTSPOTS.command, -100, 5);
  assert.equal(next.width, 4);
  assert.equal(next.height, DEFAULT_HOTSPOTS.command.height + 5);
});

test("讀取存檔時補上缺少的場地並丟掉不認識的欄位", () => {
  const parsed = parseHotspots({ hall: { left: 1, top: 2, width: 30, height: 20, extra: 1 }, nope: {} });
  assert.equal(parsed.hall.left, 1);
  assert.equal(parsed.hall.label, DEFAULT_HOTSPOTS.hall.label);
  assert.equal("nope" in parsed, false);
  assert.equal(parsed.outside.left, DEFAULT_HOTSPOTS.outside.left);
});
