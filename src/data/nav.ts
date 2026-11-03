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
    ],
  },
];
