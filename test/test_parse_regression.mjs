// 執行：npm test
// 或：node --test test/test_parse_regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseSheetHtml,
  assignmentsFor,
  scheduleFor,
  activeAssignments,
  findIssues,
  formatMin,
  gridRows,
  timelineRows,
  sheetTitle,
} from "../src/parse.js";
import { placeFor } from "../src/locations.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const html28 = fs.readFileSync(path.join(dir, "fixtures/1028.html"), "utf8");
const html29 = fs.readFileSync(path.join(dir, "fixtures/1029.html"), "utf8");

function lines(sheet, id) {
  return assignmentsFor(sheet, id)
    .map((x) => `${formatMin(x.startMin)}-${formatMin(x.endMin)} ${x.task}`)
    .sort();
}

function mergedLines(sheet, id) {
  return scheduleFor(sheet, id)
    .map((x) => `${formatMin(x.startMin)}-${formatMin(x.endMin)} ${x.task}`)
    .sort();
}

const day28 = {
  1: ["8:30-22:00 場控", "16:00-19:00 晚宴先遣準備"],
  2: ["8:30-22:00 場控", "18:00-22:00 晚宴催菜場控"],
  3: ["8:30-9:00 電視牆", "8:30-22:00 場控", "16:00-19:00 晚宴先遣準備", "18:00-22:00 晚宴催菜場控"],
  4: ["8:30-22:00 主持"],
  5: [
    "8:30-13:00 報到及轉場休息貴賓接待",
    "13:00-14:00 預備人員",
    "14:00-17:00 報到及轉場休息貴賓接待",
    "17:00-18:00 預備人員",
    "18:00-22:00 晚宴座位引導",
  ],
  8: [
    "8:30-12:00 簽到處",
    "13:00-14:00 預備人員",
    "14:00-17:00 下午茶準備",
    "17:00-18:00 預備人員",
    "18:00-19:00 預備人員",
    "19:00-20:00 預備人員",
    "20:00-21:00 預備人員",
    "21:00-22:00 預備人員",
  ],
  10: [
    "8:30-12:00 簽到處",
    "12:00-15:00 洗照片(如果要)",
    "13:00-14:00 預備人員",
    "14:00-17:00 下午茶準備",
    "17:00-18:00 預備人員",
    "18:00-19:00 預備人員",
    "19:00-20:00 預備人員",
    "20:00-21:00 預備人員",
    "21:00-22:00 預備人員",
  ],
  11: [
    "8:30-18:00 主訓練場聲光影像控制",
    "18:00-19:00 預備人員",
    "19:00-20:00 預備人員",
    "20:00-21:00 預備人員",
    "21:00-22:00 預備人員",
  ],
  14: [
    "8:30-9:00 紀念品位上準備",
    "11:00-15:00 午餐發放",
    "15:00-16:00 預備人員",
    "16:00-19:00 中巴管控",
    "19:00-20:00 預備人員",
    "20:00-21:00 預備人員",
    "21:00-22:00 預備人員",
  ],
  15: [
    "8:30-10:00 金級開場前咖啡茶點準備",
    "10:00-11:00 預備人員",
    "11:00-15:00 午餐發放",
    "15:00-16:00 預備人員",
    "16:00-17:00 預備人員",
    "17:00-18:00 預備人員",
    "18:00-19:00 預備人員",
    "19:00-20:00 預備人員",
    "20:00-21:00 預備人員",
    "21:00-22:00 預備人員",
  ],
  17: [
    "8:30-9:00 紀念品位上準備",
    "10:00-11:00 預備人員",
    "11:00-12:00 預備人員",
    "12:00-13:00 預備人員",
    "13:00-14:00 預備人員",
    "14:00-15:00 預備人員",
    "15:00-16:00 預備人員",
    "16:00-19:00 中巴管控",
    "19:00-20:00 預備人員",
    "20:00-21:00 預備人員",
    "21:00-22:00 預備人員",
  ],
  18: [],
  19: [
    "8:30-18:00 主訓練場聲光影像控制",
    "10:00-12:00 視訊測試",
    "14:00-17:00 視訊測試",
    "17:00-18:00 預備人員",
    "18:00-19:00 預備人員",
    "19:00-20:00 預備人員",
    "20:00-21:00 預備人員",
    "21:00-22:00 預備人員",
  ],
  20: ["8:30-22:00 拍照攝影"],
  21: [
    "8:30-18:00 主訓練場聲光影像控制",
    "8:30-22:00 主持",
    "10:00-12:00 視訊測試",
    "14:00-17:00 下午茶準備",
    "14:00-17:00 視訊測試",
    "18:00-22:00 晚宴聲光音效",
  ],
  22: [
    "8:30-11:00 長官接送",
    "11:00-12:00 預備人員",
    "12:00-13:00 預備人員",
    "13:00-14:00 預備人員",
    "14:00-15:00 預備人員",
    "15:00-16:00 預備人員",
    "16:00-17:00 預備人員",
    "17:00-18:00 預備人員",
    "18:00-19:00 預備人員",
    "19:00-20:00 預備人員",
    "20:00-22:00 長官接送",
  ],
};
day28[6] = day28[5];
day28[7] = day28[5];
day28[9] = day28[8];
day28[12] = day28[11];
day28[13] = day28[11];
day28[16] = day28[15];

const day29 = {
  1: ["8:30-17:00 場控"],
  2: ["8:30-17:00 場控"],
  3: ["8:30-9:00 電視牆", "8:30-17:00 場控"],
  4: ["8:30-17:00 主持"],
  5: [
    "8:30-13:00 報到及轉場休息貴賓接待",
    "13:00-14:00 預備人員",
    "14:00-16:00 報到及轉場休息貴賓接待",
    "16:00-17:00 預備人員",
  ],
  7: [],
  8: ["8:30-10:00 簽到處", "10:00-11:00 預備人員", "11:00-15:00 午餐發放", "14:00-17:00 下午茶準備"],
  9: ["8:30-17:00 主訓練場聲光影像控制"],
  10: [],
  11: [],
  12: [],
  13: ["8:30-17:00 主訓練場聲光影像控制"],
  14: [
    "8:30-9:00 紀念品位上準備",
    "8:30-9:00 金級開場前咖啡茶點準備",
    "9:00-10:00 預備人員",
    "10:00-11:00 預備人員",
    "11:00-15:00 午餐發放",
    "14:00-17:00 下午茶準備",
  ],
  15: [],
  16: [],
  18: ["8:30-17:00 主訓練場聲光影像控制"],
  19: ["8:30-17:00 主訓練場聲光影像控制"],
  20: ["8:30-17:00 拍照攝影"],
  21: ["8:30-17:00 主持", "8:30-17:00 主訓練場聲光影像控制", "11:00-15:00 午餐發放", "14:00-17:00 下午茶準備"],
  22: [],
};
day29[6] = day29[5];
day29[17] = day29[14];

test("10/28 標題、任務數、時間格、名冊", () => {
  const sheet = parseSheetHtml(html28);
  assert.equal(sheetTitle(html28), "2026 VR研討會工作分工表");
  assert.equal(sheet.tasks.length, 20);
  assert.equal(sheet.tasks[0], "場控");
  assert.equal(sheet.tasks.at(-1), "預備人員");
  assert.equal(sheet.slots.length, 14);
  assert.equal(formatMin(sheet.slots[0].startMin), "8:30");
  assert.equal(formatMin(sheet.slots.at(-1).startMin), "21:00");
  assert.equal(formatMin(sheet.slots.at(-1).endMin), "22:00");
  assert.deepEqual(
    sheet.roster.map((p) => `${p.id} ${p.name}`),
    [
      "1 顏一加", "2 謝旻峻", "3 蔣岳廷", "4 程國展", "5 張創雄", "6 陳政彥", "7 曹莞勗",
      "8 卓璟妤", "9 周奕辰", "10 許鎵諼", "11 陳台越", "12 王煜翔", "13 李哲遠", "14 李侑憲",
      "15 曾冠彰", "16 王永寬", "17 林朕民", "18 劉子洋", "19 Daniel 4人", "20 火鑑中心",
      "21 速動", "22 顧明義",
    ],
  );
});

test("10/28 每個人的任務時段等於合併儲存格跨的時間", () => {
  const sheet = parseSheetHtml(html28);
  for (const id of Object.keys(day28)) {
    assert.deepEqual(lines(sheet, id), [...day28[id]].sort(), `編號 ${id}`);
  }
});

test("10/29 欄位位置不同，仍依標題讀到 12 項任務", () => {
  const sheet = parseSheetHtml(html29);
  assert.equal(sheet.tasks.length, 12);
  assert.equal(sheet.tasks.includes("晚宴座位引導"), false);
  assert.equal(sheet.slots.length, 9);
  assert.equal(formatMin(sheet.slots.at(-1).startMin), "16:00");
  assert.equal(formatMin(sheet.slots.at(-1).endMin), "17:00");
  assert.equal(sheet.roster.length, 22);
  for (const id of Object.keys(day29)) {
    assert.deepEqual(lines(sheet, id), [...day29[id]].sort(), `編號 ${id}`);
  }
});

test("相鄰且同一任務的格子會合併成一段", () => {
  const sheet = parseSheetHtml(html28);
  assert.deepEqual(mergedLines(sheet, "22"), [
    "11:00-20:00 預備人員",
    "20:00-22:00 長官接送",
    "8:30-11:00 長官接送",
  ]);
  assert.deepEqual(mergedLines(sheet, "8"), [
    "13:00-14:00 預備人員",
    "14:00-17:00 下午茶準備",
    "17:00-22:00 預備人員",
    "8:30-12:00 簽到處",
  ]);
});

test("資料檢查：沒排到的人、未知編號、時段重疊", () => {
  const a = findIssues(parseSheetHtml(html28));
  assert.deepEqual(a.unknownIds, []);
  assert.deepEqual(a.unassigned.map((p) => p.id), ["18"]);
  const overlap1 = a.overlaps.find((o) => o.id === "1");
  assert.equal(overlap1.taskA, "場控");
  assert.equal(overlap1.taskB, "晚宴先遣準備");

  const b = findIssues(parseSheetHtml(html29));
  assert.deepEqual(b.unknownIds, []);
  assert.deepEqual(b.unassigned.map((p) => p.id), ["7", "10", "11", "12", "15", "16", "22"]);
  assert.equal(
    b.overlaps.some((o) => o.id === "8" && o.taskA === "午餐發放" && o.taskB === "下午茶準備"),
    true,
  );
});

test("總表格子的跨列數等於合併範圍，每一列都被恰好一個格子蓋住", () => {
  const sheet = parseSheetHtml(html28);
  const rows = gridRows(sheet);
  assert.equal(rows.length, 14);
  const control = sheet.tasks.indexOf("場控");
  assert.deepEqual(rows[0].cells[control], { task: "場控", ids: ["1", "2", "3"], rowspan: 14 });
  assert.equal(rows[1].cells[control], null);
  const pickup = sheet.tasks.indexOf("長官接送");
  assert.deepEqual(rows[0].cells[pickup], { task: "長官接送", ids: ["22"], rowspan: 3 });
  assert.deepEqual(rows[12].cells[pickup].ids, ["22"]);
  assert.equal(rows[12].cells[pickup].rowspan, 2);
  const photos = sheet.tasks.indexOf("洗照片(如果要)");
  assert.deepEqual(rows[4].cells[photos], { task: "洗照片(如果要)", ids: ["10"], rowspan: 3 });
  for (const task of sheet.tasks) {
    const col = sheet.tasks.indexOf(task);
    let r = 0;
    while (r < rows.length) {
      const cell = rows[r].cells[col];
      assert.ok(cell, `${task} 第 ${r} 列缺格子`);
      for (let k = 1; k < cell.rowspan; k += 1) {
        assert.equal(rows[r + k].cells[col], null, `${task} 跨列沒蓋住第 ${r + k} 列`);
      }
      r += cell.rowspan;
    }
    assert.equal(r, rows.length, `${task} 跨列超出表格`);
  }
});

test("我的任務時間條把同一時間的兩項任務排成並排", () => {
  const sheet = parseSheetHtml(html28);
  const rows = timelineRows(scheduleFor(sheet, "2"), sheet.slots);
  assert.equal(rows[0].cells[0].task, "場控");
  assert.equal(rows[0].cells[0].rowspan, 14);
  assert.equal(rows[1].cells[0], null);
  const at18 = rows.find((row) => formatMin(row.startMin) === "18:00");
  assert.equal(at18.cells[1].task, "晚宴催菜場控");
  assert.equal(at18.cells[1].rowspan, 4);
  const gu = timelineRows(scheduleFor(sheet, "22"), sheet.slots);
  assert.equal(gu[0].cells.length, 1);
  assert.equal(gu[0].cells[0].task, "長官接送");
  assert.equal(gu[0].cells[0].rowspan, 3);
  assert.equal(gu[3].cells[0].task, "預備人員");
});

test("ERCA 任務都有試排場地，晚宴先不標", () => {
  for (const html of [html28, html29]) {
    const sheet = parseSheetHtml(html);
    for (const task of sheet.tasks) {
      const place = placeFor(task);
      assert.ok(place, task);
      if (task.startsWith("晚宴")) assert.equal(place.pending, true, task);
      else assert.equal(place.pending, false, task);
    }
  }
  assert.equal(placeFor("主訓練場聲光影像控制").room, "1");
  assert.equal(placeFor("視訊測試").room, "6");
  assert.equal(placeFor("預備人員").room, "3");
  assert.equal(placeFor("晚宴座位引導").name, "晚宴場地稍後補");
});

test("某個時間點只列出該時段還在進行的任務", () => {
  const sheet = parseSheetHtml(html28);
  const at = activeAssignments(sheet, 16 * 60 + 30);
  const byTask = Object.fromEntries(at.map((a) => [a.task, a.ids]));
  assert.deepEqual(byTask["場控"], ["1", "2", "3"]);
  assert.deepEqual(byTask["中巴管控"], ["14", "17"]);
  assert.deepEqual(byTask["晚宴先遣準備"], ["1", "3"]);
  assert.equal(byTask["午餐發放"], undefined);
  assert.equal(byTask["簽到處"], undefined);
});

test("合併範圍超過最後一列時，結束時間停在最後一格加一小時；未知編號會被標出", () => {
  const html = `<title>測試 - Google 雲端硬碟</title>
    <table class="waffle"><tbody>
      <tr><td></td><td>場控</td><td>人員</td><td>1</td><td>甲</td></tr>
      <tr><td>8:30</td><td rowspan="9">1、99</td></tr>
      <tr><td>9:00</td></tr>
      <tr><td>10:00</td></tr>
    </tbody></table>`;
  const sheet = parseSheetHtml(html);
  assert.equal(sheetTitle(html), "測試");
  assert.deepEqual(lines(sheet, "1"), ["8:30-11:00 場控"]);
  assert.deepEqual(findIssues(sheet).unknownIds.map((x) => x.id), ["99"]);
});

test("沒有人員標題時回報錯誤", () => {
  assert.throws(() => parseSheetHtml('<table class="waffle"><tr><td>8:30</td></tr></table>'), /人員/);
});

test("名冊灰底代表這天不會去，白底和任務色不算", () => {
  const html = `<style>
    .s0{background-color:#ffffff}
    .s1{background-color:#cccccc}
    .s2{background-color:#ffff00}
    .s3{background-color:#fce5cd}
  </style>
  <table class="waffle">
    <tr>
      <td class="s0">8:30</td><td class="s3">場控</td><td class="s0">人員</td>
      <td class="s0">1</td><td class="s0">甲</td>
      <td class="s1">2</td><td class="s1">乙</td>
    </tr>
    <tr>
      <td class="s0">9:30</td><td class="s2">1</td><td></td>
      <td class="s0">3</td><td class="s1">丙</td>
      <td class="s3">4</td><td class="s3">丁</td>
    </tr>
  </table>`;
  const sheet = parseSheetHtml(html);
  const byId = Object.fromEntries(sheet.roster.map((p) => [p.id, p.absent]));
  assert.equal(byId["1"], false);
  assert.equal(byId["2"], true);
  assert.equal(byId["3"], true);
  assert.equal(byId["4"], false);
  const issues = findIssues(sheet);
  assert.deepEqual(issues.absent.map((p) => p.id), ["2", "3"]);
  assert.deepEqual(issues.unassigned.map((p) => p.id), ["2", "3", "4"]);
});
