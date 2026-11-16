// Typed access to spellbook.json (every spell and rank a warlock learns, by level) and demons.json (the demons' abilities
// and their grimoires). Both are written by tools/spellbook/gen.py from the Forever client; rerun it for a new build.
import spellsRaw from './spellbook.json';
import demonsRaw from './demons.json';
export { wowhead } from './gear';

export type Tree = 'Affliction' | 'Demonology' | 'Destruction' | 'Mount';
/** start: known from level 1; train: a warlock trainer; talent: comes with a talent point; quest: a class quest;
    item: a book you use; unknown: in the client, but how it's learned isn't known */
export type How = 'start' | 'train' | 'talent' | 'quest' | 'item' | 'unknown';
export interface Spell {
  id: number; name: string; rank: number | null; level: number; tree: Tree; how: How;
  /** the first rank: a new spell, not an upgrade */
  first?: true;
  /** a trained rank of a spell whose first rank is a talent: the trainer only offers it once you have the talent */
  talent?: true;
  /** how 'quest': its chain's key on the Class quests page */
  quest?: string;
  /** how 'item': the book */
  item?: string;
}
export const spellbook = spellsRaw as { build: string; spells: Spell[] };

export type DemonName = 'Imp' | 'Voidwalker' | 'Succubus' | 'Felhunter';
export interface Ability {
  id: number; name: string; rank: number | null; level: number;
  /** the demon knows it as soon as it's summoned */
  innate?: true;
  /** the grimoire that teaches it (item id) and its vendor price in copper */
  grimoire?: number; price?: number;
}
export const demonData = demonsRaw as { build: string; abilities: Record<DemonName, Ability[]> };

/** copper as "2g 40s" */
export const money = (copper: number) => {
  const g = Math.floor(copper / 10000), s = Math.floor((copper % 10000) / 100), c = copper % 100;
  return [g && `${g}g`, s && `${s}s`, (c || (!g && !s)) && `${c}c`].filter(Boolean).join(' ');
};
