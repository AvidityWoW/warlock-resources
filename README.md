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

- `src/data/nav.ts`: every page, by category. The header links and the home page come from here. The header has one tab
  per group, which opens a list of that group's pages.
- `src/data/site.ts`: the site name, tagline, and `GAME` ("WoW Forever", shown as a note in the header).
- `src/layouts/Layout.astro`, `src/components/Header.astro`: the page shell, header and light/dark toggle.
  Astro's `ClientRouter` swaps pages without a full reload, and the header persists between them.
- `src/styles/global.css`: colour tokens (purple Monokai dark, plus light), base styles, and the parts every page shares:
  `.master` + `.master-b` (a section holding other cards, with a heading band), `.pill` (Copy, chips), `.labels` (a button's two labels, Copy/Copied), `.search`, `.badge`,
  `.link`, `.empty` (nothing matches), and `.card` + `.card-h` (a table or list in a card, with a heading band; `.dtable` for its table). Use these
  rather than restyling them; a page's own file (one per page beside it) only holds what is particular to that page.
- Frozen card titles: in a card that opens with a data table, its title band (and controls marked `data-stick`) stays in
  view with the table's heading row while you scroll through the card, stacked under the site header, a page's sticky bar and outer cards' titles; `src/scripts/stick.ts` works out
  where each stops. Cards use `overflow: clip`, not `hidden`, so they don't stop `position: sticky`. On phones
  (under 640 px wide or 500 px tall) only table headings stick, at the top of the screen.
- Wrack page: `src/lib/wrack.ts` works out where each DoT tick lands while Wrack channels (ticks twice as often for
  6 s, duration unchanged), draws the timeline SVG and the table, and `src/scripts/wrack.ts` redraws them from the start, level, spell
  power and haste controls. Haste (0-15%) only shortens the GCD (1.5 s / (1 + haste)); channels and DoTs
  don't change. `src/components/WrackPage.astro` is the page; `/wrack/batched/`
  adds 10 ms batch switches: Start, End and Between (a DoT tick in a channel's first or last 10 ms,
  or within 5 ms of a back-to-back recast, isn't sped up); it's left out of the nav and marked noindex. Damage comes from the Coefficients rank data.
- Zones page (any class, under World): the zones, dungeons and raids are in `src/data/zones.ts`, with where each
  range comes from (Classic's suggested ranges; the client for Forever's new zones). Each table row's bar is coloured
  by difficulty at your level, as the game colours a monster's level (`conVars`). `src/scripts/zones.ts` drives the
  level, faction and "Only my level" controls (saved as `zones:v1`).
- Level bar: Spells, Demon spells, Class quests and Consumes share `src/components/LevelBar.astro` (your level as a slider and a number
  box, plus a slot for a `.seg` of buttons and `.check` tick boxes) and `src/lib/levelbar.ts`, which runs it and keeps the
  choices: your level once for all of them (`level:v1`), the rest per page (`spells:v1`, `demons:v1`, `quests:v1`, `consumes:v1`). Its styles
  (`.lvbar`, `.seg`, `.check`) are in `global.css`; Zones uses them too, with its own script.
- Spells page (`spells/`) and Demon spells page (`demons/`): `src/data/spellbook.json` (every trained spell and rank by level, and
  how it's learned) and `src/data/demons.json` (the demons' ability ranks with their grimoires and prices), typed in
  `spellbook.ts`. Both are written by `python3 tools/spellbook/gen.py ~/spelldb` from the Forever client tables; it also
  reads Wowhead's Forever spell tooltips (cached in `tools/spellbook/wowhead-cache/`, not committed) to mark talents and to
  check every level, and stops on a mismatch. The few things the client can't say are tables at the top of the script: which
  spells a quest teaches, which a book teaches. The Demon spells page's wording (what each demon and spell does) is in
  `src/data/demons.ts`. It groups each demon's ranks under one heading row per spell (`src/styles/demons.css`); Spells uses
  `src/styles/spells.css`. In both, rows you can have are plain, the next level's are lit, later ones dimmed.
- Talents page (`talents/`): `src/data/talents.json` (typed in `talents.ts`) is Forever's warlock tree from the client's
  Trait tables (not its Classic `Talent` table, which lacks Wrack and the rest), written by
  `python3 tools/talents/gen.py ~/spelldb`, which also fetches the icons into `public/talents/`. The rules (row gates,
  arrows, what can be unlearned) and the build code in the URL hash (a digit per talent, trees split by `-`) are in
  `src/lib/talents.ts`; `src/scripts/talents.ts` runs the page and keeps the build as `talents:v1`.
- Class quests page (`quests/`, "Quests" in the nav): the chains are hand-written in `src/data/quests.ts`, whose header says
  where each part comes from (Classic server data for the chains and levels, Wowhead's Forever pages for the checks). A chain's
  `key` is its anchor; the Spells and Demons pages link to `quests/#<key>`. In a step or a reward, `[Name](item:123)`
  (also `spell:`, `quest:`, `npc:`) becomes a Wowhead link (`src/lib/rich.ts`). A step can carry a `part` heading and `more`
  notes, and a `buy` list: what to buy or gather for that step, shown to its right as tick boxes (kept as `quests:shop:v2`),
  with a count above the steps. A chain's `plans` (lettered A, B, C) are the ways to do it that change what you buy, each
  with its vendor total; `shared` items are only bought by a plan with `buy`, and the other plans say instead (`at`) what
  happens at that step. Only the Dreadsteed has them so far. A step's `fork` lists quests you pick between at that step,
  drawn side by side in their spell school's colour (the Orb of Orahil: felhound for Shadow, infernal for Fire). The demon chains listed in `FIND` (in `quests.astro`) get a
  "Partway through?" `/run` line under each route, built from its quest ids: it prints the step after the last one the
  game has marked complete. The build fails if one would pass chat's 255-character limit.
- Coefficients page: `src/data/coefficients.ts` holds the numbers (copied from spelldb's `warlock-coefficients.html`),
  and `src/scripts/coefficients.ts` draws the summary as a PNG for Copy image / Save image. The full detail is built from
  every rank in `src/data/coefficient-ranks.ts` (generated from spelldb, Forever with hotfixes and Classic 1.15.9; mana is each rank's `SpellPower.ManaCost`) by
  `src/scripts/coefficient-detail.ts`, at level 60 on the server and again in the browser for the level slider, rank
  chips and Classic comparison.
- Gear pages (`wands`, `rings`, `one-hand`, `staves`) share their parts. One-hand and Staves are not released yet: their pages are
  `src/pages/_one-hand.astro` and `_staves.astro` (Astro skips files starting with `_`) and their nav entries are commented out.
  Rename them and uncomment the entries to publish them.
  - `src/data/wands.json` (typed in `wands.ts`): the wand data, ranked by DPS. `python3 tools/wands/pull.py ~/spelldb` adds
    wands that have since appeared on Wowhead's Forever site: it asks Wowhead for each wand ID in the client that the file
    lacks (item XML, cached in `tools/wands/wowhead-cache/`, not committed), skips test items and wands a warlock can't
    use, and moves a `noSource` wand up once Wowhead gives it a source.
  - `src/data/weapons.json` (typed in `weapons.ts`): one-hand weapons, off-hands, staves and rings, in level then item-level order.
    Rows show spell damage (SP, ShP, FP) up front, and the suggested path follows item level (for rings, spell damage: `score`). Rings are also listed for hit or crit alone,
    which get their own columns (as percentages) and don't count towards the path. Built by `tools/weapons/gen.py`
    (usage in its docstring) from the spelldb client tables and the cmangos dump. Spell damage is taken from Wowhead's Forever
    tooltips (cached in `tools/weapons/wowhead-cache/`, not committed), because server hotfixes add spell power the client lacks.
    Stats are from the Forever client and sources from classic server data (cmangos classic-db); an item with none there
    (most of those new to Forever) gets the source on its Wowhead Forever page (item XML, same cache). Pass absolute paths. A quest reward with no
    level requirement is filed under the lowest level its quest can be picked up at: from the cmangos dump for Classic quests,
    and for Forever's own from `tools/weapons/quest-levels.json`, which the script fills from a copy of the game's
    `Cache/WDB/enUS/questcache.wdb` when given one (it only holds quests your client has been shown). A quest in neither
    gets an estimate, item level minus 5. Only items with spell damage (SP, ShP or FP) are listed. Without a Wowhead tooltip, spell damage falls back to the client: stat 45/42, and the unnamed stats 88 (Shadow) and 85 (Fire).
  - `src/components/GearControls.astro` (legend, Share path, sticky toolbar) and `LevelBands.astro` (level bands; with
    `group`, a page section with its own upgrade path, like Main hand and Off-hand).
  - `src/components/WandItem.astro`, `GearItem.astro`: one row each. Rows reflow with container queries: stacked, two-line, or one line.
  - `src/scripts/gear.ts`: the controls (faction, sources, search, your path, Best at each level, Deselect all, Reset,
    Share path). "Best at each level" swaps the suggestions (each item that beats all before it) for the best item of
    every required level, upgrade or not. Choices are
    kept in `localStorage` per page (`wands:*`, `rings:*`, `one-hand:*`, `staves:*`); a shared link is
    `<page>/?path=<base-36 ids joined by .>&f=<a|h>`.
- Consumes page (`consumes/`, under Items): `src/data/consumes.json` (typed in `consumes.ts`, which also names the page's
  sections) is written by `python3 tools/consumes/gen.py ~/spelldb`. It sorts every consumable in the client into a
  section by its use text (the rules are `group_of` in the script) and names the buff each gives (`line_of`: Fortitude,
  Defense, Spell damage), which the page uses to put like buffs together under a heading row; `paint` in `consumes.ts` colours the amounts in
  each tooltip by stat, then asks Wowhead's Forever item XML (cached in
  `tools/consumes/wowhead-cache/`, not committed) for the source and a crafted one's materials. An item with no source
  on Wowhead is left out. Mana and health items are split by shared cooldown, read from the client's spell categories:
  potions (with the burst potions), and healthstones, runes and Felwood's plants, which have their own. `src/scripts/consumes.ts` dims or hides what's above your level.
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
