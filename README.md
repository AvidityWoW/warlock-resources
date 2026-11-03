# The Grimoire

Guides and reference tables for warlocks in WoW Forever, built with [Astro](https://astro.build) and published to
https://aviditywow.github.io/warlock-resources/.

## Working on it

```sh
npm install
npm run dev       # http://localhost:4321/warlock-resources/
npm run build     # static site in dist/
npm run check     # Astro's type and template checks (should report 0 errors, 0 warnings, 0 hints)
```

Pushing to `main` builds and deploys through `.github/workflows/deploy.yml`.

## Layout

- `src/data/nav.ts`: every page, by category. The header links and the home page come from here.
- `src/layouts/Layout.astro`, `src/components/Header.astro`: the page shell, header and light/dark toggle.
  Astro's `ClientRouter` swaps pages without a full reload, and the header persists between them.
- `src/styles/global.css`: colour tokens (purple Monokai dark, plus light) and base styles. One file per page beside it.
- `src/data/wands.json` (typed in `wands.ts`): the wand data. Replace it to update the wand guide for a new build.
- `src/components/WandItem.astro`: one wand row. Rows reflow with container queries: stacked, two-line, or one line.

## URLs

Pages live at clean folder URLs: `/warlock-resources/` (home) and `/warlock-resources/wands/`.
`/home` redirects to the home page (`redirects` in `astro.config.mjs`), and the old `wands.html`
link redirects to `/wands/` (`public/wands.html`).

## Adding a page

1. Add `src/pages/<name>.astro`, wrapped in `<Layout title="…">`. It is served at `/warlock-resources/<name>/`.
2. Add it to `src/data/nav.ts` with `href: '<name>/'`. The header marks the current page by itself.
