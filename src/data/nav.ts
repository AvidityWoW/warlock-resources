// Every page on the site, grouped by category. The header's tabs (one per group, each opening its pages) and the home
// page list both come from here,
// so adding a page means adding one entry.
/** href is relative to the site base, with a trailing slash (e.g. 'wands/') */
export interface NavPage { title: string; href: string; blurb: string }
export interface NavGroup { group: string; pages: NavPage[] }

export const nav: NavGroup[] = [
  {
    // your class: what you and your demons learn, your talents, how hard it hits, and how to cast it
    group: 'Class',
    pages: [
      { title: 'Warlock spells', href: 'spells/', blurb: 'Class spells, ranks and where they\'re learned.' },
      { title: 'Demon spells', href: 'demons/', blurb: 'Grimoires for pets and the levels required.' },
      { title: 'Talents', href: 'talents/', blurb: 'Talent calculator with a shareable link and order list.' },
      { title: 'Coefficients', href: 'coefficients/', blurb: 'An interactable table with spell data at all levels including a summary view for max ranks at level 60.' },
      { title: 'Macros', href: 'macros/', blurb: 'Copy-ready macros for various Warlock needs and a builder to learn the basics of macro creation.' },
    ],
  },
  {
    // out in the world: where to go and what to do there
    group: 'World',
    pages: [
      { title: 'Quests', href: 'quests/', blurb: 'Warlock class quests and the steps required to complete them.' },
      { title: 'Zones', href: 'zones/', blurb: 'Open world zones and dungeons organized by level.' },
    ],
  },
  {
    // what to wear and what to carry
    group: 'Items',
    pages: [
      { title: 'Wands', href: 'wands/', blurb: 'An interactive wand path, to organize a route while leveling.' },
      { title: 'Rings', href: 'rings/', blurb: 'An interactive ring path, to organize a route while leveling.' },
      { title: 'Consumes', href: 'consumes/', blurb: 'Flasks, elixirs, potions, oils and food for a caster including how to obtain them.' },
      // Not released yet. To bring them back, rename src/pages/_one-hand.astro and _staves.astro (Astro skips pages
      // starting with _) and uncomment these:
      // { title: 'One-hand', href: 'one-hand/', blurb: 'Daggers, swords and off-hands, with their spell power.' },
      // { title: 'Staves', href: 'staves/', blurb: 'Staves, with their spell power.' },
    ],
  },
  {
    // how things work, and things to look up
    group: 'Info',
    pages: [
      // wrack/batched/ (the same page with the 10 ms batch options) stays unlisted, reachable only by its link
      { title: 'Wrack', href: 'wrack/', blurb: 'A tool to demonstrate how Wrack interacts with active dots and their shadow ticks.' },
      { title: 'Hit cap', href: 'hit-cap/', blurb: 'Simple hit cap calculator to explain how spell hit works in Forever.' },
      { title: 'Glossary', href: 'glossary/', blurb: 'Acronyms and terms, A to Z, with spell names.' },
    ],
  },
];
