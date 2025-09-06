// Utility: deterministic color per user/email
const COLOR_PALETTE = [
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#06b6d4', // cyan-500
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

export function getUserColor(key: string): string {
  const h = hashString(key || '');
  const idx = h % COLOR_PALETTE.length;
  return COLOR_PALETTE[idx];
}
