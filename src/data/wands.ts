// Typed access to wands.json. To update for a new Forever build, regenerate that file; the page reads everything from it.
import raw from './wands.json';

export type Side = 'Alliance' | 'Horde';
export type SourceKind = 'Quest' | 'World drop' | 'Drop' | 'Crafted' | 'Vendor' | 'Other';
export interface Wand {
  id: number;
  name: string;
  quality: 1 | 2 | 3 | 4;        // common, uncommon, rare, epic
  ilvl: number;
  req: number | null;            // required level; null when the item data has none
  side: Side | null;             // null = both factions
  school: string;
  dps: number;                   // average hit ÷ speed, before spell power
  damage: [number, number] | null;
  speed: number;
  /** <Random enchantment> wands: each possible suffix, its stat range and % chance to roll */
  affixes?: { name: string; stats: string; chance: number }[];
  source: { kind: SourceKind; text: string; link: { type: string; id: number; name: string } | null; where: string | null } | null;
}
export interface WandData { build: string; pulled: string; affixSource: string; wands: Wand[]; noSource: Wand[] }

export const data = raw as WandData;
export const wowhead = (type: string, id: number) => `https://www.wowhead.com/forever/${type}=${id}`;
