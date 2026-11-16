// The Demon spells page's own words: what each demon is for and what each of its spells does. The ranks, levels and grimoire prices
// are generated (demons.json, see spellbook.ts). The ability notes are written from the top rank's Forever tooltip on
// Wowhead (2026-11-15); the summon spells' reagents and cast times are from the same tooltips.
import type { DemonName } from './spellbook';

export interface Demon {
  /** the heading; the Succubus's card also covers the Incubus */
  title: string;
  /** whose abilities, in demons.json */
  abilities: DemonName;
  /** its summon spell (Wowhead spell id), the level it's learned at, and its chain on the Class quests page */
  summon: { name: string; id: number }; level: number; quest: string;
  /** a second summon spell of the same level with its own quest chain (Summon Incubus) */
  also?: { name: string; id: number; quest: string };
  /** Summon Imp is the only one that doesn't use a Soul Shard */
  shard: boolean;
  role: string;
  note?: string;
  /** ability name -> what it does */
  does: Record<string, string>;
}

export const DEMONS: Demon[] = [
  { title: 'Imp', abilities: 'Imp', summon: { name: 'Summon Imp', id: 688 }, level: 1, quest: 'imp', shard: false,
    role: 'Fire damage from range, and Stamina for the party. The one demon that costs no Soul Shard.',
    does: {
      'Firebolt': 'Its attack: Fire damage from 30 yards, on a 2 sec cast.',
      'Blood Pact': 'More Stamina for your party while the Imp is near: 4 at rank 1, 54 at rank 5.',
      'Fire Shield': 'A shield on a party member (not the Imp itself) that burns whoever hits them. Lasts 3 min.',
      'Phase Shift': 'Nothing can attack the Imp until it attacks.',
    } },
  { title: 'Voidwalker', abilities: 'Voidwalker', summon: { name: 'Summon Voidwalker', id: 697 }, level: 10, quest: 'voidwalker', shard: true,
    role: 'Your tank: it holds monsters while you cast, and can die to shield you.',
    does: {
      'Torment': 'A taunt: makes one enemy more likely to attack the Voidwalker. 5 sec cooldown.',
      'Sacrifice': 'Kills the Voidwalker to give you a shield for 30 sec (1,943 damage at rank 6). Damage can\'t interrupt your casts while it holds.',
      'Consume Shadows': 'Out of combat, the Voidwalker heals itself over a 10 sec channel.',
      'Suffering': 'Taunts every enemy within 10 yards. 2 min cooldown.',
    } },
  { title: 'Succubus and Incubus', abilities: 'Succubus', summon: { name: 'Summon Succubus', id: 712 }, level: 20, quest: 'succubus', shard: true,
    role: 'Melee Shadow damage, and Seduction to take a Humanoid out of the fight.',
    also: { name: 'Summon Incubus', id: 713, quest: 'incubus' },
    note: 'The Incubus is new in Forever. It and the Succubus are both sayaad: they have the same spells, but each learns them from its own grimoires.',
    does: {
      'Lash of Pain': 'An instant Shadow attack in melee. 12 sec cooldown.',
      'Soothing Kiss': 'Makes its target more likely to attack something else. 4 sec cooldown.',
      'Seduction': 'Stops a Humanoid from doing anything for up to 15 sec. Any damage breaks it.',
      'Lesser Invisibility': 'Makes the demon invisible for up to 5 min. Out of combat only.',
    } },
  { title: 'Felhunter', abilities: 'Felhunter', summon: { name: 'Summon Felhunter', id: 691 }, level: 30, quest: 'felhunter', shard: true,
    role: 'For fighting casters: it eats magic effects and stops spells.',
    does: {
      'Devour Magic': 'Removes one harmful magic effect from a friend, or one helpful one from an enemy, and heals the Felhunter when it does. 8 sec cooldown.',
      'Tainted Blood': 'For 1 min, anything that hits the Felhunter in melee loses attack power for 10 sec (40 at rank 4), stacking 5 times.',
      'Spell Lock': 'Silences for 3 sec. On an enemy that is casting, it stops the cast and locks that school of magic for 6 sec (8 at rank 2). 30 sec cooldown.',
      'Paranoia': 'Your party near the Felhunter detects stealth as if 6 levels higher.',
    } },
];

/** the demons you don't keep: called for a fight, then they have to be controlled */
export const BIG: { demon: string; spell: string; id: number; level: number; quest: string; needs: string; what: string }[] = [
  { demon: 'Infernal', spell: 'Inferno', id: 1122, level: 50, quest: 'infernal', needs: 'An Infernal Stone',
    what: 'A meteor that hits and stuns the area, and leaves an Infernal under your command for 5 min. After that it has to be Subjugated. 1 hour cooldown.' },
  { demon: 'Doomguard', spell: 'Ritual of Doom', id: 18540, level: 60, quest: 'doomguard', needs: 'A Demonic Figurine and 4 party members',
    what: 'A ritual that sacrifices one of the five of you at random to call a Doomguard, which must be Subjugated at once or it attacks. 1 hour cooldown.' },
];
