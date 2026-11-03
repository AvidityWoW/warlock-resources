// The automatic upgrade path, worked out at build time for each faction choice.
// Walking wands in level order, a wand is on the path when it beats the DPS of every wand you could use before it.
import type { Wand } from '../data/wands';

export const FACTIONS = { b: null, a: 'Alliance', h: 'Horde' } as const;   // b = both
export type FactionKey = keyof typeof FACTIONS;

/** wand id → { faction key → DPS gained over the previous path wand (null for the first) } */
export function upgradePaths(wands: Wand[]) {
  const out = new Map<number, Partial<Record<FactionKey, number | null>>>();
  for (const [key, side] of Object.entries(FACTIONS) as [FactionKey, string | null][]) {
    let best = -1, prev: number | null = null;
    for (const w of wands) {
      if (side && w.side && w.side !== side) continue;
      if (w.dps <= best) continue;
      const entry = out.get(w.id) ?? {};
      entry[key] = prev === null ? null : w.dps - prev;
      out.set(w.id, entry);
      prev = best = w.dps;
    }
  }
  return out;
}
