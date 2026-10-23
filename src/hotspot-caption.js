const CAPTIONS = new Set(["3樓外其他區域", "福朋喜來登2F雲霧廳"]);

export function showsHotspotCaption(label) {
  return CAPTIONS.has(label);
}

export function hotspotTagHtml(label) {
  if (label === "福朋喜來登2F雲霧廳") return "福朋喜來登<br>2F雲霧廳";
  return label;
}
