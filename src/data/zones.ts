// Zones, dungeons and raids by level, for any class.
// - Zones and dungeons: Classic's suggested level ranges, the ones guides and the old game manual use. Forever's
//   client has no ranges of its own (its zone tooltips on Wowhead are just the lowest and highest subarea exploration
//   levels, so a single new area skews them: Dun Morogh shows 1-56 for its level-56 Ironforge Submarine Facility).
// - New Forever zones (Riverglades, Zephras Isle): their subareas' exploration levels, from the client's AreaTable
//   (1.60.1.70862), which is all there is so far.
// - Forever's nine new dungeons: the ranges in Blizzard's "Explore the New Dungeons of World of Warcraft: Forever"
//   (news.blizzard.com/en-us/article/24301455). Each one's lowest level matches its level in the client's group finder
//   (LFGDungeons -> ContentTuning, 1.60.1.70862), except Excavation Site (26 there) and Shaper's Terrace (60).

/** A: Alliance, H: Horde, C: contested (either faction) */
export type Side = 'A' | 'H' | 'C';
export type Kind = 'zone' | 'dungeon' | 'raid';
export interface Place {
  name: string;
  /** suggested levels, lowest and highest */
  min: number; max: number;
  /** continent for a zone, the zone it's in for an instance */
  where: string;
  side: Side;
  /** players, for raids */
  size?: number;
  /** added by Forever */
  isNew?: boolean;
}

const EK = 'Eastern Kingdoms', KAL = 'Kalimdor';

export const ZONES: Place[] = [
  { name: 'Elwynn Forest', min: 1, max: 10, where: EK, side: 'A' },
  { name: 'Dun Morogh', min: 1, max: 10, where: EK, side: 'A' },
  { name: 'Teldrassil', min: 1, max: 10, where: KAL, side: 'A' },
  { name: 'Durotar', min: 1, max: 10, where: KAL, side: 'H' },
  { name: 'Mulgore', min: 1, max: 10, where: KAL, side: 'H' },
  { name: 'Tirisfal Glades', min: 1, max: 10, where: EK, side: 'H' },
  { name: 'Zephras Isle', min: 1, max: 12, where: 'Its own isle', side: 'C', isNew: true },
  { name: 'Westfall', min: 10, max: 20, where: EK, side: 'A' },
  { name: 'Loch Modan', min: 10, max: 20, where: EK, side: 'A' },
  { name: 'Darkshore', min: 10, max: 20, where: KAL, side: 'A' },
  { name: 'Silverpine Forest', min: 10, max: 20, where: EK, side: 'H' },
  { name: 'The Barrens', min: 10, max: 25, where: KAL, side: 'H' },
  { name: 'Redridge Mountains', min: 15, max: 25, where: EK, side: 'C' },
  { name: 'Stonetalon Mountains', min: 15, max: 27, where: KAL, side: 'C' },
  { name: 'Ashenvale', min: 18, max: 30, where: KAL, side: 'C' },
  { name: 'Duskwood', min: 18, max: 30, where: EK, side: 'C' },
  { name: 'Wetlands', min: 20, max: 30, where: EK, side: 'C' },
  { name: 'Hillsbrad Foothills', min: 20, max: 30, where: EK, side: 'C' },
  { name: 'Thousand Needles', min: 25, max: 35, where: KAL, side: 'C' },
  { name: 'Alterac Mountains', min: 30, max: 40, where: EK, side: 'C' },
  { name: 'Arathi Highlands', min: 30, max: 40, where: EK, side: 'C' },
  { name: 'Desolace', min: 30, max: 40, where: KAL, side: 'C' },
  { name: 'Stranglethorn Vale', min: 30, max: 45, where: EK, side: 'C' },
  { name: 'Dustwallow Marsh', min: 35, max: 45, where: KAL, side: 'C' },
  { name: 'Badlands', min: 35, max: 45, where: EK, side: 'C' },
  { name: 'Swamp of Sorrows', min: 35, max: 45, where: EK, side: 'C' },
  { name: 'Riverglades', min: 36, max: 44, where: EK, side: 'C', isNew: true },
  { name: 'Feralas', min: 40, max: 50, where: KAL, side: 'C' },
  { name: 'The Hinterlands', min: 40, max: 50, where: EK, side: 'C' },
  { name: 'Tanaris', min: 40, max: 50, where: KAL, side: 'C' },
  { name: 'Searing Gorge', min: 43, max: 50, where: EK, side: 'C' },
  { name: 'Azshara', min: 45, max: 55, where: KAL, side: 'C' },
  { name: 'Blasted Lands', min: 45, max: 55, where: EK, side: 'C' },
  { name: "Un'Goro Crater", min: 48, max: 55, where: KAL, side: 'C' },
  { name: 'Felwood', min: 48, max: 55, where: KAL, side: 'C' },
  { name: 'Burning Steppes', min: 50, max: 58, where: EK, side: 'C' },
  { name: 'Western Plaguelands', min: 51, max: 58, where: EK, side: 'C' },
  { name: 'Eastern Plaguelands', min: 53, max: 60, where: EK, side: 'C' },
  { name: 'Winterspring', min: 53, max: 60, where: KAL, side: 'C' },
  { name: 'Deadwind Pass', min: 55, max: 60, where: EK, side: 'C' },
  { name: 'Silithus', min: 55, max: 60, where: KAL, side: 'C' },
];

export const DUNGEONS: Place[] = [
  { name: 'Hall of Thanes', min: 13, max: 18, where: 'Dun Morogh', side: 'C', isNew: true },
  { name: 'Ruins of Lordaeron', min: 15, max: 20, where: 'Tirisfal Glades', side: 'C', isNew: true },
  { name: 'Excavation Site', min: 24, max: 29, where: 'Wetlands', side: 'C', isNew: true },
  { name: 'City of Dalaran', min: 28, max: 33, where: 'Alterac Mountains', side: 'C', isNew: true },
  { name: 'The Drowned City', min: 35, max: 40, where: 'Stranglethorn Vale', side: 'C', isNew: true },
  { name: "Krol'dok Stronghold", min: 40, max: 45, where: 'Riverglades', side: 'C', isNew: true },
  { name: 'Alcaz Prison', min: 48, max: 53, where: 'Dustwallow Marsh', side: 'C', isNew: true },
  { name: 'Blackmaw Hold', min: 55, max: 60, where: 'Azshara', side: 'C', isNew: true },
  { name: "Shaper's Terrace", min: 58, max: 60, where: "Un'Goro Crater", side: 'C', isNew: true },
  { name: 'Ragefire Chasm', min: 13, max: 18, where: 'Orgrimmar', side: 'H' },
  { name: 'Wailing Caverns', min: 17, max: 24, where: 'The Barrens', side: 'C' },
  { name: 'The Deadmines', min: 17, max: 26, where: 'Westfall', side: 'C' },
  { name: 'Shadowfang Keep', min: 22, max: 30, where: 'Silverpine Forest', side: 'C' },
  { name: 'Blackfathom Deeps', min: 24, max: 32, where: 'Ashenvale', side: 'C' },
  { name: 'The Stockade', min: 24, max: 32, where: 'Stormwind City', side: 'A' },
  { name: 'Scarlet Monastery: Graveyard', min: 26, max: 36, where: 'Tirisfal Glades', side: 'C' },
  { name: 'Gnomeregan', min: 29, max: 38, where: 'Dun Morogh', side: 'C' },
  { name: 'Razorfen Kraul', min: 29, max: 38, where: 'The Barrens', side: 'C' },
  { name: 'Scarlet Monastery: Library', min: 29, max: 39, where: 'Tirisfal Glades', side: 'C' },
  { name: 'Scarlet Monastery: Armory', min: 32, max: 42, where: 'Tirisfal Glades', side: 'C' },
  { name: 'Scarlet Monastery: Cathedral', min: 35, max: 45, where: 'Tirisfal Glades', side: 'C' },
  { name: 'Razorfen Downs', min: 37, max: 46, where: 'The Barrens', side: 'C' },
  { name: 'Uldaman', min: 41, max: 51, where: 'Badlands', side: 'C' },
  { name: "Zul'Farrak", min: 44, max: 54, where: 'Tanaris', side: 'C' },
  { name: 'Maraudon', min: 46, max: 55, where: 'Desolace', side: 'C' },
  { name: 'Sunken Temple', min: 50, max: 56, where: 'Swamp of Sorrows', side: 'C' },
  { name: 'Blackrock Depths', min: 52, max: 60, where: 'Blackrock Mountain', side: 'C' },
  { name: 'Lower Blackrock Spire', min: 55, max: 60, where: 'Blackrock Mountain', side: 'C' },
  { name: 'Dire Maul', min: 55, max: 60, where: 'Feralas', side: 'C' },
  { name: 'Upper Blackrock Spire', min: 58, max: 60, where: 'Blackrock Mountain', side: 'C', size: 10 },
  { name: 'Scholomance', min: 58, max: 60, where: 'Western Plaguelands', side: 'C' },
  { name: 'Stratholme', min: 58, max: 60, where: 'Eastern Plaguelands', side: 'C' },
];

export const RAIDS: Place[] = [
  { name: "Zul'Gurub", min: 60, max: 60, where: 'Stranglethorn Vale', side: 'C', size: 20 },
  { name: "Ruins of Ahn'Qiraj", min: 60, max: 60, where: 'Silithus', side: 'C', size: 20 },
  { name: 'Molten Core', min: 60, max: 60, where: 'Blackrock Mountain', side: 'C', size: 40 },
  { name: "Onyxia's Lair", min: 60, max: 60, where: 'Dustwallow Marsh', side: 'C', size: 40 },
  { name: 'Blackwing Lair', min: 60, max: 60, where: 'Blackrock Mountain', side: 'C', size: 40 },
  { name: "Temple of Ahn'Qiraj", min: 60, max: 60, where: 'Silithus', side: 'C', size: 40 },
  { name: 'Naxxramas', min: 60, max: 60, where: 'Eastern Plaguelands', side: 'C', size: 40 },
];

export const SECTIONS: { kind: Kind; title: string; noun: string; places: Place[] }[] = [
  { kind: 'zone', title: 'Zones', noun: 'zones', places: ZONES },
  { kind: 'dungeon', title: 'Dungeons', noun: 'dungeons', places: DUNGEONS },
  { kind: 'raid', title: 'Raids', noun: 'raids', places: RAIDS },
];

/** the highest monster level that's grey (no experience) to you, Classic's formula */
export const grayLevel = (lv: number) => (lv <= 5 ? 0 : lv < 40 ? lv - Math.floor(lv / 10) - 5 : lv < 60 ? lv - Math.floor(lv / 5) - 1 : lv - 9);
/** where the difficulty colours sit on the 1–60 track at your level, as CSS custom properties: each colour is pinned to
 *  the middle of its first and last level, and the bar blends between them over one level. Grey: no experience; green:
 *  3 or more below you; yellow: within 2; orange: 3–4 above; red: 5 or more above. */
export function conVars(lv: number, cap = 60) {
  const at = (l: number) => `${(((l - 0.5) / cap) * 100).toFixed(2)}%`;
  const g = grayLevel(lv);
  return `--you:${at(lv)};--c-grey:${at(g)};--c-green0:${at(g + 1)};--c-green1:${at(Math.max(g + 1, lv - 3))};`
    + `--c-yellow0:${at(lv - 2)};--c-yellow1:${at(lv + 2)};--c-orange0:${at(lv + 3)};--c-orange1:${at(lv + 4)};--c-red:${at(lv + 5)}`;
}
