// Typed access to talents.json: Forever's warlock talent tree, from the client's own Trait tables.
// Written by tools/talents/gen.py (python3 tools/talents/gen.py ~/spelldb).
import raw from './talents.json';

export interface Talent {
  /** the client's node id (gates and prerequisites point at these) */
  id: number;
  /** which tree (0 Affliction, 1 Demonology, 2 Destruction), and its place in it, from 1 */
  tab: number; row: number; col: number;
  name: string; spell: number;
  /** how many ranks, and what each does */
  max: number; ranks: string[];
  /** its icon's file in public/talents/, without the .jpg */
  icon: string;
  /** points needed among these talents before it can be learned (the page counts the ones in the rows above it) */
  gates: { points: number; nodes: number[] }[];
  /** talents to max first (the tree's arrows) */
  needs: number[];
}
export interface Tab { name: string; cols: number; rows: number }
export const data = raw as { build: string; points: number; firstLevel: number; tabs: Tab[]; talents: Talent[] };
