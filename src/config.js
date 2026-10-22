export const SHEET_ID = "1QcUzHD4QsA09-6WrVCOHvuweAmroh_vj_Xc-0pKxYv4";

export const DAYS = [
  { id: "1028", label: "10/28", date: "2026-10-28", gid: "0" },
  { id: "1029", label: "10/29", date: "2026-10-29", gid: "1224136783" },
];

export const REFRESH_MS = 90_000;

const LAST_SLOT_MINUTES = 60;

export { LAST_SLOT_MINUTES };

export function sheetHtmlUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview/sheet?headers=true&gid=${encodeURIComponent(gid)}`;
}
