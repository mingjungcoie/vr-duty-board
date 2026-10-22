export function recordDetailsToggle(openTasks, key, isOpen, isConnected) {
  if (!key || !isConnected) return openTasks;
  const has = openTasks.has(key);
  if (isOpen === has) return openTasks;
  const next = new Set(openTasks);
  if (isOpen) next.add(key);
  else next.delete(key);
  return next;
}
