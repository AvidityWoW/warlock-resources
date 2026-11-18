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
      { title: 'Warlock spells', href: 'spells/', blurb: 'Every spell and rank you learn, by level, and whether a trainer, talent, quest or book teaches it' },
      { title: 'Demon spells', href: 'demons/', blurb: 'The spells each demon casts, rank by rank, and what the grimoires cost' },
      { title: 'Talents', href: 'talents/', blurb: 'A talent calculator for Forever\'s three trees, with a link to share your build' },
      { title: 'Coefficients', href: 'coefficients/', blurb: 'How much spell power each damage spell gets, and its damage at 60' },
      { title: 'Macros', href: 'macros/', blurb: 'Copy-ready macros for casting, crowd control, demons and stones' },
    ],
  },
  {
    // out in the world: where to go and what to do there
    group: 'World',
    pages: [
      { title: 'Quests', href: 'quests/', blurb: 'The demon quests, both mounts and the warlock-only gear, step by step' },
      { title: 'Zones', href: 'zones/', blurb: 'Every zone, dungeon and raid by level, for any class' },
    ],
  },
  {
    // what to wear and what to carry
    group: 'Items',
    pages: [
      { title: 'Wands', href: 'wands/', blurb: 'Wands by level, with an upgrade path you can tweak' },
      { title: 'Rings', href: 'rings/', blurb: 'Rings with spell damage, hit or crit, by level' },
      { title: 'Consumes', href: 'consumes/', blurb: 'Flasks, elixirs, potions, oils and food for a caster, and what they\'re made from' },
      // Not released yet. To bring them back, rename src/pages/_one-hand.astro and _staves.astro (Astro skips pages
      // starting with _) and uncomment these:
      // { title: 'One-hand', href: 'one-hand/', blurb: 'Daggers, swords and off-hands, with their spell power' },
      // { title: 'Staves', href: 'staves/', blurb: 'Staves, with their spell power' },
    ],
  },
  {
    // how things work, and things to look up
    group: 'Info',
    pages: [
      // wrack/batched/ (the same page with the 10 ms batch options) stays unlisted, reachable only by its link
      { title: 'Wrack', href: 'wrack/', blurb: 'How Wrack gives your DoTs extra ticks, on a timeline, with its damage' },
      { title: 'Hit cap', href: 'hit-cap/', blurb: 'Your chance to hit by target level, and how much spell hit you need' },
      { title: 'Glossary', href: 'glossary/', blurb: 'Acronyms and terms, A to Z, with Forever\'s spell names' },
    ],
  },
];
