import { SKIP, type CqsFrom } from '../lib/macro';

// The macros page: every macro, by group. Bodies are exactly what goes in the game's macro window, except for
// {item:<Stone>} and {create:<Stone>}, which lib/macro.ts swaps for the rank your level can make (see STONES there),
// and {<token>} for each of the card's dropdowns (picks), which is whatever is chosen there (the first choice to start
// with). A line using a dropdown set to SKIP ("None") is dropped; an empty choice just inserts nothing.
// Plain #showtooltip shows the first spell the macro would cast; a name is given only where that would be the wrong icon.
// Spell and item names are checked against the Forever client (see the forever-spell-names note): banes, not curses,
// and no Season of Discovery runes (Chaos Bolt, Metamorphosis, Felguard…), which are in the files but not in the game.
/** a dropdown choice: the text itself, or [label shown in the menu, text put in the macro] */
export type Choice = string | [string, string];
/** a heading in a dropdown (an <optgroup>), e.g. a spellbook tab */
export interface ChoiceGroup { group: string; choices: Choice[] }
export interface Pick {
  token: string;
  label: string;
  choices: (Choice | ChoiceGroup)[];
  /** the value chosen to start with (else the first); for checkboxes, the ticked values joined by / */
  default?: string;
  /** a dropdown (the default), checkboxes whose ticked values join with / , or a number box */
  type?: 'select' | 'checks' | 'number';
  /** on a card with many controls: a row of its own, rather than half of a pair */
  wide?: boolean;
}
/** every choice in a dropdown, headings flattened away */
export const flatChoices = (p: Pick): Choice[] => p.choices.flatMap((c) => (typeof c === 'object' && !Array.isArray(c) ? c.choices : [c]));
/** spells under their spellbook tab, A to Z within each */
const byTab = (tabs: Record<string, string[]>): ChoiceGroup[] =>
  Object.entries(tabs).map(([group, spells]) => ({ group, choices: [...spells].sort((a, b) => a.localeCompare(b)) }));
export interface Macro {
  name: string;
  body: string;
  /** what it does and how to use it; plain text */
  note: string;
  /** a talent, level or race it relies on, shown as a badge */
  needs?: string;
  /** dropdowns on the card, each filling {token} in the body */
  picks?: Pick[];
  /** sets {cqs} from these cooldown dropdowns and their modifier dropdowns (see autoCqs in lib/macro.ts) */
  cqs?: CqsFrom;
  /** keeps spell and aim dropdowns compatible: which spell kinds each aim value accepts (null: any) */
  validate?: Validate;
  /** builds a castsequence's {reset} from a seconds box and reset checkboxes (see Derive in lib/macro.ts) */
  reset?: { secs: string; on: string };
}
export interface MacroGroup { group: string; blurb: string; macros: Macro[] }

// shared dropdown lists
const DAMAGE: Choice[] = ['Shadow Bolt', 'Incinerate', 'Soul Fire', 'Searing Pain', 'Immolate', 'Corruption', 'Bane of Agony', 'Wrack',
  'Drain Life', 'Shadowburn', 'Conflagrate', 'Hellfire'];
const RACIAL_BURST: Choice[] = [['None', SKIP], ['Blood Fury (Orc)', 'Blood Fury'], ['Berserking (Troll)', 'Berserking'], ['Eureka! (Gnome)', 'Eureka!']];
const TRINKETS: Choice[] = [['Both', '/use {tmod}13\n/use {tmod}14'], ['Trinket 1 (top)', '/use {tmod}13'], ['Trinket 2 (bottom)', '/use {tmod}14'], ['None', SKIP]];
// the top potion of each kind in the Forever client worth pressing mid-fight, under headings (no Demonic or Dark Runes
// there). Spellblasting, Dragonfire and Elemental Purging are new in Forever. Used by item ID (/use item:13444): it
// doesn't depend on the exact name (the client has several potions sharing one) and keeps the macro short.
const POTIONS: (Choice | ChoiceGroup)[] = [['None', SKIP],
  { group: 'Damage', choices: [['Major Spellblasting Potion (spell damage)', 'item:250937'], ['Dragonfire Potion (fire cone)', 'item:250953'],
    ['Potion of Elemental Purging (vs elementals)', 'item:250954']] },
  { group: 'Mana and health', choices: [['Major Mana Potion', 'item:13444'], ['Major Rejuvenation Potion', 'item:18253'], ['Major Healing Potion', 'item:13446']] },
  { group: 'Protection and utility', choices: [['Greater Shadow Protection Potion', 'item:13459'], ['Greater Fire Protection Potion', 'item:13457'],
    ['Greater Frost Protection Potion', 'item:13456'], ['Greater Nature Protection Potion', 'item:13458'], ['Greater Arcane Protection Potion', 'item:13461'],
    ['Living Action Potion (stuns, snares)', 'item:20008'], ['Limited Invulnerability Potion (physical)', 'item:3387'],
    ['Purification Potion (curse, disease, poison)', 'item:13462'], ['Greater Stoneshield Potion (armor)', 'item:13455']] },
];
/** optional lines before the cast, as in the Death Coil interrupt: /stopattack ends melee auto-attack, /stopcasting
 *  drops whatever you're casting so this goes off straight away */
const STOP_ATTACK: Pick = { token: 'stop', label: 'Stop first', choices: [['Off', SKIP], ['Stop casting', '/stopcasting'], ['Stop attack', '/stopattack'],
  ['Both', '/stopcasting\n/stopattack']] };
/** the same, starting on Both: for crowd control, which you want out right now */
const STOP_BOTH: Pick = { ...STOP_ATTACK, choices: [STOP_ATTACK.choices[3], ...STOP_ATTACK.choices.slice(0, 3)] };
/** where Spell Lock and Seduction go when there's a hostile unit there (else your target) */
const AIM: Pick = { token: 'aim', label: 'Aim at', choices: [['Mouseover', '@mouseover'], ['Focus', '@focus']] };
/** when a cooldown goes off: a condition put in front of its line */
const FIRES_ON: Choice[] = [['Every press', ''], ['Shift', '[mod:shift] '], ['Ctrl', '[mod:ctrl] '], ['Alt', '[mod:alt] '], ['Any modifier', '[mod] '],
  ['No modifier', '[nomod] ']];
/** the same list starting on Shift: the default for the cooldowns, so /cqs stays off unmodified filler presses (and a potion isn't drunk every press) */
const FIRES_ON_SHIFT: Choice[] = [FIRES_ON[1], FIRES_ON[0], ...FIRES_ON.slice(2)];
/** how a spell targets, from its effects in the Forever client: an enemy, a friend (or you), a spot on the ground, your
 *  demon, or nothing (it acts on you or around you) */
export type Kind = 'hostile' | 'friendly' | 'ground' | 'pet' | 'self';
export interface Validate { spells: string[]; aim: string; allowed: Record<string, Kind[] | null> }
export const KIND_SAYS: Record<Kind, string> = { hostile: 'is cast on an enemy', friendly: 'is cast on a friend or yourself',
  ground: 'is a ground spell, aimed at the cursor', pet: 'is cast on your demon', self: 'needs no target' };
export const SPELL_KIND: Record<string, Kind> = {
  ...Object.fromEntries(['Bane of Agony', 'Bane of Doom', 'Bane of Havoc', 'Corruption', 'Curse of Exhaustion', 'Curse of Recklessness', 'Curse of the Elements',
    'Curse of Tongues', 'Curse of Weakness', 'Death Coil', 'Drain Life', 'Drain Mana', 'Drain Soul', 'Fear', 'Siphon Life', 'Wrack', 'Banish', 'Subjugate Demon',
    'Shadow Bolt', 'Immolate', 'Searing Pain', 'Incinerate', 'Soul Fire', 'Shadowburn', 'Conflagrate'].map((s) => [s, 'hostile'])),
  'Unending Breath': 'friendly', 'Detect Invisibility': 'friendly',
  'Rain of Fire': 'ground', Inferno: 'ground',
  'Health Funnel': 'pet',
  ...Object.fromEntries(['Life Tap', 'Amplify Curse', 'Demon Armor', 'Demon Skin', 'Shadow Ward', 'Fel Domination', 'Soul Link', 'Demonic Sacrifice', 'Eye of Kilrogg',
    'Sense Demons', 'Ritual of Summoning', 'Summon Imp', 'Summon Voidwalker', 'Summon Succubus', 'Summon Incubus', 'Summon Felhunter', 'Hellfire', 'Howl of Terror']
    .map((s) => [s, 'self'])),
};

/** where a spell goes: a target chain, a unit, the cursor, or a plain /cast. Each text ends in a space before the spell;
 *  "Your target" is empty, a plain /cast, which suits any spell (and is the only fit for spells that take no target, like
 *  Howl of Terror). Kept last so a forced aim change prefers the specific aims (Rain of Fire moves to the cursor). */
const AIM_CHOICES: Choice[] = [['Hostile mouseover, else target', '[@mouseover,harm,nodead][] '], ['Focus, else target', '[@focus,harm,nodead][] '],
  ['Focus, then mouseover, then target', '[@focus,harm,nodead][@mouseover,harm,nodead][] '],
  ['Friendly mouseover, then target, then you', '[@mouseover,help,nodead][@target,help,nodead][@player] '], ['Yourself', '[@player] '],
  ['Your demon', '[@pet,exists,nodead] '], ['Cursor (ground spells)', '[@cursor] '], ['Your target (plain cast)', '']];
const AIM_SPELL: Pick = { token: 'aim', label: 'Aim at', choices: AIM_CHOICES };
/** the spell kinds each of those aims takes (null: any) */
const AIM_SPELL_FITS: Record<string, Kind[] | null> = {
  '[@mouseover,harm,nodead][] ': ['hostile'], '[@focus,harm,nodead][] ': ['hostile'], '[@focus,harm,nodead][@mouseover,harm,nodead][] ': ['hostile'],
  '[@mouseover,help,nodead][@target,help,nodead][@player] ': ['friendly'], '[@player] ': ['friendly'], '[@pet,exists,nodead] ': ['pet'],
  '[@cursor] ': ['ground'], '': null };

// every warlock spell you'd put on a key, under its spellbook tab (as the client files them), for the two-spell builder
const ALL_SPELLS = byTab({
  Affliction: ['Bane of Agony', 'Bane of Doom', 'Corruption', 'Curse of Exhaustion', 'Curse of Recklessness', 'Curse of the Elements', 'Curse of Tongues',
    'Curse of Weakness', 'Death Coil', 'Drain Life', 'Drain Mana', 'Drain Soul', 'Fear', 'Howl of Terror', 'Life Tap', 'Siphon Life', 'Wrack', 'Amplify Curse'],
  Demonology: ['Banish', 'Subjugate Demon', 'Health Funnel', 'Demon Armor', 'Demon Skin', 'Shadow Ward', 'Unending Breath', 'Detect Invisibility',
    'Fel Domination', 'Soul Link', 'Demonic Sacrifice', 'Eye of Kilrogg', 'Sense Demons', 'Ritual of Summoning', 'Inferno', 'Summon Imp', 'Summon Voidwalker',
    'Summon Succubus', 'Summon Incubus', 'Summon Felhunter'],
  Destruction: ['Bane of Havoc', 'Shadow Bolt', 'Immolate', 'Searing Pain', 'Incinerate', 'Soul Fire', 'Shadowburn', 'Conflagrate', 'Hellfire', 'Rain of Fire'],
});
/** a grouped spell list whose values get a prefix (", Corruption"), led by an empty "None": the later castsequence slots */
const SLOT = (): (Choice | ChoiceGroup)[] => [['None', ''],
  ...ALL_SPELLS.map((g) => ({ group: g.group, choices: g.choices.map((c) => [String(c), `, ${c}`] as [string, string]) }))];
/** a stone's ranks for its card: one dropdown setting both the Create spell's rank and the stone used, so they match.
 *  The first choice follows the level box above (the plain Create spell casts your best rank). `line` writes the macro
 *  line from the create spell and the stone. */
const stoneRankPick = (stone: string, ranks: [string, number][], line: (create: string, item: string) => string): Pick => ({
  token: 'rank', label: 'Rank', choices: [['Your level (set above)', line(`{create:${stone}}`, `{item:${stone}}`)],
    ...ranks.map(([word, level], i) => [`${word ? `${word} ` : ''}${stone} (level ${level})`, line(`Create ${stone}(Rank ${i + 1})`, `${word ? `${word} ` : ''}${stone}`)] as [string, string])
      .reverse()],
});
// Create spell ranks in the Forever client: Rank 1 makes the Minor stone, up to Rank 5 for Major
const HEALTHSTONE_RANK = stoneRankPick('Healthstone', [['Minor', 10], ['Lesser', 22], ['', 34], ['Greater', 46], ['Major', 58]],
  (create, item) => `/use [mod:shift] ${create}; ${item}`);
const SOULSTONE_RANK = stoneRankPick('Soulstone', [['Minor', 18], ['Lesser', 30], ['', 40], ['Greater', 50], ['Major', 60]],
  (create, item) => `/use [mod:shift] ${create}; [@mouseover,help,nodead][@target,help,nodead][@player] ${item}`);
// the Voidwalker's Sacrifice ranks in the Forever client (spells 7812, 19438, 19440–19443) and the level each is learned at.
// Naming a rank works around the game no longer casting plain "Sacrifice" after the Voidwalker learns rank 3.
const SACRIFICE_RANK: Pick = { token: 'sac', label: 'Sacrifice', choices: [['Best rank (plain name)', 'Sacrifice'],
  ...[16, 24, 32, 40, 48, 56].map((level, i) => [`Rank ${i + 1} (level ${level})`, `Sacrifice(Rank ${i + 1})`] as [string, string]).reverse()] };
const STONE: Pick = { token: 'stone', label: 'Stone', choices: [['Spellstone (Shadow, haste)', 'Spellstone'], ['Firestone (Fire, crit)', 'Firestone']] };

export const groups: MacroGroup[] = [
  {
    group: 'Cooldowns',
    blurb: 'Trinkets, racial and a potion on one button, each on the key you choose.',
    macros: [
      {
        name: 'Burst on your filler',
        body: '#showtooltip {spell}\n{trinkets}\n/cast {rmod}{racial}\n/use {pmod}{potion}\n/cast {aim}{spell}\n/cqs{cqs}',
        note: 'Pops your on-use trinkets, racial and a potion with the cast; they are off the global cooldown, so the spell still goes off. Choose which trinkets have a use effect (1 is the top slot, 2 the bottom). Each has its own "on": every press, only while you hold a key (save it for when it counts), or only when you don\'t. Potions start on Shift so you don\'t drink one every press; the list has the top rank of each, under Damage, Mana and health, and Protection and utility. "No spell" makes it a cooldowns-only button. /cqs (cancel queued spell) at the end stops the spell queue from locking in your next cast early, so the potion and other off-GCD items actually go off while you spam the button. It follows your choices: on the same keys as your cooldowns, or every press if any of them fires every press. Holding the next cast until the current one finishes slows a filler a little, so put the cooldowns on a key to keep unmodified presses at full speed.',
        picks: [{ token: 'spell', label: 'Spell', choices: [...DAMAGE, ['No spell (cooldowns only)', SKIP]], wide: true }, { ...AIM_SPELL, default: '', wide: true },
          { token: 'trinkets', label: 'Trinkets', choices: TRINKETS }, { token: 'tmod', label: 'on', choices: FIRES_ON_SHIFT },
          { token: 'racial', label: 'Racial', choices: RACIAL_BURST }, { token: 'rmod', label: 'on', choices: FIRES_ON_SHIFT },
          { token: 'potion', label: 'Potion', choices: POTIONS }, { token: 'pmod', label: 'on', choices: FIRES_ON_SHIFT }],
        cqs: { parts: { trinkets: 'tmod', racial: 'rmod', potion: 'pmod' }, filler: 'spell' },
        validate: { spells: ['spell'], aim: 'aim', allowed: AIM_SPELL_FITS },
      },
    ],
  },
  {
    group: 'Builders',
    blurb: 'Pick the parts and the macro writes itself.',
    macros: [
      {
        name: 'Swap spells with a modifier',
        body: '#showtooltip\n{on}',
        note: 'The [mod] A; B pattern: hold the key for spell A, press without it for spell B. Pick both spells, the key, and where they land; the icon shows whichever spell the key you\'re holding will cast.',
        // "Cast on" holds the whole /cast line; {key}, {a} and {b} inside it are filled from the other dropdowns
        picks: [{ token: 'a', label: 'Spell A', choices: ALL_SPELLS, default: 'Searing Pain' },
          { token: 'key', label: 'on', choices: [['Shift', 'mod:shift'], ['Ctrl', 'mod:ctrl'], ['Alt', 'mod:alt'], ['Any modifier', 'mod']] },
          { token: 'b', label: 'Spell B', choices: ALL_SPELLS, default: 'Shadow Bolt', wide: true },
          { token: 'on', label: 'Cast on', wide: true, choices: [['Your target', '/cast [{key}] {a}; {b}'],
            ['Mouseover, else target', '/cast [{key},@mouseover,harm,nodead][{key}] {a}; [@mouseover,harm,nodead][] {b}'],
            ['Focus, else target', '/cast [{key},@focus,harm,nodead][{key}] {a}; [@focus,harm,nodead][] {b}']] }],
        validate: { spells: ['a', 'b'], aim: 'on', allowed: {
          '/cast [{key}] {a}; {b}': null,
          '/cast [{key},@mouseover,harm,nodead][{key}] {a}; [@mouseover,harm,nodead][] {b}': ['hostile'],
          '/cast [{key},@focus,harm,nodead][{key}] {a}; [@focus,harm,nodead][] {b}': ['hostile'] } },
      },
      {
        name: 'Three spells, one button',
        body: '#showtooltip\n/cast [mod:shift] {s}; [mod:ctrl] {c}; {d}',
        note: 'Shift casts the first, Ctrl the second, and an unmodified press the third. The icon follows whichever key you hold.',
        picks: [{ token: 'd', label: 'Unmodified', choices: ALL_SPELLS, default: 'Shadow Bolt', wide: true },
          { token: 's', label: 'Shift', choices: ALL_SPELLS, default: 'Searing Pain' },
          { token: 'c', label: 'Ctrl', choices: ALL_SPELLS, default: 'Death Coil' }],
      },
      {
        name: 'Cast without retargeting',
        body: '#showtooltip\n{stop}\n/cast {aim}{spell}',
        note: 'One spell, aimed where you want it without retargeting. The chain tries each unit in turn and casts on the first that fits; "Stop first" can drop your current cast and auto-attack before it goes. Pick any spell and the aim follows it if it has to: enemy spells on enemy chains, Unending Breath on friends or you, Rain of Fire at the cursor, Health Funnel on your demon, and "Your target" for a plain cast with no conditions, which is also what spells with no target (Howl of Terror, Hellfire, Life Tap, armors) get.',
        picks: [{ token: 'spell', label: 'Spell', choices: ALL_SPELLS, default: 'Corruption' },
          AIM_SPELL,
          STOP_ATTACK],
        validate: { spells: ['spell'], aim: 'aim', allowed: AIM_SPELL_FITS },
      },
      {
        name: 'A rotation on one button',
        body: '#showtooltip\n/castsequence {reset}{s1}{s2}{s3}{s4}',
        note: 'Each press casts the next spell in the list, then it starts over. If a cast fails (out of range, moving, not enough mana) it stays on that step until it works, so a long sequence can get stuck: keep it short, and pick when it resets. Tick any mix: a new target, leaving combat, or pressing with a modifier key starts it over, and so does going the set number of seconds without pressing it.',
        picks: [{ token: 's1', label: '1st', choices: ALL_SPELLS, default: 'Corruption' }, { token: 's2', label: '2nd', choices: SLOT(), default: ', Bane of Agony' },
          { token: 's3', label: '3rd', choices: SLOT(), default: ', Immolate' }, { token: 's4', label: '4th', choices: SLOT(), default: ', Shadow Bolt' },
          { token: 'ron', label: 'Reset on', type: 'checks', default: 'target/combat',
            choices: [['New target', 'target'], ['Leaving combat', 'combat'], ['Shift', 'shift'], ['Ctrl', 'ctrl'], ['Alt', 'alt']] },
          { token: 'rsecs', label: 'Idle timer (seconds)', type: 'number', choices: [], default: '' }],
        reset: { secs: 'rsecs', on: 'ron' },
      },
    ],
  },
  {
    group: 'Casting',
    blurb: 'Everyday damage buttons.',
    macros: [
      {
        name: 'DoT adds without retargeting',
        body: '#showtooltip\n{stop}\n/cast [@mouseover,harm,nodead][] {spell}',
        note: 'Hover a mob to cast on it without changing target; with nothing under the cursor it goes on your target. Pick a spell, copy, and make one for each DoT, bane and curse you use. Stop first adds lines before the cast, like the Death Coil interrupt: /stopattack ends melee auto-attack (from right-clicking a mob), /stopcasting drops your current cast so this one goes off now.',
        // grouped by spellbook tab, as the client files them
        picks: [{ token: 'spell', label: 'Spell', choices: byTab({
          Affliction: ['Corruption', 'Bane of Agony', 'Bane of Doom', 'Siphon Life', 'Wrack', 'Curse of the Elements', 'Curse of Recklessness', 'Curse of Weakness',
            'Curse of Tongues', 'Curse of Exhaustion', 'Drain Life', 'Drain Soul', 'Death Coil'],
          Demonology: ['Banish', 'Subjugate Demon'],
          Destruction: ['Shadow Bolt', 'Immolate', 'Searing Pain', 'Incinerate', 'Shadowburn', 'Conflagrate', 'Bane of Havoc'],
        }) }, STOP_ATTACK],
      },
      {
        name: 'Rain of Fire, no placing',
        body: '#showtooltip\n/cast [mod:shift,@player][@cursor] Rain of Fire',
        note: 'Drops Rain of Fire right where your mouse is, with no targeting circle to place. Hold Shift to drop it at your own feet instead.',
      },
      {
        name: 'Bolt and bring your demon',
        body: '#showtooltip\n/petattack [harm,nodead]\n/cast Shadow Bolt',
        note: 'Sends your demon after whatever you are casting at, so it never sits idle or chews on the wrong mob.',
      },
      {
        name: 'Spam-safe wand',
        body: '#showtooltip\n{version}',
        note: 'Shoot is a toggle, so pressing it twice stops your wand. With ! a second press keeps it firing. If ! doesn\'t work, use the castsequence version: the first press starts the wand, and presses within a second of the last one land on "nil", which does nothing, so they can\'t switch it off. Once you have waited longer than that, a press is Shoot again and toggles as normal.',
        picks: [{ token: 'version', label: 'Version', choices: [['/cast !Shoot', '/cast !Shoot'], ['castsequence (if ! is broken)', '/castsequence reset=1 Shoot, nil']] }],
      },
      {
        name: 'Cheap shard farming',
        body: '#showtooltip\n/cast [mod:shift] Drain Soul; Drain Soul(Rank 1)',
        note: 'Any rank gives a shard if the mob dies while you channel, and rank 1 costs a fraction of the mana. Hold Shift for the top rank when the damage matters.',
      },
      {
        name: 'Spread damage with Havoc',
        body: '#showtooltip\n/cast [@focus,harm,nodead][@mouseover,harm,nodead][] Bane of Havoc',
        note: 'Bane of Havoc copies part of your damage on other targets to the one it\'s on, so put it on a second mob: your focus, else the mob under your cursor, else your target. Then keep hitting your main target.',
      },
      {
        name: 'Stronger Agony, automatically',
        body: '#showtooltip Bane of Agony\n/cast Amplify Curse\n/cast Bane of Agony',
        note: 'Amplify Curse now boosts Bane of Agony too. It is off the global cooldown, so it fires with the bane whenever it is ready and is skipped when it isn\'t.',
        needs: 'Affliction talent',
      },
      {
        name: 'Every curse on one key',
        body: '#showtooltip\n/cast [mod:shift] Curse of Recklessness; [mod:ctrl] Curse of Tongues; [mod:alt] Curse of Weakness; Curse of the Elements',
        note: 'Four curses on one button: plain for Elements, Shift, Ctrl or Alt for the others. The icon changes as you hold each key. Banes are separate from curses, so one of each can sit on a target.',
      },
      {
        name: 'Every bane on one key',
        body: '#showtooltip\n/cast [mod:shift] Bane of Doom; [mod:ctrl] Bane of Havoc; Bane of Agony',
        note: 'Agony normally, Doom with Shift for long fights, Havoc with Ctrl. Only one of your banes can be on a target at a time.',
      },
      {
        name: 'Levelling on one button',
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
        name: 'Keep your CC target locked',
        body: '#showtooltip\n/focus [mod:shift]\n/cast [mod:shift][@focus,harm,nodead][] {spell}',
        note: 'Shift-click: cast on your target and make it your focus. Unmodified clicks: cast on your focus again without leaving your kill target, or on your target if you have no focus.',
        picks: [{ token: 'spell', label: 'Spell', choices: ['Banish', 'Fear', 'Subjugate Demon', 'Seduction', 'Spell Lock', 'Death Coil', 'Curse of Tongues', 'Bane of Havoc'] }],
      },
      {
        name: 'Short, cheap crowd control',
        body: '#showtooltip\n/cast [mod:shift] {spell}; {spell}(Rank 1)',
        note: 'Rank 1 normally and the full rank with Shift. Rank 1 is shorter and cheaper: Fear rank 1 is enough when the mob only needs to be gone for a moment, and Banish rank 1 frees it sooner when you\'re ready for it.',
        picks: [{ token: 'spell', label: 'Spell', choices: ['Fear', 'Banish'] }],
      },
      {
        name: 'Instant CC on an add',
        body: '#showtooltip\n{stop}\n/cast [@mouseover,harm,nodead][] {spell}',
        note: 'Drops whatever you are casting and stops auto-attack, then puts the spell on the mob under your cursor, or your target if there\'s none: Fear an add, Death Coil a healer mid-cast, Banish or Subjugate a demon, Tongues a caster. Make one per spell.',
        picks: [{ token: 'spell', label: 'Spell', choices: ['Fear', 'Death Coil', 'Banish', 'Subjugate Demon', 'Curse of Tongues'] }, STOP_BOTH],
      },
      {
        name: 'Break free mid-cast',
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
        name: 'Send or recall your demon',
        body: '/petpassive [mod:shift]\n/petfollow [mod:shift]\n/petattack [nomod,@mouseover,harm,nodead][nomod]',
        note: 'Sends your demon at the mob under your cursor, or your target. Hold Shift to call it back: it goes passive and follows, so it doesn\'t run straight back in (send it again with an unmodified press). No #showtooltip here, so pick an icon yourself.',
      },
      {
        name: 'Demon that knows when to return',
        body: '/petfollow [@pettarget,harm,nodead]\n/stopmacro [@pettarget,harm,nodead]\n/petattack [@mouseover,harm,nodead][]',
        note: 'One key that toggles: the first press sends your demon at the enemy under your cursor (or your target), the next press calls it back. It goes by what the demon is doing: if it\'s on a live enemy, the press recalls it; if not (following, or its target died), the press sends it in. No #showtooltip here, so pick an icon yourself.',
      },
      {
        name: 'Keep your imp casting',
        body: '#showtooltip\n/cast {spell}\n/cast [pet:Imp,@pettarget,harm] !Firebolt',
        note: 'Shortens the gaps between your imp\'s Firebolts when you spam it: each press also tells the imp to Firebolt whatever it\'s attacking, and the ! keeps that from toggling it off. Put it on every spell you spam. The imp still has to be sent in first (Send or recall your demon, or /petattack on a key of its own, with /petfollow and /petpassive on another), and it only narrows the gaps, it doesn\'t remove them.',
        picks: [{ token: 'spell', label: 'Spell', choices: DAMAGE }],
      },
      {
        name: 'Demon panic button',
        body: '#showtooltip\n/cast [pet:Voidwalker] {sac}\n/cast [pet:Succubus,{aim},harm,nodead][pet:Succubus] Seduction\n/cast [pet:Felhunter,{aim},harm,nodead][pet:Felhunter] Spell Lock',
        note: 'One key for the button you reach for in a pinch, whichever demon is out: Sacrifice, Seduction or Spell Lock. Seduction and Spell Lock go on your mouseover (or focus) if it\'s hostile, otherwise on your target. Sacrifice: if the button stops working once your Voidwalker learns rank 3, pick the highest rank it knows here, which names the rank in the macro.',
        picks: [SACRIFICE_RANK, AIM],
      },
      {
        name: 'Your demon\'s everyday move',
        body: '#showtooltip\n/cast [pet:Voidwalker] Torment\n/cast [pet:Succubus] Lash of Pain\n/cast [pet:Felhunter,@mouseover,nodead][pet:Felhunter] Devour Magic',
        note: 'Each demon\'s everyday button: Torment to pull a mob off you, Lash of Pain for damage, Devour Magic on the unit under your cursor (a friend to strip a debuff, an enemy to strip a buff) or your target.',
      },
      {
        name: 'Heal your demon, no targeting',
        body: '#showtooltip\n/cast [@pet,exists,nodead] Health Funnel',
        note: 'Heals your demon without having to target it, and does nothing when it\'s dead or not out.',
      },
      {
        name: 'Instant summon in combat',
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
        name: 'Healthstone on one key',
        body: '#showtooltip\n{rank}',
        note: 'Eats your Healthstone; hold Shift to make a new one. Rank sets both, so you make and eat the same stone: leave it on your level, or pick one (a low rank if you want a cheaper stone).',
        picks: [HEALTHSTONE_RANK],
      },
      {
        name: 'Eat whatever healthstone you have',
        body: '#showtooltip\n/use Major Healthstone\n/use Greater Healthstone\n/use Healthstone\n/use Lesser Healthstone\n/use Minor Healthstone',
        note: 'Every rank, best first: it eats the best healthstone in your bags, whatever rank a warlock made you. All healthstones share one cooldown, so only one goes per press. Update #showtooltip: as it is, the button shows the first stone listed (Major), even when you carry a lower one; add the name of the stone you have, e.g. #showtooltip Greater Healthstone, to see its icon, count and cooldown.',
      },
      {
        name: 'Soulstone whoever needs it',
        body: '#showtooltip\n{rank}',
        note: 'Soulstones the friend under your cursor, then your friendly target, then yourself. Hold Shift to make a new stone. Rank sets both, so you make and use the same stone: leave it on your level, or pick one.',
        picks: [SOULSTONE_RANK],
      },
      {
        name: 'One-click weapon stone',
        body: '#showtooltip\n/use [mod:shift] {create:{stone}}; {item:{stone}}\n/use [nomod] 16\n/click StaticPopup1Button1',
        note: 'Spellstone and Firestone now imbue your weapon. This uses the stone, puts it on your main hand (slot 16) and clicks yes if the game asks to replace the enchant already there. Hold Shift to make a new stone instead.',
        picks: [STONE],
      },
      {
        name: 'One-click weapon oil',
        body: '#showtooltip\n/use {oil}\n/use 16\n/click StaticPopup1Button1',
        note: 'Uses the oil on your main hand (slot 16) and confirms replacing the old enchant. A weapon holds one temporary enchant, so an oil and a Spellstone or Firestone replace each other: pick one.',
        picks: [{ token: 'oil', label: 'Oil', choices: ['Brilliant Wizard Oil', 'Wizard Oil', 'Lesser Wizard Oil', 'Minor Wizard Oil', 'Brilliant Mana Oil',
          'Lesser Mana Oil', 'Minor Mana Oil', ['Blessed Wizard Oil (undead)', 'Blessed Wizard Oil']] }],
      },
      {
        name: 'Summon and tell the group',
        body: '#showtooltip\n{ritual}',
        note: 'Ritual of Summoning: target the player you are summoning first; %t becomes their name. Portal of Summoning (level 60) opens a portal that two others click to summon whoever they target, so the call-out asks for helpers. Change /p to /raid in a raid.',
        picks: [{ token: 'ritual', label: 'Ritual', choices: [['Ritual of Summoning', '/p Summoning %t, please click the portal!\n/cast Ritual of Summoning'],
          ['Portal of Summoning (60)', '/p Summoning portal going up: click it and stand still to help summon!\n/cast Portal of Summoning']] }],
      },
      {
        name: 'Breath for anyone underwater',
        body: '#showtooltip\n/cast [@mouseover,help,nodead][@target,help,nodead][@player] Unending Breath',
        note: 'Casts on the friend under your cursor, then your friendly target, then yourself, so you never have to retarget.',
      },
      {
        name: 'How many shards are left',
        body: '/run print("Soul Shards: "..GetItemCount(6265))',
        note: 'Prints how many Soul Shards are in your bags to the chat window.',
      },
    ],
  },
];
