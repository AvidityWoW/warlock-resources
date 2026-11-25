// Typed access to consumes.json: the consumables worth a warlock's bag slot, by the buff they give, then level.
// Written by tools/consumes/gen.py from the game client (what each does) and Wowhead's Forever pages (source, materials).
import raw from './consumes.json';
import type { Source } from './gear';

export type Group = 'flask' | 'elixir' | 'burst' | 'potion' | 'stone' | 'oil' | 'food' | 'scroll' | 'quest';
export interface Consume {
  id: number;
  name: string;
  quality: number;
  req: number | null;
  group: Group;
  /** the buff it gives (Fortitude, Spell damage): like ones sit together under this heading */
  line: string;
  effect: string;
  source: Source;
  /** what a crafted one is made from */
  mats: { id: number; name: string; count: number }[];
}
export const data = raw as { build: string; pulled: string; items: Consume[] };

/** the page's sections, in order: [group, heading, what's in it] */
export const GROUPS: [Group, string, string][] = [
  ['flask', 'Flasks', 'Last two hours and persist through death. Only one can be active.'],
  ['elixir', 'Elixirs', 'Spell damage, Intellect, mana regeneration, health and armor, each from weakest to strongest.'],
  ['burst', 'Burst potions', 'Spell damage for a short while. They share the potion cooldown with mana and healing potions.'],
  ['potion', 'Mana and healing potions', 'Share a two-minute potion cooldown.'],
  ['stone', 'Healthstones, runes and tubers', 'Share their own two-minute cooldown, separate from potions, so you can use one alongside a potion.'],
  ['oil', 'Weapon oils', 'Applied to your main-hand weapon.'],
  ['food', 'Food', 'Well Fed with spell damage or Intellect, after ten seconds of eating.'],
  ['scroll', 'Scrolls', 'Intellect from a scroll.'],
  ['quest', 'Quest buffs', 'Rewards from repeatable quests. Soulbound, so they can\'t be bought or traded.'],
];

// the amounts in a tooltip, in either order: "Intellect by 25" and "25 Intellect"
const STAT = String.raw`spell (?:fire |shadow )?damage(?: and healing)?(?: against \w+)?|damage done by magical spells and effects|Intellect(?: and Spirit)?|Spirit|Stamina|maximum health|maximum mana|armor|chance to critically hit|Spell Critical chance|resistance to all schools of magic`;
const AMOUNT = new RegExp(String.raw`\b(?:(?:${STAT}) by (?:up to )?\d+%?|\d+%? (?:Spell Damage|Intellect|Maximum Health|Armor|Hit Chance|Critical Strike Chance|Haste|mana(?: (?:every|per) 5 sec)?|health(?: every 5 sec)?|life|(?:fire|shadow|holy|frost|nature|arcane) damage))`, 'gi');
/** which colour an amount gets, by what it's an amount of */
const tone = (s: string) => (/crit|hit chance|haste/i.test(s) ? 'rate' : /fire/i.test(s) ? 'fire' : /shadow/i.test(s) ? 'shadow' : /spell|magical/i.test(s) ? 'sp'
  : /intellect|spirit|mana/i.test(s) ? 'mana' : 'life');
/** a tooltip as HTML, with each amount ("spell damage by up to 35", "25 Intellect") coloured by its stat */
export const paint = (effect: string) => effect.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`)
  .replace(AMOUNT, (m) => `<b class="cs-v cs-${tone(m)}">${m}</b>`);
