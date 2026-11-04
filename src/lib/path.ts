// The automatic upgrade path, worked out at build time for each faction choice (the first render, before the script runs).
// Walking items in level order, an item is on the path when it beats the value (wand DPS, item level) of every item
// you could use before it.
export const FACTIONS = { b: null, a: 'Alliance', h: 'Horde' } as const;   // b = both
export type FactionKey = keyof typeof FACTIONS;

/** item id → { faction key → value gained over the previous path item (null for the first) } */
export function upgradePaths<T extends { id: number; side: string | null }>(items: T[], value: (x: T) => number) {
  const out = new Map<number, Partial<Record<FactionKey, number | null>>>();
  for (const [key, side] of Object.entries(FACTIONS) as [FactionKey, string | null][]) {
    let best = 0, prev: number | null = null;          // a suggestion needs a value above zero
    for (const w of items) {
      if (side && w.side && w.side !== side) continue;
      const v = value(w);
      if (v <= best) continue;
      const entry = out.get(w.id) ?? {};
      entry[key] = prev === null ? null : v - prev;
      out.set(w.id, entry);
      prev = best = v;
    }
  }
  return out;
}
