import { LAST_SLOT_MINUTES } from "./config.js";

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

export function formatMin(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function parseClock(text) {
  const m = TIME_RE.exec(String(text).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 47 || min > 59) return null;
  return h * 60 + min;
}

function decodeText(raw) {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitIds(text) {
  return String(text)
    .split(/[、,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function sheetTitle(html) {
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return "";
  return decodeText(m[1]).replace(/\s*-\s*Google\s*雲端硬碟\s*$/u, "").trim();
}

function extractWaffleTable(html) {
  const start = html.search(/<table\b[^>]*class="[^"]*\bwaffle\b[^"]*"/i);
  if (start < 0) throw new Error("找不到分工表（頁面裡沒有表格）");
  const end = html.indexOf("</table>", start);
  if (end < 0) throw new Error("分工表表格不完整");
  return html.slice(start, end + "</table>".length);
}

function parseTableRows(tableHtml) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(tableHtml))) {
    const cells = [];
    const cellRe = /<t([dh])\b([^>]*)>([\s\S]*?)<\/t\1>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      const attrs = cellMatch[2] || "";
      const rowspan = Number((/rowspan="(\d+)"/i.exec(attrs) || [])[1] || 1);
      const colspan = Number((/colspan="(\d+)"/i.exec(attrs) || [])[1] || 1);
      cells.push({
        rowspan: Number.isFinite(rowspan) && rowspan > 0 ? rowspan : 1,
        colspan: Number.isFinite(colspan) && colspan > 0 ? colspan : 1,
        text: decodeText(cellMatch[3]),
      });
    }
    rows.push(cells);
  }
  return rows;
}

function buildGrid(rows) {
  const grid = new Map();
  rows.forEach((row, r) => {
    let c = 0;
    for (const cell of row) {
      while (grid.has(`${r},${c}`)) c += 1;
      for (let dr = 0; dr < cell.rowspan; dr += 1) {
        for (let dc = 0; dc < cell.colspan; dc += 1) {
          const key = `${r + dr},${c + dc}`;
          grid.set(
            key,
            dr === 0 && dc === 0
              ? { text: cell.text, rowspan: cell.rowspan, origin: true }
              : { text: "", rowspan: 0, origin: false },
          );
        }
      }
      c += cell.colspan;
    }
  });
  return {
    rowCount: rows.length,
    get(r, c) {
      return grid.get(`${r},${c}`) || null;
    },
  };
}

function textAt(grid, r, c) {
  return grid.get(r, c)?.text || "";
}

export function parseSheetHtml(html) {
  const title = sheetTitle(html);
  const grid = buildGrid(parseTableRows(extractWaffleTable(html)));

  let headerRow = -1;
  let personnelCol = -1;
  for (let r = 0; r < grid.rowCount && headerRow < 0; r += 1) {
    for (let c = 0; c < 80; c += 1) {
      if (textAt(grid, r, c) === "人員") {
        headerRow = r;
        personnelCol = c;
        break;
      }
    }
  }
  if (headerRow < 0) throw new Error("找不到「人員」標題，無法讀名冊");

  const timeCounts = new Map();
  for (let r = headerRow + 1; r < grid.rowCount; r += 1) {
    for (let c = 0; c < personnelCol; c += 1) {
      if (parseClock(textAt(grid, r, c)) !== null) {
        timeCounts.set(c, (timeCounts.get(c) || 0) + 1);
      }
    }
  }
  let timeCol = -1;
  let best = 0;
  for (const [c, n] of timeCounts) {
    if (n > best) {
      best = n;
      timeCol = c;
    }
  }
  if (timeCol < 0) throw new Error("找不到時間欄");

  const tasks = [];
  for (let c = timeCol + 1; c < personnelCol; c += 1) {
    const name = textAt(grid, headerRow, c);
    if (name) tasks.push({ name, col: c });
  }

  const timeRows = [];
  for (let r = headerRow + 1; r < grid.rowCount; r += 1) {
    const startMin = parseClock(textAt(grid, r, timeCol));
    if (startMin !== null) timeRows.push({ row: r, startMin });
  }
  const slots = timeRows.map((t, i) => ({
    startMin: t.startMin,
    endMin: i + 1 < timeRows.length ? timeRows[i + 1].startMin : t.startMin + LAST_SLOT_MINUTES,
  }));

  const roster = [];
  const seen = new Set();
  for (let r = headerRow; r < grid.rowCount; r += 1) {
    for (let c = personnelCol + 1; c < personnelCol + 12; c += 2) {
      const idCell = grid.get(r, c);
      const nameCell = grid.get(r, c + 1);
      if (!idCell?.origin) continue;
      const id = idCell.text;
      if (!/^\d+$/.test(id) || seen.has(id)) continue;
      seen.add(id);
      roster.push({ id, name: nameCell?.text || "" });
    }
  }
  roster.sort((a, b) => Number(a.id) - Number(b.id));

  const assignments = [];
  timeRows.forEach((t, i) => {
    for (const task of tasks) {
      const cell = grid.get(t.row, task.col);
      if (!cell?.origin || !cell.text) continue;
      const covered = [];
      for (let k = 0; k < timeRows.length; k += 1) {
        if (timeRows[k].row >= t.row && timeRows[k].row < t.row + cell.rowspan) covered.push(k);
      }
      if (!covered.length) continue;
      assignments.push({
        task: task.name,
        ids: splitIds(cell.text),
        startMin: slots[covered[0]].startMin,
        endMin: slots[covered[covered.length - 1]].endMin,
      });
    }
  });

  return {
    title,
    tasks: tasks.map((t) => t.name),
    slots,
    roster,
    assignments,
  };
}

export function assignmentsFor(sheet, personId) {
  const id = String(personId);
  return sheet.assignments
    .filter((a) => a.ids.includes(id))
    .map((a) => ({ task: a.task, startMin: a.startMin, endMin: a.endMin, ids: a.ids }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.task.localeCompare(b.task, "zh-Hant"));
}

export function scheduleFor(sheet, personId) {
  const merged = [];
  for (const item of assignmentsFor(sheet, personId)) {
    const last = merged[merged.length - 1];
    if (last && last.task === item.task && last.endMin === item.startMin) {
      last.endMin = item.endMin;
      const ids = new Set([...last.ids, ...item.ids]);
      last.ids = [...ids];
    } else {
      merged.push({ ...item, ids: [...item.ids] });
    }
  }
  return merged;
}

export function timelineRows(blocks, slots) {
  const sorted = [...blocks].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.task.localeCompare(b.task, "zh-Hant"),
  );
  const laneEnds = [];
  const placed = sorted.map((block) => {
    let lane = laneEnds.findIndex((end) => end <= block.startMin);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(block.endMin);
    } else {
      laneEnds[lane] = block.endMin;
    }
    const rowspan = slots.filter((s) => s.startMin >= block.startMin && s.endMin <= block.endMin).length || 1;
    return { ...block, lane, rowspan };
  });
  return slots.map((slot) => ({
    startMin: slot.startMin,
    endMin: slot.endMin,
    cells: laneEnds.map((_, lane) => {
      const starting = placed.find((b) => b.lane === lane && b.startMin === slot.startMin);
      if (starting) {
        return { task: starting.task, rowspan: starting.rowspan, startMin: starting.startMin, endMin: starting.endMin };
      }
      const covered = placed.some((b) => b.lane === lane && b.startMin < slot.startMin && slot.startMin < b.endMin);
      return covered ? null : { task: "", rowspan: 1, startMin: slot.startMin, endMin: slot.endMin };
    }),
  }));
}

export function activeAssignments(sheet, minute) {
  return sheet.assignments.filter((a) => a.startMin <= minute && minute < a.endMin);
}

export function gridRows(sheet) {
  return sheet.slots.map((slot) => ({
    startMin: slot.startMin,
    cells: sheet.tasks.map((task) => {
      const starting = sheet.assignments.find((a) => a.task === task && a.startMin === slot.startMin);
      if (starting) {
        const rowspan = sheet.slots.filter(
          (s) => s.startMin >= starting.startMin && s.endMin <= starting.endMin,
        ).length;
        return { task, ids: starting.ids, rowspan: rowspan || 1 };
      }
      const covered = sheet.assignments.some(
        (a) => a.task === task && a.startMin < slot.startMin && slot.startMin < a.endMin,
      );
      return covered ? null : { task, ids: [], rowspan: 1 };
    }),
  }));
}

export function findIssues(sheet) {
  const known = new Map(sheet.roster.map((p) => [p.id, p.name]));
  const unknownIds = [];
  const seenUnknown = new Set();
  for (const a of sheet.assignments) {
    for (const id of a.ids) {
      if (known.has(id) || seenUnknown.has(id)) continue;
      seenUnknown.add(id);
      unknownIds.push({ id, task: a.task, startMin: a.startMin });
    }
  }
  const used = new Set(sheet.assignments.flatMap((a) => a.ids));
  const unassigned = sheet.roster.filter((p) => !used.has(p.id));

  const overlaps = [];
  for (const person of sheet.roster) {
    const items = assignmentsFor(sheet, person.id);
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        if (a.startMin < b.endMin && b.startMin < a.endMin) {
          overlaps.push({
            id: person.id,
            name: person.name,
            taskA: a.task,
            startA: a.startMin,
            endA: a.endMin,
            taskB: b.task,
            startB: b.startMin,
            endB: b.endMin,
          });
        }
      }
    }
  }
  return { unknownIds, unassigned, overlaps };
}
