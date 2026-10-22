import { placeFor } from "./locations.js";
import { clampRect, parseHotspots } from "./hotspots.js";

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function cleanId(value) {
  const id = String(value ?? "");
  return ID_RE.test(id) ? id : "";
}

function cleanLabel(label, fallback) {
  const text = String(label ?? "").trim().slice(0, 40);
  return text || fallback;
}

function nextBlockId(blocks) {
  let n = 1;
  while (blocks[`b${n}`]) n += 1;
  return `b${n}`;
}

function nextLabel(blocks) {
  const used = new Set(Object.values(blocks).map((block) => block.label));
  if (!used.has("新區塊")) return "新區塊";
  let n = 2;
  while (used.has(`新區塊${n}`)) n += 1;
  return `新區塊${n}`;
}

export function parsePlan(input) {
  if (input && Array.isArray(input.blocks)) {
    const blocks = {};
    for (const raw of input.blocks) {
      if (!raw || typeof raw !== "object") continue;
      const id = cleanId(raw.id);
      if (!id || blocks[id]) continue;
      const nums = ["left", "top", "width", "height"].map((key) => Number(raw[key]));
      if (nums.some((n) => !Number.isFinite(n))) continue;
      blocks[id] = clampRect({
        label: cleanLabel(raw.label, "未命名"),
        left: raw.left,
        top: raw.top,
        width: raw.width,
        height: raw.height,
      });
    }
    const tasks = {};
    const rawTasks = input.tasks && typeof input.tasks === "object" && !Array.isArray(input.tasks) ? input.tasks : {};
    for (const [name, ids] of Object.entries(rawTasks)) {
      const task = String(name).trim().slice(0, 80);
      if (!task || !Array.isArray(ids) || tasks[task]) continue;
      const picked = [];
      for (const item of ids) {
        const id = String(item);
        if (!blocks[id] || picked.includes(id)) continue;
        picked.push(id);
      }
      tasks[task] = picked;
    }
    return { blocks, tasks };
  }
  return { blocks: parseHotspots(input), tasks: {} };
}

export function addBlock(blocks) {
  const source = blocks || {};
  const shift = Object.keys(source).length % 4;
  const id = nextBlockId(source);
  return {
    ...source,
    [id]: clampRect({
      label: nextLabel(source),
      left: 36 + shift * 6,
      top: 34 + shift * 6,
      width: 16,
      height: 12,
    }),
  };
}

export function renameBlock(blocks, id, label) {
  if (!blocks?.[id]) return blocks;
  const text = String(label ?? "").slice(0, 40);
  if (text === blocks[id].label) return blocks;
  return { ...blocks, [id]: { ...blocks[id], label: text } };
}

export function commitBlockLabel(blocks, id) {
  if (!blocks?.[id]) return blocks;
  const text = String(blocks[id].label ?? "").trim().slice(0, 40) || "未命名";
  return renameBlock(blocks, id, text);
}

export function deleteBlock(plan, id) {
  const blocks = { ...(plan?.blocks || {}) };
  delete blocks[id];
  const tasks = {};
  for (const [task, list] of Object.entries(plan?.tasks || {})) {
    tasks[task] = (Array.isArray(list) ? list : []).filter((item) => item !== id && blocks[item]);
  }
  return { blocks, tasks };
}

export function taskBlockIds(task, tasks, blocks) {
  const saved = tasks && Object.prototype.hasOwnProperty.call(tasks, task);
  const source = saved
    ? (Array.isArray(tasks[task]) ? tasks[task] : [])
    : (placeFor(task)?.area ? [placeFor(task).area] : []);
  const unique = [];
  for (const item of source) {
    const id = String(item);
    if (unique.includes(id)) continue;
    if (blocks && !blocks[id]) continue;
    unique.push(id);
  }
  return unique;
}

export function toggleTaskBlock(tasks, task, blockId, checked, blocks) {
  const id = String(blockId);
  if (blocks && !blocks[id]) return { ...(tasks || {}) };
  const next = new Set(taskBlockIds(task, tasks, blocks));
  if (checked) next.add(id);
  else next.delete(id);
  return { ...(tasks || {}), [task]: [...next] };
}

export function serializePlan(plan) {
  const source = plan && typeof plan === "object" ? plan : {};
  const blocks = [];
  const ids = new Set();
  for (const [id, rect] of Object.entries(source.blocks || {})) {
    if (!cleanId(id) || ids.has(id) || !rect) continue;
    ids.add(id);
    blocks.push({
      id,
      ...clampRect({
        label: cleanLabel(rect.label, "未命名"),
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }),
    });
  }
  const known = new Set(blocks.map((block) => block.id));
  const tasks = {};
  const rawTasks = source.tasks && typeof source.tasks === "object" ? source.tasks : {};
  for (const [name, list] of Object.entries(rawTasks)) {
    const task = String(name).trim().slice(0, 80);
    if (!task || !Array.isArray(list) || tasks[task]) continue;
    const picked = [];
    for (const item of list) {
      const id = String(item);
      if (!known.has(id) || picked.includes(id)) continue;
      picked.push(id);
    }
    tasks[task] = picked;
  }
  return { blocks, tasks };
}
