// Typed access to wands.json. To update for a new Forever build, regenerate that file; the page reads everything from it.
import raw from './wands.json';
import type { Side, Source } from './gear';
export { wowhead } from './gear';
export interface Wand {
  id: number;
  name: string;
  quality: 1 | 2 | 3 | 4;        // common, uncommon, rare, epic
  ilvl: number;
  req: number | null;            // required level; null when the item data has none
  side: Side | null;             // null = both factions
  school: string;
  dps: number;                   // average hit ÷ speed
  damage: [number, number] | null;
  speed: number;
  /** <Random enchantment> wands: each possible suffix, its stat range and % chance to roll */
  affixes?: { name: string; stats: string; chance: number }[];
  source: Source | null;
}
export interface WandData { build: string; pulled: string; affixSource: string; wands: Wand[]; noSource: Wand[] }

export const data = raw as WandData;
