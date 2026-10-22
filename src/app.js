import { DAYS, REFRESH_MS, sheetHtmlUrl } from "./config.js";
import {
  parseSheetHtml,
  scheduleFor,
  assignmentsFor,
  activeAssignments,
  findIssues,
  formatMin,
  gridRows,
} from "./parse.js";
import { placeFor, placeLabel } from "./locations.js";
import { recordDetailsToggle, togglePickedTask } from "./open-tasks.js";
import { moveRect, resizeRect } from "./hotspots.js";
import {
  parsePlan,
  addBlock,
  renameBlock,
  commitBlockLabel,
  deleteBlock,
  taskBlockIds,
  toggleTaskBlock,
  serializePlan,
} from "./plan.js";
import { personBlockColor } from "./block-color.js";

const VIEWS = [
  ["mine", "我的任務"],
  ["grid", "總表"],
  ["now", "現在"],
  ["check", "檢查"],
];

const state = {
  sheets: null,
  error: "",
  updatedAt: null,
  view: "mine",
  dayId: DAYS[0].id,
  personId: "",
  previewTime: "08:30",
  openTasks: new Set(),
  pickedTask: "",
  notice: "",
  editing: false,
  plan: null,
  spotMessage: "",
};

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function dayById(id) {
  return DAYS.find((d) => d.id === id) || DAYS[0];
}

function sheetOf(dayId) {
  return state.sheets?.[dayId] || null;
}

function personRecord(sheet, id) {
  return sheet?.roster.find((p) => p.id === id) || null;
}

function personName(sheet, id) {
  return personRecord(sheet, id)?.name || `編號 ${id}`;
}

function absentDays(id) {
  return DAYS.filter((day) => sheetOf(day.id)?.roster.some((p) => p.id === id && p.absent));
}

function namesHtml(sheet, ids) {
  return ids.map((id) => {
    const classes = [];
    if (id === state.personId) classes.push("me");
    if (personRecord(sheet, id)?.absent) classes.push("absent");
    const cls = classes.length ? ` class="${classes.join(" ")}"` : "";
    const away = personRecord(sheet, id)?.absent ? "（不會去）" : "";
    return `<span${cls}>${esc(personName(sheet, id))}${away}</span>`;
  }).join("、");
}

function weekday(date) {
  return "日一二三四五六"[new Date(`${date}T00:00:00`).getDay()];
}

function dayLabel(day) {
  return `${day.label}（${weekday(day.date)}）`;
}

function localDateKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function personUrl() {
  const url = new URL(location.href);
  if (state.personId) url.searchParams.set("p", state.personId);
  else url.searchParams.delete("p");
  return url.toString();
}

function setPerson(id) {
  state.personId = id;
  state.pickedTask = "";
  if (id) localStorage.setItem("vr-duty-person", id);
  else localStorage.removeItem("vr-duty-person");
  history.replaceState(null, "", personUrl());
  render();
}

function rosterOptions() {
  const sheet = sheetOf(state.dayId) || state.sheets?.[DAYS[0].id];
  if (!sheet) return "";
  const options = sheet.roster.map((p) => {
    const selected = p.id === state.personId ? " selected" : "";
    return `<option value="${esc(p.id)}"${selected}>${esc(p.id)} ${esc(p.name)}${esc(absentDays(p.id).length ? `（${absentDays(p.id).map((day) => day.label).join("、")}不會去）` : "")}</option>`;
  });
  const blank = state.personId ? "" : " selected";
  return `<option value=""${blank}>選擇你的姓名</option>${options.join("")}`;
}

function dayButtons() {
  return `<div class="days">${DAYS.map((d) => {
    const pressed = d.id === state.dayId ? "true" : "false";
    return `<button type="button" data-day="${d.id}" aria-pressed="${pressed}">${esc(dayLabel(d))}</button>`;
  }).join("")}</div>`;
}

function rangeText(startMin, endMin) {
  return `${formatMin(startMin)}–${formatMin(endMin)}`;
}

function crewNote(sheet, block) {
  const slices = assignmentsFor(sheet, state.personId).filter(
    (a) => a.task === block.task && a.startMin >= block.startMin && a.endMin <= block.endMin,
  );
  if (!slices.length) return "";
  const keys = slices.map((a) => a.ids.filter((id) => id !== state.personId).sort().join(","));
  if (new Set(keys).size !== 1) return "同組人員這段有更換，明細請看總表";
  const others = slices[0].ids.filter((id) => id !== state.personId);
  if (!others.length) return "這段只有你";
  return `同組：${namesHtml(sheet, others)}`;
}

function renderDutyDay(day, nowMin, today) {
  const sheet = sheetOf(day.id);
  const person = sheet ? personRecord(sheet, state.personId) : null;
  const name = sheet ? personName(sheet, state.personId) : state.personId;
  const away = person?.absent ? "・不會去" : "";
  let body = "";
  if (!sheet) body = "";
  else if (person?.absent) body = '<p class="empty">這天不會去。</p>';
  else {
    const blocks = scheduleFor(sheet, state.personId);
    const live = day.date === today;
    const nextStart = live
      ? blocks.filter((block) => block.startMin > nowMin).map((block) => block.startMin).sort((a, b) => a - b)[0] ?? null
      : null;
    body = blocks.length
      ? blocks.map((block) => {
        const key = `${day.id}:${block.task}`;
        const pressed = state.pickedTask === key;
        const on = live && block.startMin <= nowMin && nowMin < block.endMin;
        const next = live && block.startMin === nextStart;
        const badge = on ? '<span class="badge">進行中</span>' : next ? '<span class="badge next">下一項</span>' : "";
        const place = taskMeta(block.task);
        return `<button type="button" class="duty-card${pressed ? " on" : ""}" data-pick="${esc(key)}" aria-pressed="${pressed ? "true" : "false"}"><div class="task-name">${esc(block.task)}${badge}</div><div class="meta">${esc(rangeText(block.startMin, block.endMin))}${place ? ` · ${esc(place)}` : ""}</div><div class="meta">${crewNote(sheet, block)}</div></button>`;
      }).join("")
      : '<p class="empty">這天沒有排到任務。</p>';
  }
  return `<section><h2>${esc(name)}・${esc(dayLabel(day))}${esc(away)}</h2>${body}</section>`;
}

function renderMine() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = localDateKey(now);
  const list = state.personId
    ? DAYS.map((day) => renderDutyDay(day, nowMin, today)).join("")
    : '<p class="empty">選一次姓名。點任務之後，右邊的圖會標出作業位置。</p>';
  const tools = state.editing
    ? `<button id="add-block" type="button">新增區塊</button><button id="edit-spots" type="button" aria-pressed="true">結束調整</button><button id="save-spots" type="button">儲存位置</button>`
    : `<button id="edit-spots" type="button" aria-pressed="false">調整標記</button>`;
  const help = state.editing
    ? "拖曳方塊可移動，拉右下角可改大小。可新增、改名或刪除區塊。展開下方任務可勾選要顯示的區塊，可複選。完成後按儲存位置。"
    : "左邊是你這兩天的任務。點一項，右邊的圖會標出作業位置。";
  const editor = state.editing ? `${dayButtons()}${renderBlockEditor()}${renderTaskCatalog()}` : "";
  return `<p class="now-tools">${tools}</p><p class="note">${esc(help)}${state.spotMessage ? ` ${esc(state.spotMessage)}` : ""}</p><div class="duty-split"><div class="duty-list">${list}</div>${renderPlan(highlightAreas())}</div>${editor}`;
}

function renderGrid() {
  const day = dayById(state.dayId);
  const sheet = sheetOf(day.id);
  if (!sheet) return "";
  const byTime = gridRows(sheet);
  const cols = byTime.map(() => "<col>").join("");
  const head = byTime.map((row) => `<th>${esc(formatMin(row.startMin))}</th>`).join("");
  const body = sheet.tasks.map((task, index) => {
    let rowColor = "";
    const cells = byTime.map((row) => {
      const cell = row.cells[index];
      if (!cell) return "";
      if (!cell.ids.length) return "<td></td>";
      const span = cell.rowspan > 1 ? ` colspan="${cell.rowspan}"` : "";
      const color = personBlockColor(index, cell.ids, state.personId);
      if (color) rowColor = color;
      const painted = color ? ` class="block" style="background:${color}"` : "";
      return `<td${span}${painted}>${namesHtml(sheet, cell.ids)}</td>`;
    }).join("");
    const mark = rowColor ? ` style="box-shadow:inset 6px 0 0 ${rowColor}"` : "";
    return `<tr><th${mark}>${esc(task)}</th>${cells}</tr>`;
  }).join("");
  return `${dayButtons()}<p class="note board-note">任務在左、時間在上。選了姓名之後，只標出這個人的班，同一項任務用同一種顏色。手機上可左右滑動查看。</p><div class="grid-wrap"><table class="grid board"><colgroup><col class="task-col">${cols}</colgroup><thead><tr><th>任務</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function fitBoard() {
  const wrap = document.querySelector(".grid-wrap");
  const table = document.querySelector("table.board");
  if (!wrap || !table || state.view !== "grid") return;
  table.style.zoom = "1";
  wrap.style.height = "";
  if (window.matchMedia("(max-width: 760px)").matches) return;
  const available = window.innerHeight - wrap.getBoundingClientRect().top - 8;
  const needed = table.getBoundingClientRect().height;
  if (available > 120 && needed > available) table.style.zoom = String(available / needed);
}

function currentPlan() {
  if (!state.plan) state.plan = parsePlan(null);
  return state.plan;
}

function hotspotMap() {
  return currentPlan().blocks;
}

function areasForTask(task) {
  const plan = currentPlan();
  return taskBlockIds(task, plan.tasks, plan.blocks);
}

function taskMeta(task) {
  const labels = areasForTask(task).map((id) => currentPlan().blocks[id].label);
  if (labels.length) return labels.join("、");
  return placeLabel(placeFor(task));
}

function placeText(task) {
  const plan = currentPlan();
  if (Object.prototype.hasOwnProperty.call(plan.tasks, task)) {
    return areasForTask(task).map((id) => plan.blocks[id].label).join("、");
  }
  return placeLabel(placeFor(task));
}

function highlightAreas() {
  const areas = new Set();
  const picked = taskFromKey(state.pickedTask);
  if (picked) areasForTask(picked).forEach((area) => areas.add(area));
  if (state.editing) {
    for (const key of state.openTasks) areasForTask(taskFromKey(key)).forEach((area) => areas.add(area));
  }
  return areas;
}

function rectStyle(rect) {
  return `left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%`;
}

function renderPlan(openAreas) {
  const spots = Object.entries(hotspotMap()).map(([area, rect]) => {
    const on = openAreas.has(area) ? " on" : "";
    return `<span class="hotspot ${on}" data-area="${esc(area)}" style="${rectStyle(rect)}"><span class="tag">${esc(rect.label)}</span><span class="handle"></span></span>`;
  }).join("");
  const editing = state.editing ? " editing" : "";
  return `<figure class="plan${editing}"><img src="assets/erca-plan.png" alt="ERCA 三樓緊急疏散逃生圖"><div class="spots">${spots}</div></figure>`;
}

function renderBlockEditor() {
  if (!state.editing) return "";
  const items = Object.entries(hotspotMap()).map(([id, rect]) => (
    `<li><input data-block-label="${esc(id)}" value="${esc(rect.label)}" aria-label="區塊名稱" maxlength="40"><button type="button" data-delete-block="${esc(id)}">刪除</button></li>`
  )).join("");
  return `<ul class="block-editor">${items}</ul>`;
}

function renderBlockPicks(task) {
  if (!state.editing) return "";
  const selected = new Set(areasForTask(task));
  const boxes = Object.entries(hotspotMap()).map(([id, rect]) => {
    const checked = selected.has(id) ? " checked" : "";
    return `<label><input type="checkbox" data-task="${esc(task)}" data-block="${esc(id)}"${checked}>${esc(rect.label)}</label>`;
  }).join("");
  return `<fieldset class="block-picks"><legend>顯示區塊（可複選）</legend>${boxes}</fieldset>`;
}

function renderTaskCatalog() {
  const day = dayById(state.dayId);
  const sheet = sheetOf(day.id);
  if (!sheet) return "";
  return sheet.tasks.map((task) => {
    const key = `${day.id}:${task}`;
    const open = state.openTasks.has(key);
    const rows = sheet.assignments
      .filter((a) => a.task === task)
      .sort((a, b) => a.startMin - b.startMin)
      .map((a) => `<li>${esc(rangeText(a.startMin, a.endMin))}　${namesHtml(sheet, a.ids)}</li>`)
      .join("");
    return `<details data-key="${esc(key)}"${open ? " open" : ""}><summary>${esc(task)}<span class="meta">　${esc(taskMeta(task))}</span></summary>${renderBlockPicks(task)}<ul>${
      rows || '<li class="empty">沒有安排</li>'
    }</ul></details>`;
  }).join("");
}

function renderNow() {
  const day = dayById(state.dayId);
  const sheet = sheetOf(day.id);
  if (!sheet) return "";
  const [h, m] = state.previewTime.split(":").map(Number);
  const minute = h * 60 + m;
  const today = DAYS.find((d) => d.date === localDateKey(new Date()));
  const hint = today
    ? `今天是活動日 ${dayLabel(today)}。`
    : "今天不是活動日，下面用你選的時間預覽。";
  const active = activeAssignments(sheet, minute);
  const staffed = [];
  for (const task of sheet.tasks) {
    const ids = [...new Set(active.filter((a) => a.task === task).flatMap((a) => a.ids))]
      .filter((id) => !personRecord(sheet, id)?.absent);
    if (!ids.length) continue;
    const place = placeText(task);
    staffed.push(`<article class="card"><div class="task-name">${esc(task)}</div>${place ? `<div class="meta">${esc(place)}</div>` : ""}<div>${namesHtml(sheet, ids)}</div></article>`);
  }
  return `${dayButtons()}
    <p class="note">${esc(hint)}</p>
    <p class="now-tools"><label>查看時間 <input id="preview-time" type="time" value="${esc(state.previewTime)}"></label>
    <button id="use-now" type="button">回到現在時間</button></p>
    <h2>${esc(dayLabel(day))} ${esc(state.previewTime)} 誰在做事</h2>
    ${staffed.join("") || '<p class="empty">這個時間沒有人被排到任務。</p>'}`;
}

function renderCheck() {
  return DAYS.map((day) => {
    const sheet = sheetOf(day.id);
    if (!sheet) return "";
    const issues = findIssues(sheet);
    const noTask = issues.unassigned.filter((p) => !p.absent);
    const parts = [];
    if (!noTask.length && !issues.unknownIds.length && !issues.overlaps.length) {
      parts.push('<p class="empty">沒有發現問題。</p>');
    }
    if (noTask.length) {
      parts.push(`<h3>沒排到任務（${noTask.length}）</h3>`);
      parts.push(`<p>${noTask.map((p) => esc(`${p.id} ${p.name}`)).join("、")}</p>`);
    }
    if (issues.absent.length) {
      const scheduled = new Set(sheet.assignments.flatMap((a) => a.ids));
      parts.push(`<h3>不會去（${issues.absent.length}）</h3>`);
      parts.push(`<p>${issues.absent.map((p) => esc(`${p.id} ${p.name}${scheduled.has(p.id) ? "（表上仍有任務）" : ""}`)).join("、")}</p>`);
    }
    if (issues.unknownIds.length) {
      parts.push("<h3>對不到名冊的編號</h3>");
      parts.push(`<ul>${issues.unknownIds.map((u) => `<li class="issue">編號 ${esc(u.id)}（出現在${esc(u.task)} ${esc(formatMin(u.startMin))}）</li>`).join("")}</ul>`);
    }
    if (issues.overlaps.length) {
      parts.push(`<h3>同一人時段重疊（${issues.overlaps.length}）</h3><ul>`);
      parts.push(issues.overlaps.map((o) => `<li class="issue">${esc(o.id)} ${esc(o.name)}：${esc(o.taskA)} ${esc(rangeText(o.startA, o.endA))} 與 ${esc(o.taskB)} ${esc(rangeText(o.startB, o.endB))}</li>`).join(""));
      parts.push("</ul>");
    }
    return `<section><h2>${esc(dayLabel(day))}</h2>${parts.join("")}</section>`;
  }).join("");
}

function render() {
  renderView();
  if (state.view === "grid") requestAnimationFrame(fitBoard);
}

function taskFromKey(key) {
  const index = key.indexOf(":");
  return index < 0 ? key : key.slice(index + 1);
}

function syncHotspots() {
  const openAreas = highlightAreas();
  document.querySelectorAll(".hotspot").forEach((spot) => {
    spot.classList.toggle("on", openAreas.has(spot.dataset.area));
  });
}

function renderView() {
  const title = state.sheets?.[DAYS[0].id]?.title || "VR研討會工作分工";
  $("title").textContent = title;
  document.title = title;
  const status = $("status");
  if (state.error && !state.sheets) {
    status.textContent = state.error;
    status.className = "error";
  } else if (state.updatedAt) {
    const clock = state.updatedAt.toLocaleString("zh-TW", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    status.textContent = state.error
      ? `更新失敗，畫面仍是 ${clock} 的資料`
      : `已更新 ${clock} · 版11`;
    status.className = state.error ? "error" : "";
  }
  $("tabs").innerHTML = VIEWS.map(([id, label]) => {
    const pressed = state.view === id ? "true" : "false";
    return `<button type="button" data-view="${id}" aria-pressed="${pressed}">${label}</button>`;
  }).join("");
  $("person-bar").innerHTML = `<select id="person" aria-label="選擇人員">${rosterOptions()}</select>
    <button id="copy-link" type="button">複製我的連結</button>
    <p id="person-link">${state.personId ? esc(personUrl()) : "選了姓名之後，這裡會出現可以轉傳的連結。"}${
      state.notice ? ` ${esc(state.notice)}` : ""
    }</p>`;
  $("main").className = state.view === "grid" ? "wide" : "";
  const views = { mine: renderMine, grid: renderGrid, now: renderNow, check: renderCheck };
  const banner = state.error && state.sheets ? `<p class="banner">${esc(state.error)}</p>` : "";
  $("main").innerHTML = state.sheets
    ? banner + views[state.view]()
    : `<p class="empty">${esc(state.error || "正在讀取分工表…")}</p>`;
}

async function refresh() {
  $("status").textContent = "正在讀取分工表…";
  $("status").className = "";
  try {
    const pairs = await Promise.all(DAYS.map(async (day) => {
      const res = await fetch(sheetHtmlUrl(day.gid), { cache: "no-store" });
      if (!res.ok) throw new Error(`${day.label} 讀取失敗（HTTP ${res.status}）`);
      return [day.id, parseSheetHtml(await res.text())];
    }));
    state.sheets = Object.fromEntries(pairs);
    state.error = "";
    state.updatedAt = new Date();
    const known = new Set(state.sheets[DAYS[0].id].roster.map((p) => p.id));
    if (state.personId && !known.has(state.personId)) state.personId = "";
  } catch (err) {
    state.error = err.message || String(err);
  }
  render();
}

function applySpot(area) {
  const spot = document.querySelector(`.hotspot[data-area="${area}"]`);
  const rect = hotspotMap()[area];
  if (spot && rect) spot.style.cssText = rectStyle(rect);
}

let drag = null;
let swallowClick = false;

function blockButtonAction(target) {
  if (target.id === "add-block") {
    const plan = currentPlan();
    state.plan = { ...plan, blocks: addBlock(plan.blocks) };
    state.spotMessage = "";
    render();
    return true;
  }
  const deleteId = target.dataset?.deleteBlock;
  if (deleteId) {
    state.plan = deleteBlock(currentPlan(), deleteId);
    state.spotMessage = "";
    render();
    return true;
  }
  return false;
}

document.body.addEventListener("pointerdown", (event) => {
  if (blockButtonAction(event.target)) {
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 0);
    return;
  }
  if (!state.editing) return;
  const spot = event.target.closest(".hotspot");
  if (!spot) return;
  const plan = spot.closest(".plan");
  if (!plan) return;
  event.preventDefault();
  const bounds = plan.getBoundingClientRect();
  drag = {
    area: spot.dataset.area,
    mode: event.target.classList.contains("handle") ? "resize" : "move",
    bounds,
    startX: event.clientX,
    startY: event.clientY,
    origin: { ...hotspotMap()[spot.dataset.area] },
  };
  spot.setPointerCapture(event.pointerId);
});

document.body.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dx = ((event.clientX - drag.startX) / drag.bounds.width) * 100;
  const dy = ((event.clientY - drag.startY) / drag.bounds.height) * 100;
  const next = drag.mode === "resize" ? resizeRect(drag.origin, dx, dy) : moveRect(drag.origin, dx, dy);
  const plan = currentPlan();
  state.plan = { ...plan, blocks: { ...plan.blocks, [drag.area]: next } };
  applySpot(drag.area);
});

document.body.addEventListener("pointerup", () => {
  drag = null;
});

async function saveHotspots() {
  try {
    const res = await fetch("/api/hotspots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializePlan(currentPlan())),
    });
    if (!res.ok) throw new Error(`儲存失敗（HTTP ${res.status}）`);
    state.plan = parsePlan(serializePlan(currentPlan()));
    state.spotMessage = "已儲存。";
    state.editing = false;
  } catch (err) {
    state.spotMessage = err.message || "儲存失敗";
  }
  render();
}

document.body.addEventListener("click", async (event) => {
  if (swallowClick) {
    swallowClick = false;
    return;
  }
  if (blockButtonAction(event.target)) return;
  const view = event.target.closest("[data-view]");
  if (view) {
    state.view = view.dataset.view;
    render();
    return;
  }
  const day = event.target.closest("[data-day]");
  if (day) {
    state.dayId = day.dataset.day;
    render();
    return;
  }
  if (event.target.id === "use-now") {
    const now = new Date();
    state.previewTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const today = DAYS.find((d) => d.date === localDateKey(now));
    if (today) state.dayId = today.id;
    render();
    return;
  }
  if (event.target.id === "edit-spots") {
    state.editing = !state.editing;
    state.spotMessage = "";
    render();
    return;
  }
  if (event.target.id === "save-spots") {
    saveHotspots();
    return;
  }
  const pick = event.target.closest("[data-pick]");
  if (pick) {
    state.pickedTask = togglePickedTask(state.pickedTask, pick.dataset.pick);
    render();
    return;
  }
  if (event.target.id === "copy-link") {
    if (!state.personId) {
      state.notice = "請先選擇姓名。";
      render();
      return;
    }
    try {
      await navigator.clipboard.writeText(personUrl());
      state.notice = "已複製。";
    } catch {
      state.notice = "複製失敗，請手動選取上方網址。";
    }
    render();
  }
});

document.body.addEventListener("input", (event) => {
  const id = event.target.dataset.blockLabel;
  if (!id) return;
  const plan = currentPlan();
  state.plan = { ...plan, blocks: renameBlock(plan.blocks, id, event.target.value) };
  const tag = document.querySelector(`.hotspot[data-area="${CSS.escape(id)}"] .tag`);
  if (tag) tag.textContent = state.plan.blocks[id]?.label || "";
});

document.body.addEventListener("change", (event) => {
  if (event.target.id === "person") setPerson(event.target.value);
  if (event.target.id === "preview-time") {
    state.previewTime = event.target.value || "08:30";
    render();
    return;
  }
  const labelId = event.target.dataset.blockLabel;
  if (labelId) {
    const plan = currentPlan();
    const blocks = commitBlockLabel(plan.blocks, labelId);
    if (blocks === plan.blocks) return;
    state.plan = { ...plan, blocks };
    render();
    return;
  }
  const task = event.target.dataset.task;
  const blockId = event.target.dataset.block;
  if (event.target.type === "checkbox" && task && blockId) {
    const plan = currentPlan();
    state.plan = {
      ...plan,
      tasks: toggleTaskBlock(plan.tasks, task, blockId, event.target.checked, plan.blocks),
    };
    render();
  }
});

document.body.addEventListener("toggle", (event) => {
  const node = event.target;
  if (node.tagName !== "DETAILS" || !node.dataset.key) return;
  const next = recordDetailsToggle(state.openTasks, node.dataset.key, node.open, node.isConnected);
  if (next === state.openTasks) return;
  state.openTasks = next;
  syncHotspots();
}, true);

$("refresh").addEventListener("click", () => { refresh(); });
window.addEventListener("resize", () => { if (state.view === "grid") fitBoard(); });

const params = new URLSearchParams(location.search);
state.personId = params.get("p") || localStorage.getItem("vr-duty-person") || "";
const today = DAYS.find((d) => d.date === localDateKey(new Date()));
if (today) {
  state.dayId = today.id;
  const now = new Date();
  state.previewTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

if (location.protocol === "file:") {
  state.error = "請不要直接點開這個檔案。在瀏覽器網址列貼上 http://127.0.0.1:8765/ 再按 Enter。";
  render();
} else {
  fetch("/src/hotspots.json", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      if (state.editing || drag) return;
      state.plan = parsePlan(data);
      if (state.view === "mine") render();
    })
    .catch(() => {});
  refresh();
  setInterval(refresh, REFRESH_MS);
}
