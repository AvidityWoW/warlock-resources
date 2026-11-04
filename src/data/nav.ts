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
];
