const MIN_HEIGHT = 280;
const ENOUGH_HEIGHT = 360;

export function boardHeight({ viewportHeight, boardTop, stickyHeight, mobile }) {
  const fill = viewportHeight - boardTop - 8;
  if (fill >= ENOUGH_HEIGHT) return Math.round(fill);
  let full = viewportHeight - stickyHeight - 12;
  if (mobile) full = Math.min(full, viewportHeight * 0.72);
  return Math.round(Math.max(MIN_HEIGHT, full));
}
