// The macro guide tab: the builder's menus and the spell list it suggests, checked against the Forever client's warlock
// spells: banes and Incubus are in; Season of Discovery runes (Chaos Bolt, Metamorphosis, Felguard, Shadowflame, Fel Armor)
// are left in the files but aren't in the game, so they're left out here, as are arena frames.

/** spells and items the builder's spell box suggests */
export const SPELLS = [
  'Shadow Bolt', 'Immolate', 'Corruption', 'Bane of Agony', 'Bane of Doom', 'Bane of Havoc', 'Curse of the Elements',
  'Curse of Recklessness', 'Curse of Weakness', 'Curse of Tongues', 'Curse of Exhaustion', 'Amplify Curse',
  'Siphon Life', 'Drain Life', 'Drain Mana', 'Drain Soul', 'Life Tap', 'Searing Pain', 'Soul Fire', 'Incinerate',
  'Shadowburn', 'Conflagrate', 'Rain of Fire', 'Hellfire', 'Fear', 'Howl of Terror', 'Death Coil', 'Banish',
  'Subjugate Demon', 'Health Funnel', 'Demon Skin', 'Demon Armor', 'Shadow Ward', 'Unending Breath', 'Detect Invisibility',
  'Eye of Kilrogg', 'Sense Demons', 'Ritual of Summoning', 'Ritual of Doom', 'Inferno', 'Summon Imp', 'Summon Voidwalker',
  'Summon Succubus', 'Summon Incubus', 'Summon Felhunter', 'Summon Felsteed', 'Summon Dreadsteed', 'Fel Domination',
  'Demonic Sacrifice', 'Soul Link', 'Shoot', 'Create Healthstone', 'Create Soulstone', 'Create Spellstone',
  // demon abilities
  'Firebolt', 'Fire Shield', 'Phase Shift', 'Blood Pact', 'Torment', 'Suffering', 'Sacrifice', 'Consume Shadows',
  'Lash of Pain', 'Seduction', 'Soothing Kiss', 'Lesser Invisibility', 'Spell Lock', 'Devour Magic', 'Tainted Blood', 'Paranoia',
  // items
  'Major Healthstone', 'Major Soulstone', 'Major Spellstone',
];

/** one dropdown in a condition set: its key, label, and [value, menu text] options; '' is "don't check" */
export interface CondMenu { key: string; label: string; options: [string, string][] }
export const COND_MENUS: CondMenu[] = [
  { key: 'unit', label: 'On', options: [['', 'default target'], ['@target', '@target'], ['@mouseover', '@mouseover'], ['@focus', '@focus'],
    ['@player', '@player (you)'], ['@pet', '@pet'], ['@targettarget', '@targettarget'], ['@focustarget', '@focustarget'],
    ['@pettarget', '@pettarget'], ['@cursor', '@cursor (ground spells)']] },
  { key: 'react', label: 'Unit is', options: [['', 'any'], ['harm', 'hostile (harm)'], ['help', 'friendly (help)'], ['exists', 'there (exists)'], ['noexists', 'not there (noexists)']] },
  { key: 'dead', label: 'Alive?', options: [['', 'any'], ['nodead', 'alive (nodead)'], ['dead', 'dead']] },
  { key: 'mod', label: 'Keys', options: [['', 'any'], ['nomod', 'none held (nomod)'], ['mod', 'any held (mod)'], ['mod:shift', 'Shift'], ['mod:ctrl', 'Ctrl'],
    ['mod:alt', 'Alt'], ['mod:shift,mod:ctrl', 'Shift + Ctrl'], ['mod:shift/ctrl', 'Shift or Ctrl']] },
  { key: 'combat', label: 'Combat', options: [['', 'any'], ['combat', 'in combat'], ['nocombat', 'out of combat']] },
  { key: 'pet', label: 'Demon', options: [['', 'any'], ['pet', 'any out (pet)'], ['nopet', 'none out (nopet)'], ['pet:Imp', 'Imp'], ['pet:Voidwalker', 'Voidwalker'],
    ['pet:Succubus', 'Succubus'], ['pet:Incubus', 'Incubus'], ['pet:Felhunter', 'Felhunter']] },
  { key: 'chan', label: 'Channeling', options: [['', 'any'], ['nochanneling', 'not channeling'], ['channeling', 'channeling']] },
  { key: 'group', label: 'Group', options: [['', 'any'], ['group', 'in a group'], ['group:raid', 'in a raid'], ['nogroup', 'solo (nogroup)']] },
];

/** builder starting points: name → clauses, each [spell, condition sets] */
export type Preset = { name: string; command: string; tooltip: boolean; clauses: { spell: string; sets: Record<string, string>[] }[] };
export const PRESETS: Preset[] = [
  { name: 'Mouseover, else target', command: '/cast', tooltip: true,
    clauses: [{ spell: 'Corruption', sets: [{ unit: '@mouseover', react: 'harm', dead: 'nodead' }, {}] }] },
  { name: 'Friendly mouseover, else self', command: '/cast', tooltip: true,
    clauses: [{ spell: 'Unending Breath', sets: [{ unit: '@mouseover', react: 'help', dead: 'nodead' }, { unit: '@target', react: 'help', dead: 'nodead' }, { unit: '@player' }] }] },
  { name: 'Modifier wheel', command: '/cast', tooltip: true,
    clauses: [{ spell: 'Bane of Doom', sets: [{ mod: 'mod:shift' }] }, { spell: 'Bane of Havoc', sets: [{ mod: 'mod:ctrl' }] }, { spell: 'Bane of Agony', sets: [{}] }] },
  { name: 'Demon-aware', command: '/cast', tooltip: true,
    clauses: [{ spell: 'Spell Lock', sets: [{ pet: 'pet:Felhunter', unit: '@focus', react: 'harm', dead: 'nodead' }, { pet: 'pet:Felhunter' }] },
      { spell: 'Seduction', sets: [{ pet: 'pet:Succubus' }] }, { spell: 'Sacrifice', sets: [{ pet: 'pet:Voidwalker' }] }] },
  { name: 'Ground spell at cursor', command: '/cast', tooltip: true,
    clauses: [{ spell: 'Rain of Fire', sets: [{ unit: '@cursor' }] }] },
];
