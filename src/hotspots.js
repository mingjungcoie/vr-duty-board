export const DEFAULT_HOTSPOTS = {
  hall: { label: "1 訓練場", left: 7, top: 17, width: 40, height: 30 },
  command: { label: "2 指揮站", left: 7, top: 48, width: 17, height: 12 },
  forward: { label: "3 前進指揮所", left: 7, top: 66, width: 17, height: 15 },
  office: { label: "辦公室", left: 44, top: 66, width: 14, height: 13 },
  remote: { label: "6 遠距平台", left: 60, top: 64, width: 13, height: 15 },
  safety: { label: "7 安全教室", left: 74, top: 58, width: 13, height: 16 },
  entrance: { label: "入口走廊", left: 22, top: 49, width: 50, height: 7 },
  outside: { label: "入口外側", left: 36, top: 82, width: 20, height: 6 },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 10) / 10;
}

export function clampRect(rect) {
  const width = round(clamp(Number(rect.width), 4, 100));
  const height = round(clamp(Number(rect.height), 4, 100));
  return {
    label: rect.label,
    left: round(clamp(Number(rect.left), 0, 100 - width)),
    top: round(clamp(Number(rect.top), 0, 100 - height)),
    width,
    height,
  };
}

export function moveRect(rect, dx, dy) {
  return clampRect({ ...rect, left: rect.left + dx, top: rect.top + dy });
}

export function resizeRect(rect, dx, dy) {
  return clampRect({ ...rect, width: rect.width + dx, height: rect.height + dy });
}

export function parseHotspots(input) {
  const source = input && typeof input === "object" ? input : {};
  const out = {};
  for (const [area, base] of Object.entries(DEFAULT_HOTSPOTS)) {
    const raw = source[area] && typeof source[area] === "object" ? source[area] : {};
    out[area] = clampRect({
      label: base.label,
      left: raw.left ?? base.left,
      top: raw.top ?? base.top,
      width: raw.width ?? base.width,
      height: raw.height ?? base.height,
    });
  }
  return out;
}
