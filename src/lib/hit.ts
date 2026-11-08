// Spell hit: the chance starts from the level gap (Classic servers' table, cmangos's SpellHitResult), your bonus hit
// is added, and the result is held between 1% and 100%. Shared by the hit cap page and its script.
//
//   gap = target level - your level
//   gap < 3:  96 - gap            (97 a level below you, 96 even, 95, 94)
//   gap >= 3: 94 - (gap - 2) x 11 (83, 72, 61…)
//
// Forever drops Classic's 1% that always missed: its own tooltip says a level-30 player needs 4% spell hit "to never
// miss Lvl 30 Targets/Players" (96 + 4 = 100), and it treats monsters and players alike. Classic used 7% a level
// instead of 11% against players three or more levels up; Forever's tooltip only covers your own level, so that
// part is unconfirmed and the page uses the one table.

export const MAX_HIT = 100;
export const MIN_HIT = 1;
/** Suppression (Affliction): 1 to 5 points, +1% chance to hit with all spells per point. The client only has rank 1
 *  (spell 18174), whose tooltip says 5%; per the user, Forever's Suppression is 1% a point, 5% at five. */
export const SUPPRESSION_PER_POINT = 1;
export const SUPPRESSION_POINTS = 5;
/** raid bosses show as "??" and count as three levels above a level-60 player */
export const BOSS_GAP = 3;

/** the hit chance before any bonus, from the level gap */
export const baseHit = (gap: number) => (gap < 3 ? 96 - gap : 94 - (gap - 2) * 11);

export interface Hit {
  /** chance before bonuses */
  base: number;
  /** bonus hit that would reach 100% */
  needed: number;
  /** your chance to hit, held to 1–100% */
  chance: number;
  /** bonus hit past the cap, doing nothing */
  wasted: number;
  /** bonus hit still to find; 0 at the cap */
  short: number;
}

export const hit = (gap: number, bonus: number): Hit => {
  const base = Math.min(MAX_HIT, baseHit(gap));   // far lower targets: the cap already, before any bonus
  const needed = Math.max(0, MAX_HIT - base);
  const chance = Math.min(MAX_HIT, Math.max(MIN_HIT, base + bonus));
  return { base, needed, chance, wasted: Math.max(0, bonus - needed), short: Math.max(0, needed - bonus) };
};

/** a percentage for the page: 16, 4.5 */
export const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
