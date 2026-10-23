// 執行：node --test test/test_hotspot_caption_regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { hotspotTagHtml, showsHotspotCaption } from "../src/hotspot-caption.js";

test("場地外的兩塊要顯示文字，福朋喜來登名稱分成兩行", () => {
  assert.equal(showsHotspotCaption("3樓外其他區域"), true);
  assert.equal(showsHotspotCaption("福朋喜來登2F雲霧廳"), true);
  assert.equal(showsHotspotCaption("1 訓練場"), false);
  assert.equal(hotspotTagHtml("福朋喜來登2F雲霧廳"), "福朋喜來登<br>2F雲霧廳");
  assert.equal(hotspotTagHtml("3樓外其他區域"), "3樓外其他區域");
});
