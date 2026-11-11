# The Grimoire

Guides and reference tables for warlocks in WoW Forever, built with [Astro](https://astro.build) and published to
https://aviditywow.github.io/warlock-resources/.

## Working on it

```sh
npm install
npm run dev       # http://localhost:4321/warlock-resources/
npm run build     # static site in dist/
npm run check     # Astro's type and template checks (should report 0 errors, 0 warnings, 0 hints)
npm run backdrop  # regenerate the fel-fire backdrop images (tools/backdrop.mjs)
```

Pushing to `main` builds and deploys through `.github/workflows/deploy.yml`.

## Layout

- `src/data/nav.ts`: every page, by category. The header links and the home page come from here.
- `src/data/site.ts`: the site name, tagline, and `GAME` ("WoW Forever", shown as a note in the header).
- `src/layouts/Layout.astro`, `src/components/Header.astro`: the page shell, header and light/dark toggle.
  Astro's `ClientRouter` swaps pages without a full reload, and the header persists between them.
- `src/styles/global.css`: colour tokens (purple Monokai dark, plus light), base styles, and the parts every page shares:
  `.master` + `.master-b` (a section holding other cards, with a heading band), `.pill` (Copy, chips), `.labels` (a button's two labels, Copy/Copied), `.search`, `.badge`,
  `.link`, `.empty` (nothing matches), and `.card` + `.card-h` (a table or list in a card, with a heading band; `.dtable` for its table). Use these
  rather than restyling them; a page's own file (one per page beside it) only holds what is particular to that page.
- Coefficients page: `src/data/coefficients.ts` holds the numbers (copied from spelldb's `warlock-coefficients.html`),
  and `src/scripts/coefficients.ts` draws the summary as a PNG for Copy image / Save image. The full detail is built from
  every rank in `src/data/coefficient-ranks.ts` (generated from spelldb, Forever with hotfixes and Classic 1.15.9) by
  `src/scripts/coefficient-detail.ts`, at level 60 on the server and again in the browser for the level slider, rank
  chips and Classic comparison.
- Gear pages (`wands`, `one-hand`, `staves`) share their parts. One-hand and Staves are not released yet: their pages are
  `src/pages/_one-hand.astro` and `_staves.astro` (Astro skips files starting with `_`) and their nav entries are commented out.
  Rename them and uncomment the entries to publish them.
  - `src/data/wands.json` (typed in `wands.ts`): the wand data, ranked by DPS.
  - `src/data/weapons.json` (typed in `weapons.ts`): one-hand weapons, off-hands and staves, in level then item-level order.
    Rows show spell damage (SP, ShP, FP) up front, and the suggested path follows item level. Built by `tools/weapons/gen.py`
    (usage in its docstring) from the spelldb client tables and the cmangos dump. Spell damage is taken from Wowhead's Forever
    tooltips (cached in `tools/weapons/wowhead-cache/`, not committed), because server hotfixes add spell power the client lacks.
    Stats are from the Forever client and sources from classic server data (cmangos classic-db), so items new to Forever
    mostly have none. Only items with spell damage (SP, ShP or FP) are listed. Without a Wowhead tooltip, spell damage falls back to the client: stat 45/42, and the unnamed stats 88 (Shadow) and 85 (Fire).
  - `src/components/GearControls.astro` (legend, Share path, sticky toolbar) and `LevelBands.astro` (level bands; with
    `group`, a page section with its own upgrade path, like Main hand and Off-hand).
  - `src/components/WandItem.astro`, `GearItem.astro`: one row each. Rows reflow with container queries: stacked, two-line, or one line.
  - `src/scripts/gear.ts`: the controls (faction, sources, search, your path, Deselect all, Reset, Share path). Choices are
    kept in `localStorage` per page (`wands:*`, `one-hand:*`, `staves:*`); a shared link is
    `<page>/?path=<base-36 ids joined by .>&f=<a|h>`.
- Macros page: the macros are in `src/data/macros.ts`; `src/lib/macro.ts` colours them and swaps `{item:Healthstone}` /
  `{create:Healthstone}` for the stone rank of the level picked on the page (saved as `macros:level`); `src/scripts/macros.ts`
  handles search, the level and Copy.
- Glossary page: the terms are in `src/data/glossary.ts` (each with a topic, full name, and aliases shown in brackets under the term). In a definition,
  `[[Term]]` links to another entry by its term or an alias, `[[/macros/|Macros page]]` links to a page, and backticks
  make code. `src/lib/glossary.ts` sorts and renders them, and the build fails on a link to no entry (or to an alias two
  entries share). `src/scripts/glossary.ts` handles search and the topic buttons.
- Hit cap page: the maths is in `src/lib/hit.ts` (Classic servers' level table, capped at 100% because Forever has no
  always-miss 1%, and Suppression at 1% a point, up
  to 5); `src/scripts/hit-cap.ts` redraws the result and keeps the form in `localStorage` (`hitcap:v2`).
- `src/assets/backdrop/`: the fel fire and smoke behind the page, drawn by `tools/backdrop.mjs` from SVG noise filters.
  Strength is `--fel` / `--smoke` in `global.css`; `Layout.astro` keeps the animation smooth across page changes.

## URLs

Pages live at clean folder URLs: `/warlock-resources/` (home) and `/warlock-resources/wands/`.
`/home` redirects to the home page (`redirects` in `astro.config.mjs`), and the old `wands.html`
link redirects to `/wands/` (`public/wands.html`).

## Adding a page

1. Add `src/pages/<name>.astro`, wrapped in `<Layout title="…">`. It is served at `/warlock-resources/<name>/`.
2. Add it to `src/data/nav.ts` with `href: '<name>/'`. The header marks the current page by itself.
