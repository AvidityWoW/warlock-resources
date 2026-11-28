// The warlock's own quests: the ones that teach a spell or give warlock gear, in level order.
// Where it comes from:
// - Chains, quest ids, who gives and takes each quest, and the lowest level: Classic server data (cmangos classic-db,
//   quest_template rows with RequiredClasses = warlock, and their creature_questrelation / involvedrelation rows).
// - Checked against Forever on Wowhead (2026-11-15): every quest here exists there under the same name; what each step asks
//   for is Forever's own objective text (nether.wowhead.com/forever/tooltip/quest/<id>); the spell each chain teaches is
//   on its last quest's Forever page ("You will learn"); and the NPCs stand where Forever's NPC tooltips put them.
// - Items: each quest's required items and counts are Classic's (quest_template.ReqItemId), and every one matches the
//   "Requirements" list of the quest's Forever tooltip; all 87 item names match Forever's item tooltips. Vendor prices are
//   the Forever client's (ItemSparse.BuyPrice), which are the same as Classic's.
// - Not checked: the lowest level for each chain. Wowhead's Forever pages don't show it, so these are Classic's.
// Left out: the level-60 armour sets every class has (Deathmist, Zul'Gurub, Ahn'Qiraj, Naxxramas), which aren't warlock chains.
import type { Side } from './zones';
export type { Side };

export interface Step {
  id: number; name: string;
  /** what to do, with who and where. Links are written [Name](item:123), also spell:, quest: and npc: (see lib/rich.ts) */
  what: string;
  /** a pointer to the next quest: skip it by going straight there */
  lead?: true;
  /** a heading above this step, where a long chain falls into parts */
  part?: string;
  /** more to know, as a list under the step */
  more?: string[];
  /** what to buy or gather for this step: a tick list shown beside it */
  buy?: Buy[];
  /** a choice of quests at this step, drawn side by side in their spell school's colour */
  fork?: Fork[];
  /** false when the step stands for the fork's quests and isn't a quest of its own (its name isn't linked) */
  link?: false;
}
/** one side of a step's `fork`: its quest, and the school that side leads to */
export interface Fork { id: number; name: string; school: 'Shadow' | 'Fire'; what: string }
export interface Plan { title: string; text: string; buy?: true; at?: string }
/** something to buy or gather for a step: `each` is the vendor's price for one, in copper; `note` says where it's from */
export interface Buy {
  id: number; name: string; qty?: number; each?: number; note?: string;
  /** not needed if a warlock who already owns it helps (the Dreadsteed ritual's implements) */
  shared?: true;
  /** the quantity is our estimate, not what a quest asks for: the cost line names it (none at the moment) */
  guess?: true;
}
export interface Route {
  side: Side;
  /** which of a faction's routes (a city or a starting zone); none when everyone takes the same one */
  label?: string;
  note?: string;
  steps: Step[];
}
export interface Chain {
  /** the anchor on the page; tools/spellbook/gen.py's QUEST table points here */
  key: string;
  title: string;
  /** lowest level to start (Classic's) */
  level: number;
  /** what you get, with links written the same way as a step's `what` */
  reward: string;
  note?: string;
  /** something to know before starting, shown in a callout under the reward */
  heads?: string;
  /** ways to do the chain that change what you buy, lettered A, B, C... in the options box above the steps. A plan with
      `buy` buys the `shared` items (listed under it at their step); the others don't, and say instead (`at`) what happens there. */
  plans?: Plan[];
  routes: Route[];
}

const TRAINER = 'a Warlock trainer in Stormwind, Ironforge, Orgrimmar or the Undercity';

export const CHAINS: Chain[] = [
  { key: 'imp', title: 'Imp', level: 1, reward: '[Summon Imp](spell:688)',
    note: 'This starts from a Warlock trainer in step 1 below.',
    routes: [
      { side: 'A', label: 'Elwynn Forest', steps: [
        { id: 1598, name: 'The Stolen Tome', what: 'Drusilla La Salle at Northshire Abbey wants the [Powers of the Void](item:6785) brought back.' }] },
      { side: 'A', label: 'Dun Morogh', steps: [
        { id: 1599, name: 'Beginnings', what: 'Bring 3 [Feather Charms](item:6753) to Alamar Grimm in Anvilmar.' }] },
      { side: 'H', label: 'Durotar', steps: [
        { id: 1485, name: 'Vile Familiars', what: 'Bring 6 [Vile Familiar Heads](item:6487) to Ruzan in the Valley of Trials.' }] },
      { side: 'H', label: 'Tirisfal Glades', steps: [
        { id: 1470, name: 'Piercing the Veil', what: 'Bring 3 [Rattlecage Skulls](item:6281) to Venya Marthand in Deathknell.' }] },
    ] },

  { key: 'voidwalker', title: 'Voidwalker', level: 10, reward: '[Summon Voidwalker](spell:697)',
    routes: [
      { side: 'A', label: 'Stormwind', steps: [
        { id: 1685, name: 'Gakin\'s Summons', lead: true, what: 'Remen Marcot in Goldshire (or Lago Blackwrench in Ironforge, with [The Slaughtered Lamb](quest:1715)) sends you to Gakin the Darkbinder, at the Slaughtered Lamb in Stormwind\'s Mage Quarter.' },
        { id: 1688, name: 'Surena Caledon', what: 'Get [Surena\'s Choker](item:6810) for Gakin.' },
        { id: 1689, name: 'The Binding', what: 'Use the [Bloodstone Choker](item:6928) to summon a voidwalker, subdue it, and go back to Gakin.' }] },
      { side: 'H', label: 'Orgrimmar', steps: [
        { id: 1506, name: 'Gan\'rul\'s Summons', lead: true, what: 'Ophek in Razor Hill sends you to Gan\'rul Bloodeye in Orgrimmar\'s Cleft of Shadow.' },
        { id: 1501, name: 'Creature of the Void', what: 'Bring the [Tablet of Verga](item:6535) to Gan\'rul.' },
        { id: 1504, name: 'The Binding', what: 'Use the [Glyphs of Summoning](item:7464) to summon a voidwalker, subdue it, and go back to Gan\'rul.' }] },
      { side: 'H', label: 'Undercity', note: '', steps: [
        { id: 1478, name: 'Halgar\'s Summons', lead: true, what: 'Ageron Kargal in Brill sends you to Carendin Halgar in the Undercity\'s Magic Quarter.' },
        { id: 1473, name: 'Creature of the Void', what: 'Bring [Egalin\'s Grimoire](item:6285) to Carendin.' },
        { id: 1471, name: 'The Binding', what: 'Use the [Runes of Summoning](item:6284) to summon a voidwalker, subdue it, and go back to Carendin.' }] },
    ] },

  { key: 'succubus', title: 'Succubus', level: 20, reward: '[Summon Succubus](spell:712), and a [Small Soul Pouch](item:22243)',
    routes: [
      { side: 'A', label: 'Stormwind', steps: [
        { id: 1717, name: 'Gakin\'s Summons', lead: true, what: 'Lago Blackwrench in Ironforge sends you to Gakin the Darkbinder in Stormwind.' },
        { id: 1716, name: 'Devourer of Souls', what: 'Gakin sends you to Takar the Seer in the Barrens.' },
        { id: 1738, name: 'Heartswood', what: 'Fetch the [Heartswood](item:6912) from Ashenvale and take it to Gakin.' },
        { id: 1739, name: 'The Binding', what: 'Use the [Heartswood Core](item:6913) to summon a succubus, subdue it, and go back to Gakin.' }] },
      { side: 'H', label: 'Orgrimmar', steps: [
        { id: 1507, name: 'Devourer of Souls', what: 'Gan\'rul Bloodeye sends you to Cazul, also in the Cleft of Shadow.' },
        { id: 1508, name: 'Blind Cazul', what: 'Speak with Zankaja in Orgrimmar.' },
        { id: 1509, name: 'News of Dogran', what: 'Speak with Gazrog at the Crossroads, then Ken\'zigla at Malaka\'jin in Stonetalon (a [second quest](quest:1510) of the same name).' },
        { id: 1511, name: 'Ken\'zigla\'s Draught', what: 'Take [Ken\'zigla\'s Draught](item:6624) to Grunt Logmar at Camp Taurajo.' },
        { id: 1515, name: 'Dogran\'s Captivity', what: 'Take the draught on to Grunt Dogran, held in the Barrens.' },
        { id: 1512, name: 'Love\'s Gift', what: 'Bring the [Dirt-caked Pendant](item:6625) to Gan\'rul.' },
        { id: 1513, name: 'The Binding', what: 'Use [Dogran\'s Pendant](item:6626) to summon a succubus, subdue it, and go back to Gan\'rul.' }] },
      { side: 'H', label: 'Undercity', steps: [
        { id: 1472, name: 'Devourer of Souls', what: 'Carendin Halgar sends you to Godrick Farsan in the Temple of the Damned.' },
        { id: 1476, name: 'Hearts of the Pure', what: 'Bring [Dalin\'s Heart](item:6312) and [Corma\'s Heart](item:6313), the hearts of Dalin Forgewright and Corma Villard, to Carendin.' },
        { id: 1474, name: 'The Binding', what: 'Use the [Pure Hearts](item:6286) to summon a succubus, subdue it, and go back to Carendin.' }] },
    ] },

  { key: 'incubus', title: 'Incubus', level: 20, reward: '[Summon Incubus](spell:713), and a [Small Soul Pouch](item:22243)',
    note: 'The Incubus is the Succubus\'s counterpart. They have the same spells, each needs their own grimoires to be purchased.',
    routes: [
      { side: 'A', label: 'Stormwind', steps: [
        { id: 65602, name: 'What Is Love?', what: 'Find the [Wooden Figurine](item:190309) in a house among the trees west of Maestra\'s Post in Ashenvale, and bring it to Gakin the Darkbinder in Stormwind\'s Mage Quarter.' },
        { id: 65603, name: 'The Binding', what: 'Use the [Wooden Figurine](item:190186) at the summoning circle in the crypt below the Slaughtered Lamb to summon an incubus, subdue it, and go back to Gakin.' }] },
      { side: 'H', label: 'Orgrimmar', steps: [
        { id: 65601, name: 'Love Hurts', what: 'Speak with Magar in Orgrimmar, east of the Cleft of Shadow.' },
        { id: 65610, name: 'Wish You Were Here', what: 'Search Fallen Sky Lake in Ashenvale, now overrun by bog beasts, for the [Withered Scarf](item:190232), and take it to Gan\'rul Bloodeye in Orgrimmar.' },
        { id: 65604, name: 'The Binding', what: 'Use the [Withered Scarf](item:190187) at the summoning circle in Neeru\'s tent to summon an incubus, subdue it, and go back to Gan\'rul.' }] },
      { side: 'H', label: 'Undercity', steps: [
        { id: 65593, name: 'Hearts of the Lovers', what: 'Bring [Avelina\'s Heart](item:190179) and [Isaac\'s Heart](item:190180) to Carendin Halgar in the Temple of the Damned: Avelina Lilly is at Ambermill in Silverpine Forest, Isaac Pearson in Ratchet.' },
        { id: 65597, name: 'The Binding', what: 'Use the [Lovers\' Hearts](item:190181) at the summoning circle below to summon an incubus, subdue it, and go back to Carendin.' }] },
    ] },

  { key: 'soranruk', title: 'Orb of Soran\'ruk', level: 20, reward: '[Orb of Soran\'ruk](item:6898) (off-hand) or [Staff of Soran\'ruk](item:15109)',
    note: 'The small fragments drop from Twilight Acolytes in Blackfathom Deeps and the large one drops from Shadowfang Darksouls in Shadowfang Keep.',
    routes: [
      { side: 'C', steps: [
        { id: 1740, name: 'The Orb of Soran\'ruk', what: 'Bring 3 [Soran\'ruk Fragments](item:6914) and 1 [Large Soran\'ruk Fragment](item:6915) to Doan Karhan in the Barrens, beside Takar the Seer.' }] },
    ] },

  { key: 'felhunter', title: 'Felhunter', level: 30, reward: '[Summon Felhunter](spell:691), and receive a 16 slot [Box of Souls](item:22244)',
    routes: [
      { side: 'A', steps: [
        { id: 1798, name: 'Seeking Strahad', lead: true, what: 'Gakin the Darkbinder in Stormwind sends you to Strahad Farsan in Ratchet.' },
        { id: 1758, name: 'Tome of the Cabal', what: 'Strahad sends you to Krom Stoutarm in Ironforge.' },
        { id: 1802, name: 'Tome of the Cabal', what: 'Find the [Moldy Tome](item:6931) and the [Tattered Manuscript](item:6997) for Krom.' },
        { id: 1804, name: 'Tome of the Cabal', what: 'Bring the [Reconstructed Tome](item:7006) and 3 [Rods of Channeling](item:6930) to Strahad.' },
        { id: 1795, name: 'The Binding', what: 'Use the [Tome of the Cabal](item:6999) to summon a felhunter, subdue it, and go back to Strahad.' }] },
      { side: 'H', steps: [
        { id: 2996, name: 'Seeking Strahad', lead: true, what: 'Gan\'rul Bloodeye in Orgrimmar (or Carendin Halgar in the Undercity) sends you to Strahad Farsan in Ratchet.' },
        { id: 1801, name: 'Tome of the Cabal', what: 'Strahad sends you to Jorah Annison in the Undercity.' },
        { id: 1803, name: 'Tome of the Cabal', what: 'Find the [Moldy Tome](item:6931) and the [Tattered Manuscript](item:6997) for Jorah.' },
        { id: 1805, name: 'Tome of the Cabal', what: 'Bring the [Reconstructed Tome](item:7006) and 3 [Rods of Channeling](item:6930) to Strahad.' },
        { id: 1795, name: 'The Binding', what: 'Use the [Tome of the Cabal](item:6999) to summon a felhunter, subdue it, and go back to Strahad.' }] },
    ] },

  { key: 'bloodrobe', title: 'Enchanted Gold Bloodrobe', level: 31, reward: '[Enchanted Gold Bloodrobe](item:6900) (chest)',
    routes: [
      { side: 'C', steps: [
        { id: 4737, name: 'In Search of Menara Voidrender', lead: true, what: `From ${TRAINER}: go to Menara Voidrender in the tower above Ratchet.` },
        { id: 1796, name: 'Components for the Enchanted Gold Bloodrobe', what: 'Bring [Robes of Arcana](item:5770) to Menara.' },
        { id: 4781, name: 'Components for the Enchanted Gold Bloodrobe', what: 'Take a [Gold Bar](item:3577) to Xizk Goodstitch in Booty Bay, then go back to Menara.' },
        { id: 4783, name: 'Components for the Enchanted Gold Bloodrobe', what: 'Bring Menara 10 [Vials of Hatefury Blood](item:6989) and a [Lesser Infernal Stone](item:6990).' },
        { id: 4784, name: 'Components for the Enchanted Gold Bloodrobe', what: 'Bring Menara the [Fine Gold Thread](item:12293) (from Xizk), 2 [Smoldering Coals](item:6991) and a [Soul Shard](item:6265).' },
        { id: 4786, name: 'The Completed Robe', what: 'Wait for Menara to finish the robe, then speak to her again.' }] },
    ] },

  { key: 'orahil', title: 'Orb of Orahil', level: 35, reward: 'off-hand or staff, either shadow or fire',
    note: 'The demon quest you complete during step 2 decides the school of items you can choose.',
    routes: [
      { side: 'C', steps: [
        { id: 4965, name: 'Knowledge of the Orb of Orahil', lead: true, what: `From ${TRAINER}: go to Menara Voidrender above Ratchet.` },
        { id: 1799, name: 'Fragments of the Orb of Orahil', what: 'Pick one of Menara\'s acolytes and capture a demon in Desolace for them.\n\nTake the [Infernal Orb](item:7291) to Tabetha in Dustwallow Marsh.',
          fork: [
            { id: 4962, name: 'Shard of a Felhound', school: 'Shadow', what: 'Use the [Felhas Ruby](item:12647) on a felhound and bring its spirit back.' },
            { id: 4963, name: 'Shard of an Infernal', school: 'Fire', what: 'Use the [Infus Emerald](item:12646) on an infernal and bring its spirit back.' }] },
        { id: 4961, name: 'Cleansing of the Orb of Orahil', what: 'Kill the Demon of the Orb, then speak with Tabetha.' },
        { id: 4976, name: 'Returning the Cleansed Orb', what: 'Take the [Cleansed Infernal Orb](item:12642) back to Menara.' },
        { id: 4964, name: 'The Completed Orb', link: false, what: 'Menara binds your demon\'s spirit into the orb, and the quest you get follows it. Wait for her to finish, then speak to her again for an orb or a staff:',
          fork: [
            { id: 4964, name: 'The Completed Orb of Dar\'Orahil', school: 'Shadow', what: '[Orb](item:15108) or [Staff](item:15106) of Dar\'Orahil' },
            { id: 4975, name: 'The Completed Orb of Noh\'Orahil', school: 'Fire', what: '[Orb](item:15107) or [Staff](item:15105) of Noh\'Orahil' }] }] },
    ] },

  { key: 'felsteed', title: 'Felsteed', level: 40, reward: '[Summon Felsteed](spell:5784), your first mount',
    routes: [
      { side: 'C', steps: [
        { id: 4487, name: 'Summon Felsteed', lead: true, what: `From ${TRAINER}: go to Strahad Farsan in Ratchet.` },
        { id: 4490, name: 'Summon Felsteed', what: 'Speak to Strahad Farsan in Ratchet to learn it.' }] },
    ] },

  { key: 'infernal', title: 'Infernal', level: 50, reward: '[Inferno](spell:1122), and gain a [Shard of the Green Flame](item:18762)',
    routes: [
      { side: 'C', steps: [
        { id: 7601, name: 'What Niby Commands', what: 'Niby the Almighty in Felwood sends you to Impsy, beside him.' },
        { id: 7602, name: 'Flawless Fel Essence', what: 'Bring Impsy three Flawless Fel Essences: from the Legashi Satyrs of [Azshara](item:18624), the Jaedenar Legionnaires of [Jaedenar](item:18622), and the Felguard Sentries of the [Blasted Lands](item:18623).' },
        { id: 7603, name: 'Kroshius\' Infernal Core', what: 'Use the [Fel Fire](item:18626) at Kroshius\' remains in Shatter Scar Vale, kill him, and bring [Kroshius\' Infernal Core](item:18625) to Niby.' }] },
    ] },

  { key: 'imps-request', title: 'An Imp\'s Request', level: 50, reward: 'all three: [Soul Harvester](item:20536) (staff), [Abyss Shard](item:20534) (trinket) and [Robes of Servitude](item:20530)',
    note: 'A level-52 chain that sends you into the Sunken Temple.',
    routes: [
      { side: 'C', steps: [
        { id: 8419, name: 'An Imp\'s Request', what: 'A Warlock trainer in a city sends you with a piece of [Felcloth](item:14256) to Impsy in Felwood (Impsy gives the same quest himself as [Hot and Itchy](quest:8420)).' },
        { id: 8421, name: 'The Wrong Stuff', what: 'Bring Impsy 10 [Rotting Wood](item:20613) and 4 [Bloodvenom Essence](item:20614).' },
        { id: 8422, name: 'Trolls of a Feather', what: 'Bring Impsy 6 Voodoo Feathers (2 [Amber](item:20606), 2 [Blue](item:20607), 2 [Green](item:20608)) from the trolls of the Sunken Temple.' }] },
    ] },

  { key: 'doomguard', title: 'Doomguard', level: 60, reward: '[Ritual of Doom](spell:18540), and receive a [Tome of Sacrifice](item:18602)',
    routes: [
      { side: 'C', steps: [
        { id: 7581, name: 'The Prison\'s Bindings', what: 'For Daio the Decrepit in the Tainted Scar (Blasted Lands): 15 [Satyr Blood](item:18603) from the Wildspawn Satyrs in Dire Maul\'s Warpwood Quarter.' },
        { id: 7582, name: 'The Prison\'s Casing', what: 'Also for Daio: 5 [Tears of the Hederine](item:18604) from the demons of Darkwhisper Gorge in Winterspring.' },
        { id: 7583, name: 'Suppression', what: 'Use the [Glowing Crystal Prison](item:18601) on a Doomguard Commander in the Tainted Scar, hold out while it fights back, and take the [Imprisoned Doomguard](item:18605) to Daio.' }] },
    ] },

  { key: 'dreadsteed', title: 'Dreadsteed', level: 60, reward: '[Summon Dreadsteed](spell:23161), your epic mount',
    heads: 'Every quest in this chain is required to learn Summon Dreadsteed.',
    plans: [
      { title: 'Your own ritual', buy: true,
        text: 'You buy the three ritual components from Gorzeeki, fight through Dire Maul to Immol\'thar\'s pedestal and run the ritual with your party.' },
      { title: 'Another Warlock provides components', at: 'The Warlock brings their components and completes the ritual for you.',
        text: 'You don\'t need to purchase the final components as a warlock who already owns [J\'eevee\'s Jar](item:18663), the [Black Lodestone](item:18629) and the [Xorothian Glyphs](item:18670) completes the ritual.' },
      { title: 'Spirit turn-in', at: 'Nothing to buy and no ritual: speak to the [Dreadsteed Spirit](npc:14504).',
        text: 'Join a group where another Warlock has completed the ritual. Once the [Xorothian Dreadsteed](npc:14502) is defeated, its [Dreadsteed Spirit](npc:14504) appears. Simply walk up with the final quest and turn it in.' },
    ],
    routes: [
      { side: 'C', steps: [
        { id: 7562, name: 'Mor\'zul Bloodbringer', lead: true, part: 'Ink',
          what: 'A demon trainer (Stormwind, Ironforge, Orgrimmar or Stonard) sends you to [Mor\'zul Bloodbringer](npc:14436) near the Altar of Storms in the Burning Steppes.' },
        { id: 7563, name: 'Rage of Blood',
          what: 'Bring Mor\'zul 30 bottles of [Raging Beast\'s Blood](item:18590), from the owlbeasts of Winterspring.',
          more: ['It only drops while you are on the quest.'],
          buy: [{ id: 18590, name: 'Raging Beast\'s Blood', qty: 30, note: 'Farm: Winterspring owlbeasts' }] },
        { id: 7564, name: 'Wildeyes',
          what: 'Carry the [Case of Blood](item:18591) to [Gorzeeki Wildeyes](npc:14437), a few steps away.',
          more: ['This opens two lines of quests at once: the stardust (from Gorzeeki) and the ritual tools (from Mor\'zul). Do them in either order.'] },

        { id: 7623, name: 'Lord Banehollow', part: 'Stardust',
          what: 'Buy [Shadowy Potions](item:18802) from Gorzeeki, drink them to walk through Jaedenar in Felwood as one of the Shadow Council, and speak with [Lord Banehollow](npc:9516).',
          more: ['You need three potions. They\'re sold in sets of three for 6 gold, and each lasts 20 minutes.'],
          buy: [{ id: 18802, name: 'Shadowy Potion', qty: 3, each: 20000, note: 'Gorzeeki Wildeyes: 3 for 6g, 20 min each' }] },
        { id: 7624, name: 'Ulathek the Traitor',
          what: 'Confront Ulathek in his quarters in the Shadow Hold, to the west of Banehollow, kill him, and bring [The Traitor\'s Heart](item:18719) to Lord Banehollow.' },
        { id: 7625, name: 'Xorothian Stardust',
          what: 'Buy [Xorothian Stardust](item:18687) from Banehollow\'s servant [Ur\'dan](npc:14522) for 150 gold, and take it to Gorzeeki.',
          buy: [{ id: 18687, name: 'Xorothian Stardust', qty: 1, each: 1500000, note: 'Ur\'dan, Jaedenar' }] },
        { id: 7629, name: 'Imp Delivery',
          what: 'Take the [Imp in a Jar](item:18688) to the alchemy lab in Scholomance, let the imp out, wait while he makes the parchment, and bring the jar back to Gorzeeki.',
          more: ['A dungeon quest: you need a group to reach the Raz Frostwhisper\'s alchemy lab in Scholomance.'] },

        { id: 7626, name: 'Bell of Dethmoora', part: 'Ritual tools',
          what: 'Bring Gorzeeki 10 [Elixirs of Shadow Power](item:9264), made by alchemists.',
          buy: [{ id: 9264, name: 'Elixir of Shadow Power', qty: 10, note: 'Alchemy' }] },
        { id: 7627, name: 'Wheel of the Black March',
          what: 'Bring Gorzeeki 6 [Large Brilliant Shards](item:14344), from enchanters, and 25 [Dark Iron Ore](item:11370), from miners.',
          buy: [{ id: 14344, name: 'Large Brilliant Shard', qty: 6, note: 'Enchanting' }, { id: 11370, name: 'Dark Iron Ore', qty: 25, note: 'Mining' }] },
        { id: 7628, name: 'Doomsday Candle',
          what: 'Bring Gorzeeki 35 [Black Dragonscales](item:15416), from skinners.',
          buy: [{ id: 15416, name: 'Black Dragonscale', qty: 35, note: 'Skinning' }] },
        { id: 7630, name: 'Arcanite',
          what: 'Once the Bell, Wheel and Candle are made, bring Gorzeeki 3 [Arcanite Bars](item:12360) for the lodestone.',
          more: ['Gorzeeki keeps the Bell, the Wheel and the Candle for you: his imp sets them out at the ritual.'],
          buy: [{ id: 12360, name: 'Arcanite Bar', qty: 3, note: 'Alchemy' }] },

        { id: 7631, name: 'Dreadsteed of Xoroth', part: 'Ritual',
          what: 'With the parchment and the tools done, Mor\'zul gives you [Mor\'zul\'s Instructions](item:18818). Summon a Xorothian Dreadsteed in Dire Maul, defeat it, and bind its spirit.',
          more: [
            'You don\'t have to run it yourself, see options A, B and C on the side.',
            'To run it yourself (plan A), buy the three implements from Gorzeeki first: [J\'eevee\'s Jar](item:18663) (150 gold), a [Black Lodestone](item:18629) (50 gold) and [Xorothian Glyphs](item:18670) (50 gold).',
            'With a group, fight your way to the pedestal of Immol\'thar\'s prison, deep in Dire Maul West, and let J\'eevee out of his jar. He places the Bell, the Wheel and the Candle, and a circle appears.',
            'Tip: bring a bag full of [Soul Shards](item:6265) for the restarts.',
            'Keep the three running while demons come. When one fails, use the Black Lodestone on it at once; each restart burns a Soul Shard. If all three are out together, the ritual fails and you start it again.',
            'While they run, the Bell gives Warlocks in the circle vigor and energy, the Wheel protects everyone in it, and the Candle burns enemies that step in.',
            'Runes appear around the edge of the circle. At nine it is complete: use the Xorothian Glyphs to open the portal to Xoroth and pull the dreadsteed through.',
            'Defeat the [Xorothian Dreadsteed](npc:14502), a level-62 elite. Its [Dreadsteed Spirit](npc:14504) then appears: speak to it to complete the quest and learn Summon Dreadsteed.'],
          buy: [
            { id: 18663, name: 'J\'eevee\'s Jar', qty: 1, each: 1500000, note: 'Gorzeeki Wildeyes', shared: true },
            { id: 18629, name: 'Black Lodestone', qty: 1, each: 500000, note: 'Gorzeeki Wildeyes', shared: true },
            { id: 18670, name: 'Xorothian Glyphs', qty: 1, each: 500000, note: 'Gorzeeki Wildeyes', shared: true },
            ] }] },
    ] },
];
