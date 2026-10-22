const PALETTE = [
  "#fde68a",
  "#bfdbfe",
  "#bbf7d0",
  "#fecaca",
  "#ddd6fe",
  "#fed7aa",
  "#a5f3fc",
  "#fbcfe8",
  "#d9f99d",
  "#c4b5fd",
  "#fdba74",
  "#99f6e4",
  "#f9a8d4",
  "#86efac",
  "#7dd3fc",
  "#fca5a5",
  "#fef08a",
  "#a7f3d0",
  "#e9d5ff",
  "#d6d3d1",
];

export function blockColor(index) {
  const n = ((index % PALETTE.length) + PALETTE.length) % PALETTE.length;
  return PALETTE[n];
}

export function personBlockColor(taskIndex, ids, personId) {
  const id = String(personId ?? "").trim();
  if (!id) return "";
  const hit = (Array.isArray(ids) ? ids : []).some((item) => String(item) === id);
  return hit ? blockColor(taskIndex) : "";
}
