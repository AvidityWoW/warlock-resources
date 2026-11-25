// The Coefficients page's Utility spells table: Life Tap, Health Funnel, Shadow Ward and Drain Mana at any level and Spirit,
// rank by rank, with Classic under each when asked. Built like the full detail (coefficient-detail.ts), with the same rank
// picker; the page renders it at level 60 with no Spirit, and the browser redraws it when a control changes.
import { utilityRanks, type URank, type UtilitySpell } from '../data/utility-ranks';
import { CAP, f, secs, esc, name, chips, rankAt } from './coefficient-detail';

export const SPI_MAX = 500;

/** the columns after Spell and Rank, in table order */
export const UGROUPS = [
  { label: 'Spell', cols: [] },
  { label: 'Result', cols: [['perTick', 'Per tick'], ['amount', 'Amount']] },
  { label: 'Formula', cols: [['base', 'Base'], ['perLevel', '/lvl'], ['spirit', 'Spirit']] },
  { label: 'Cast', cols: [['cost', 'Cost'], ['cast', 'Cast'], ['ticks', 'Ticks'], ['duration', 'Duration']] },
] as const;
type Key = (typeof UGROUPS)[number]['cols'][number][0];
const ORDER = UGROUPS.flatMap((g) => g.cols.map((c) => c[0])) as Key[];
const STARTS = new Set<Key>(UGROUPS.slice(1).flatMap((g) => g.cols.slice(0, 1).map((c) => c[0])));
const CLS: Partial<Record<Key, string>> = { perTick: 'num sc', amount: 'num dm', spirit: 'num tot', cost: '', cast: '', ticks: 'num', duration: 'num' };
export const ucls = (k: Key) => `${CLS[k] ?? 'num'}${STARTS.has(k) ? ' g' : ''}`.trim();
const COLS = ORDER.length + 2;

/** what the amount is, under the spell's name */
const KIND: Record<UtilitySpell['kind'], string> = {
  convert: 'Health into mana', heal: 'Health to your demon', absorb: 'Shadow damage absorbed', drain: 'Mana drained to you',
};

/** one rank at a level and Spirit */
export function ucells(r: URank, level: number, spirit: number): Record<Key, string> & { id: string } {
  const n = r.per ? Math.max(0, Math.min(level, r.ml || CAP, CAP) - (r.bl ?? r.learn)) : 0;
  const value = r.base + (r.per ?? 0) * n + (r.spi ?? 0) * spirit;
  const cost = r.cost || r.costPerSec
    ? [r.cost ? `${r.cost} ${r.costType}` : '', r.costPerSec ? `${r.costPerSec}/s` : ''].filter(Boolean).join(' + ')
    : '';
  return {
    id: String(r.id),
    perTick: r.ticks ? f(value, 1) : '',
    amount: f(value * (r.ticks || 1), 1),
    base: f(r.base, 2), perLevel: r.per ? `+${f(r.per, 2)}` : '', spirit: r.spi ? f(r.spi, 2) : '',
    cost: cost || '—',
    cast: r.channel ? 'channel' : r.cast ? secs(r.cast) : 'instant',
    ticks: r.ticks ? `${r.ticks} × ${secs(r.period)}` : '',
    duration: r.dur ? secs(r.dur) : '',
  };
}

const tds = (c: Partial<Record<Key, string>>, mark?: (k: Key) => boolean) =>
  // a changed cell that is empty here (Classic's Life Tap has no Spirit term) shows 0, so the highlight has something to mark
  ORDER.map((k) => `<td class="${ucls(k)}${mark?.(k) ? ' chg' : ''}">${esc(c[k] || (mark?.(k) ? '0' : ''))}</td>`).join('');

export interface UView { level: number; spirit: number; classic: boolean; pins: Record<string, number> }

/** the table body, and how many Classic rows differ from Forever's */
export function utilityBody(v: UView) {
  let html = '', changed = 0;
  for (const s of utilityRanks) {
    const shown = v.pins[s.key] ?? rankAt(s.forever, v.level);
    const learned = shown < 0 ? s.forever[0].learn : s.forever[shown].learn;
    const rest = `<td class="rks"><span class="lv">${learned}</span>${chips(s, shown, v.level, v.pins[s.key] !== undefined)}</td>`;
    if (shown < 0) {
      html += `<tr class="shadow none">${name(esc(s.name), KIND[s.kind])}${rest}<td class="muted g" colspan="${COLS - 2}">not learned yet (rank 1 at ${s.forever[0].learn})</td></tr>`;
      continue;
    }
    const r = s.forever[shown], c = ucells(r, v.level, v.spirit);
    html += `<tr class="shadow">${name(esc(s.name), `${KIND[s.kind]} · ${c.id}${r.book ? ' · book' : ''}`)}${rest}${tds(c)}</tr>`;
    if (!v.classic) continue;
    // the same rank when Classic has it, else Classic's own highest at this level
    const pinned = v.pins[s.key] !== undefined ? s.classic?.findIndex((x) => x.id === r.id) ?? -1 : -1;
    const j = s.classic ? (pinned >= 0 ? pinned : rankAt(s.classic, v.level)) : -1;
    if (!s.classic || j < 0) {
      html += `<tr class="shadow cmp"><th scope="row">↳ Classic</th><td class="muted" colspan="${COLS - 1}">${s.classic ? 'not learned yet' : 'not in Classic'}</td></tr>`;
      continue;
    }
    const k = ucells(s.classic[j], v.level, v.spirit);
    const differs = (key: Key) => k[key] !== c[key];
    if (ORDER.some(differs)) changed++;
    html += `<tr class="shadow cmp">${name('↳ Classic', k.id)}<td class="rks muted"><span class="lv">${s.classic[j].learn}</span>rank ${j + 1}</td>${tds(k, differs)}</tr>`;
  }
  const note = v.classic ? (changed ? `${changed} spells differ in Classic (changes highlighted)` : 'no differences') : '';
  return { html, note };
}

export const rankCount = (key: string) => utilityRanks.find((s) => s.key === key)!.forever.length;
