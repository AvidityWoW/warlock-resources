// Every page on the site, grouped by category. The app bar tabs and the home page list both come from here,
// so adding a page means adding one entry.
/** href is relative to the site base, with a trailing slash (e.g. 'wands/') */
export interface NavPage { title: string; href: string; blurb: string }
export interface NavGroup { group: string; pages: NavPage[] }

export const nav: NavGroup[] = [
  {
    group: 'Gear',
    pages: [
      { title: 'Wands', href: 'wands/', blurb: 'Wands by level, with an upgrade path you can tweak' },
      // Not released yet. To bring them back, rename src/pages/_one-hand.astro and _staves.astro (Astro skips pages
      // starting with _) and uncomment these:
      // { title: 'One-hand', href: 'one-hand/', blurb: 'Daggers, swords and off-hands, with their spell power' },
      // { title: 'Staves', href: 'staves/', blurb: 'Staves, with their spell power' },
    ],
  },
  {
    group: 'Play',
    pages: [
      { title: 'Macros', href: 'macros/', blurb: 'Copy-ready macros for casting, crowd control, demons and stones' },
    ],
  },
  {
    group: 'Reference',
    pages: [
      { title: 'Glossary', href: 'glossary/', blurb: 'Acronyms and terms, A to Z, with Forever\'s spell names' },
      { title: 'Coefficients', href: 'coefficients/', blurb: 'How much spell power each damage spell gets, and its damage at 60' },
      // Wrack (wrack/) is left out for now: it's live but only reachable by its link, and its page tells search engines
      // to skip it. To list it, add: { title: 'Wrack', href: 'wrack/', blurb: 'How Wrack gives your DoTs extra ticks, on a timeline, with its damage' },
      { title: 'Hit cap', href: 'hit-cap/', blurb: 'Your chance to hit by target level, and how much spell hit you need' },
    ],
  },
];
