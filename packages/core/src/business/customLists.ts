// ─── Custom tag/mood list operations (pure functions) ──────────

export function addCustomItem(list: string[], item: string): string[] {
  if (!item.trim()) return list;
  return list.includes(item) ? list : [...list, item];
}

export function removeCustomItem(list: string[], item: string): string[] {
  return list.filter(t => t !== item);
}

export function updateCustomItem(list: string[], oldItem: string, newItem: string): string[] {
  if (!newItem.trim()) return list;
  return list.map(t => t === oldItem ? newItem : t);
}

export function reorderItem(list: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex < 0 || fromIndex >= list.length) return list;
  if (toIndex < 0 || toIndex >= list.length) return list;
  if (fromIndex === toIndex) return list;
  const result = [...list];
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
}

export function ensureOrderContains(order: string[], required: string[]): string[] {
  const requiredSet = new Set(required);
  const filtered = order.filter(t => requiredSet.has(t));
  const existingSet = new Set(filtered);
  const missing = required.filter(t => !existingSet.has(t));
  return [...filtered, ...missing];
}
