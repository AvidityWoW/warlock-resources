import { SKIP } from '../lib/macro';

// The macros page: every macro, by group. Bodies are exactly what goes in the game's macro window, except for
// {item:<Stone>} and {create:<Stone>}, which lib/macro.ts swaps for the rank your level can make (see STONES there),
// and {<token>} for each of the card's dropdowns (picks), which is whatever is chosen there (the first choice to start
// with). A line using a dropdown set to SKIP ("None") is dropped; an empty choice just inserts nothing.
// Plain #showtooltip shows the first spell the macro would cast; a name is given only where that would be the wrong icon.
// Spell and item names are checked against the Forever client (see the forever-spell-names note): banes, not curses,
// and no Season of Discovery runes (Chaos Bolt, Metamorphosis, Felguard…), which are in the files but not in the game.
/** a dropdown choice: the text itself, or [label shown in the menu, text put in the macro] */
export type Choice = string | [string, string];
export interface Pick { token: string; label: string; choices: Choice[] }
export interface Macro {
  name: string;
  body: string;
  /** what it does and how to use it; plain text */
  note: string;
  /** a talent, level or race it relies on, shown as a badge */
  needs?: string;
  /** dropdowns on the card, each filling {token} in the body */
  picks?: Pick[];
}
export interface MacroGroup { group: string; blurb: string; macros: Macro[] }

// shared dropdown lists
const DAMAGE: Choice[] = ['Shadow Bolt', 'Incinerate', 'Soul Fire', 'Searing Pain', 'Immolate', 'Corruption', 'Bane of Agony',
  'Drain Life', 'Shadowburn', 'Conflagrate', 'Hellfire'];
const RACIAL_BURST: Choice[] = [['None', SKIP], ['Blood Fury (Orc)', 'Blood Fury'], ['Berserking (Troll)', 'Berserking'], ['Eureka! (Gnome)', 'Eureka!']];
const STONE: Pick = { token: 'stone', label: 'Stone', choices: [['Spellstone (Shadow, haste)', 'Spellstone'], ['Firestone (Fire, crit)', 'Firestone']] };

export const groups: MacroGroup[] = [
  {
    group: 'Casting',
    blurb: 'Everyday damage buttons.',
    macros: [
      {
        name: 'Cast on mouseover',
        body: '#showtooltip\n/cast [@mouseover,harm,nodead][] {spell}',
        note: 'Hover a mob to cast on it without changing target; with nothing under the cursor it goes on your target. Pick a spell, copy, and make one for each DoT, bane and curse you use.',
        picks: [{ token: 'spell', label: 'Spell', choices: ['Corruption', 'Bane of Agony', 'Bane of Doom', 'Bane of Havoc', 'Immolate', 'Siphon Life',
          'Curse of the Elements', 'Curse of Recklessness', 'Curse of Weakness', 'Curse of Tongues', 'Curse of Exhaustion',
          'Shadow Bolt', 'Searing Pain', 'Incinerate', 'Drain Life', 'Drain Soul', 'Shadowburn', 'Conflagrate', 'Death Coil'] }],
      },
      {
        name: 'Shadow Bolt + send demon',
        body: '#showtooltip\n/petattack [harm,nodead]\n/cast Shadow Bolt',
        note: 'Sends your demon after whatever you are casting at, so it never sits idle or chews on the wrong mob.',
      },
      {
        name: 'Wand without toggle-off',
        body: '#showtooltip\n{version}',
        note: 'Shoot is a toggle, so pressing it twice stops your wand. With ! a second press keeps it firing. If ! doesn\'t work, use the castsequence version: the first press starts the wand, and presses within a second of the last one land on "nil", which does nothing, so they can\'t switch it off. Once you have waited longer than that, a press is Shoot again and toggles as normal.',
        picks: [{ token: 'version', label: 'Version', choices: [['/cast !Shoot', '/cast !Shoot'], ['castsequence (if ! is broken)', '/castsequence reset=1 Shoot, nil']] }],
      },
      {
        name: 'Drain Soul for shards',
        body: '#showtooltip\n/cast [mod:shift] Drain Soul; Drain Soul(Rank 1)',
        note: 'Any rank gives a shard if the mob dies while you channel, and rank 1 costs a fraction of the mana. Hold Shift for the top rank when the damage matters.',
      },
      {
        name: 'Bane of Havoc on focus',
        body: '#showtooltip\n/cast [@focus,harm,nodead][@mouseover,harm,nodead][] Bane of Havoc',
        note: 'Bane of Havoc copies part of your damage on other targets to the one it\'s on, so put it on a second mob: your focus, else the mob under your cursor, else your target. Then keep hitting your main target.',
      },
      {
        name: 'Amplify Curse + Bane of Agony',
        body: '#showtooltip Bane of Agony\n/cast Amplify Curse\n/cast Bane of Agony',
        note: 'Amplify Curse now boosts Bane of Agony too. It is off the global cooldown, so it fires with the bane whenever it is ready and is skipped when it isn\'t.',
        needs: 'Affliction talent',
      },
      {
        name: 'Trinkets + racial + spell',
        body: '#showtooltip {spell}\n/use {mod}13\n/use {mod}14\n/cast {mod}{racial}\n/cast {spell}',
        note: 'Pops your on-use trinkets (13 top, 14 bottom) and your racial with the cast; they are off the global cooldown, so the spell still goes off. "Fires on" picks when: every press, only while you hold a key (save them for when it counts), or every press unless you hold one. Delete a /use line if that trinket has no use effect.',
        picks: [{ token: 'spell', label: 'Spell', choices: DAMAGE }, { token: 'racial', label: 'Racial', choices: RACIAL_BURST },
          { token: 'mod', label: 'Fires on', choices: [['Every press', ''], ['Shift', '[mod:shift] '], ['Ctrl', '[mod:ctrl] '], ['Alt', '[mod:alt] '],
            ['Any modifier', '[mod] '], ['Every press, not with a modifier', '[nomod] ']] }],
      },
      {
        name: 'Curses on modifier keys',
        body: '#showtooltip\n/cast [mod:shift] Curse of Recklessness; [mod:ctrl] Curse of Tongues; [mod:alt] Curse of Weakness; Curse of the Elements',
        note: 'Four curses on one button: plain for Elements, Shift, Ctrl or Alt for the others. The icon changes as you hold each key. Banes are separate from curses, so one of each can sit on a target.',
      },
      {
        name: 'Banes on modifier keys',
        body: '#showtooltip\n/cast [mod:shift] Bane of Doom; [mod:ctrl] Bane of Havoc; Bane of Agony',
        note: 'Agony normally, Doom with Shift for long fights, Havoc with Ctrl. Only one of your banes can be on a target at a time.',
      },
      {
        name: 'Levelling DoT sequence',
        body: '#showtooltip\n/castsequence reset=target/combat Bane of Agony, Corruption, Immolate, Shadow Bolt, Shadow Bolt',
        note: 'Each press casts the next spell; a new target or leaving combat starts it over. If a cast fails (out of range, moving) it stays on that step, so press again.',
      },
    ],
  },
  {
    group: 'Control',
    blurb: 'Keep one mob locked down while you kill another.',
    macros: [
      {
        name: 'Crowd control on focus',
        body: '#showtooltip\n/focus [mod:shift]\n/cast [mod:shift][@focus,harm,nodead][] {spell}',
        note: 'Shift-click: cast on your target and make it your focus. Plain clicks: cast on your focus again without leaving your kill target, or on your target if you have no focus.',
        picks: [{ token: 'spell', label: 'Spell', choices: ['Banish', 'Fear', 'Subjugate Demon', 'Seduction', 'Spell Lock', 'Death Coil', 'Curse of Tongues', 'Bane of Havoc'] }],
      },
      {
        name: 'Low-rank Fear or Banish',
        body: '#showtooltip\n/cast [mod:shift] {spell}; {spell}(Rank 1)',
        note: 'Rank 1 normally and the full rank with Shift. Rank 1 is shorter and cheaper: Fear rank 1 is enough when the mob only needs to be gone for a moment, and Banish rank 1 frees it sooner when you\'re ready for it.',
        picks: [{ token: 'spell', label: 'Spell', choices: ['Fear', 'Banish'] }],
      },
      {
        name: 'Interrupt with Death Coil',
        body: '#showtooltip\n/stopcasting\n/cast Death Coil',
        note: 'Drops whatever you are casting and Death Coils straight away: three seconds of horror to stop a heal or shake off a melee.',
        needs: 'Level 42',
      },
      {
        name: 'Fear on mouseover',
        body: '#showtooltip\n/cast [@mouseover,harm,nodead][] Fear',
        note: 'Fear the add under your cursor while your target keeps taking DoTs. Mind where it runs.',
      },
      {
        name: 'Racial escape, mid-cast',
        body: '#showtooltip\n/stopcasting\n/cast {racial}',
        note: 'Your race\'s way out, fired even mid-cast: Escape Artist breaks roots and snares, Will of the Forsaken breaks fear, charm and sleep, Will to Survive breaks stuns, Shatter Curse clears curses and banes.',
        picks: [{ token: 'racial', label: 'Racial', choices: [['Escape Artist (Gnome)', 'Escape Artist'], ['Will of the Forsaken (Undead)', 'Will of the Forsaken'],
          ['Will to Survive (Human)', 'Will to Survive'], ['Shatter Curse (Orc)', 'Shatter Curse']] }],
      },
    ],
  },
  {
    group: 'Your demon',
    blurb: 'Pet buttons that work out which demon is out.',
    macros: [
      {
        name: 'Demon attack / recall',
        body: '/petfollow [mod:shift]\n/petattack [nomod,@mouseover,harm,nodead][nomod]',
        note: 'Sends your demon at the mob under your cursor, or your target. Hold Shift to call it back instead. No #showtooltip here, so pick an icon yourself.',
      },
      {
        name: 'Spell Lock / Seduction / Sacrifice',
        body: '#showtooltip\n/cast [pet:Felhunter,@focus,harm,nodead][pet:Felhunter] Spell Lock; [pet:Succubus,@focus,harm,nodead][pet:Succubus] Seduction; [pet:Voidwalker] Sacrifice',
        note: 'One key for the button you reach for in a pinch: Spell Lock, Seduction or Sacrifice, depending on the demon. Spell Lock and Seduction go on your focus if you have a hostile one, otherwise on your target.',
      },
      {
        name: 'Devour Magic on mouseover',
        body: '#showtooltip\n/cast [@mouseover,exists,nodead][] Devour Magic',
        note: 'Hover a friend to strip a debuff off them, or an enemy to strip a buff. Felhunter only.',
      },
      {
        name: 'Quick demon summon',
        body: '#showtooltip\n/cast [combat] Fel Domination\n/cast [mod:shift] Summon Succubus; [mod:ctrl] Summon Voidwalker; [mod:alt] Summon Imp; Summon Felhunter',
        note: 'Summons a Felhunter, or Succubus, Voidwalker or Imp with Shift, Ctrl or Alt. In combat it uses Fel Domination first, so the summon is near instant.',
        needs: 'Fel Domination: Demonology talent',
      },
    ],
  },
  {
    group: 'Stones, oils and the group',
    blurb: 'Stone macros use the rank for the level you set above.',
    macros: [
      {
        name: 'Healthstone: use or make',
        body: '#showtooltip\n/use [mod:shift] {create:Healthstone}; {item:Healthstone}',
        note: 'Eats your Healthstone; hold Shift to make a new one.',
      },
      {
        name: 'Soulstone: friend, self or make',
        body: '#showtooltip\n/use [mod:shift] {create:Soulstone}; [@mouseover,help,nodead][@target,help,nodead][@player] {item:Soulstone}',
        note: 'Soulstones the friend under your cursor, then your friendly target, then yourself. Hold Shift to make a new stone.',
      },
      {
        name: 'Apply Spellstone / Firestone',
        body: '#showtooltip\n/use [mod:shift] {create:{stone}}; {item:{stone}}\n/use [nomod] 16\n/click StaticPopup1Button1',
        note: 'Spellstone and Firestone now imbue your weapon. This uses the stone, puts it on your main hand (slot 16) and clicks yes if the game asks to replace the enchant already there. Hold Shift to make a new stone instead.',
        picks: [STONE],
      },
      {
        name: 'Apply weapon oil',
        body: '#showtooltip\n/use {oil}\n/use 16\n/click StaticPopup1Button1',
        note: 'Uses the oil on your main hand (slot 16) and confirms replacing the old enchant. A weapon holds one temporary enchant, so an oil and a Spellstone or Firestone replace each other: pick one.',
        picks: [{ token: 'oil', label: 'Oil', choices: ['Brilliant Wizard Oil', 'Wizard Oil', 'Lesser Wizard Oil', 'Minor Wizard Oil', 'Brilliant Mana Oil',
          'Lesser Mana Oil', 'Minor Mana Oil', ['Blessed Wizard Oil (undead)', 'Blessed Wizard Oil']] }],
      },
      {
        name: 'Ritual of Summoning + party call',
        body: '#showtooltip\n/p Summoning %t, please click the portal!\n/cast Ritual of Summoning',
        note: 'Target the player you are summoning first; %t becomes their name. Change /p to /raid in a raid.',
      },
      {
        name: 'Unending Breath on friend or self',
        body: '#showtooltip\n/cast [@mouseover,help,nodead][@target,help,nodead][@player] Unending Breath',
        note: 'Casts on the friend under your cursor, then your friendly target, then yourself, so you never have to retarget.',
      },
      {
        name: 'Soul Shard count',
        body: '/run print("Soul Shards: "..GetItemCount(6265))',
        note: 'Prints how many Soul Shards are in your bags to the chat window.',
      },
    ],
  },
];
