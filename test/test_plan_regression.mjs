// 執行：node --test test/test_plan_regression.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOTSPOTS } from "../src/hotspots.js";
import {
  parsePlan,
  addBlock,
  renameBlock,
  commitBlockLabel,
  deleteBlock,
  taskBlockIds,
  toggleTaskBlock,
  serializePlan,
} from "../src/plan.js";

test("舊的熱區檔會變成預設八個區塊，任務仍走原本場地", () => {
  const plan = parsePlan({ hall: { left: 1, top: 2, width: 30, height: 20, extra: 1 }, nope: {} });
  assert.equal(plan.blocks.hall.left, 1);
  assert.equal(plan.blocks.hall.label, DEFAULT_HOTSPOTS.hall.label);
  assert.equal("nope" in plan.blocks, false);
  assert.equal(plan.blocks.outside.left, DEFAULT_HOTSPOTS.outside.left);
  assert.deepEqual(plan.tasks, {});
  assert.deepEqual(taskBlockIds("場控", plan.tasks, plan.blocks), ["command"]);
  assert.deepEqual(taskBlockIds("晚宴先遣準備", plan.tasks, plan.blocks), []);
});

test("可以新增、改名、刪除區塊，刪掉的預設區塊不會自己長回來", () => {
  let blocks = addBlock(addBlock(parsePlan(null).blocks));
  const ids = Object.keys(blocks).filter((key) => key.startsWith("b"));
  assert.deepEqual(ids.map((id) => blocks[id].label), ["新區塊", "新區塊2"]);
  assert.ok(blocks[ids[0]].width >= 4 && blocks[ids[0]].height >= 4);
  blocks = renameBlock(blocks, ids[0], `${"區".repeat(50)}`);
  assert.equal(blocks[ids[0]].label.length, 40);
  blocks = renameBlock(blocks, ids[0], "  貴賓席");
  assert.equal(blocks[ids[0]].label, "  貴賓席");
  blocks = commitBlockLabel(blocks, ids[0]);
  assert.equal(blocks[ids[0]].label, "貴賓席");
  blocks = commitBlockLabel(renameBlock(blocks, ids[0], "   "), ids[0]);
  assert.equal(blocks[ids[0]].label, "未命名");

  const removed = deleteBlock({ blocks, tasks: { 主持: ["hall", ids[0]] } }, ids[0]);
  assert.equal(ids[0] in removed.blocks, false);
  assert.deepEqual(removed.tasks.主持, ["hall"]);

  const dropped = deleteBlock(removed, "hall");
  const again = parsePlan(serializePlan(dropped));
  assert.equal("hall" in again.blocks, false);
  assert.equal(again.blocks[ids[1]].label, "新區塊2");
  assert.deepEqual(again.tasks.主持, []);
});

test("每個任務可以複選區塊，清空後不再回到預設場地", () => {
  const blocks = parsePlan(null).blocks;
  let tasks = toggleTaskBlock({}, "主持", "entrance", true, blocks);
  assert.deepEqual(taskBlockIds("主持", tasks, blocks), ["hall", "entrance"]);
  tasks = toggleTaskBlock(tasks, "主持", "hall", false, blocks);
  assert.deepEqual(taskBlockIds("主持", tasks, blocks), ["entrance"]);
  tasks = toggleTaskBlock(tasks, "主持", "entrance", false, blocks);
  assert.deepEqual(taskBlockIds("主持", tasks, blocks), []);

  const saved = parsePlan(serializePlan({ blocks, tasks }));
  assert.deepEqual(taskBlockIds("主持", saved.tasks, saved.blocks), []);
  assert.deepEqual(taskBlockIds("場控", saved.tasks, saved.blocks), ["command"]);
});

test("新格式會留下自訂區塊與勾選，並丟掉不存在的區塊", () => {
  const plan = parsePlan({
    blocks: [
      { id: "bad id", label: "略過", left: 0, top: 0, width: 10, height: 10 },
      { id: "hall", label: "大廳", left: 10, top: 12, width: 20, height: 11, extra: 1 },
      { id: "hall", label: "重複", left: 1, top: 1, width: 10, height: 10 },
    ],
    tasks: { 主持: ["hall", "missing"], 場控: "command" },
  });
  assert.deepEqual(Object.keys(plan.blocks), ["hall"]);
  assert.equal(plan.blocks.hall.label, "大廳");
  assert.equal(plan.blocks.hall.top, 12);
  assert.deepEqual(plan.tasks.主持, ["hall"]);
  assert.equal("場控" in plan.tasks, false);
});
