export function reserveCollapsed(task, expanded) {
  return task === "預備人員" && expanded !== true;
}
