// The Coefficients page's full-detail table at any level and spell power, for Forever and optionally Classic under it. The page
// renders it at level 60 with no spell power on the server, and redraws it in the browser when a slider, a rank chip or the
// Classic toggle changes.
import { ranked, CLASSIC_BUILD, type Rank, type RankedSpell } from '../data/coefficient-ranks';

export const CAP = 60;
export const SP_MAX = 1000;
export { CLASSIC_BUILD };

const f = (x: number, d = 3) => String(+x.toFixed(d));
const secs = (ms?: number) => (ms ? `${f(ms / 1000, 2)} s` : '');
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** the rank shown at a level: the highest one learned by then (ranks are in learn order, so a tie goes to the later rank) */
export function rankAt(ranks: Rank[], level: number) {
  let i = -1;
  ranks.forEach((r, k) => { if (r.learn <= level) i = k; });
  return i;
}

/** the columns after Spell, Part and Rank, in table order: what the spell is, its timing, the formula, then the result */
export const GROUPS = [
  { label: 'Spell', cols: [['id', 'Spell ID'], ['level', 'Learned']] },
  { label: 'Timing', cols: [['cast', 'Cast'], ['duration', 'Duration'], ['period', 'Period'], ['ticks', 'Ticks']] },
  { label: 'Formula', cols: [['base', 'Base'], ['perLevel', '/lvl'], ['variance', 'Var'], ['coeffPerTick', 'Coeff/tick'], ['coeff', 'Coeff']] },
  { label: 'Result', cols: [['perTick', 'Per tick'], ['damage', 'Damage']] },
] as const;
type Key = (typeof GROUPS)[number]['cols'][number][0];
const ORDER = GROUPS.flatMap((g) => g.cols.map((c) => c[0])) as Key[];
/** first column of each group after the first, for the rule between groups */
const STARTS = new Set<Key>(GROUPS.slice(1).map((g) => g.cols[0][0]));
const CLS: Partial<Record<Key, string>> = { id: 'muted', perTick: 'num sc', damage: 'num dm', coeffPerTick: 'num muted', coeff: 'num tot' };
export const cls = (k: Key) => `${CLS[k] ?? 'num'}${STARTS.has(k) ? ' g' : ''}`;
const COLS = ORDER.length + 3;   // spell, part, rank chips and the cells

type Cells = Record<Key, string> & { stages?: (Partial<Record<Key, string>> & { name: string; part: string })[] };

/** one rank at a level and spell power, as the table prints it (the rounding is the one in-game tooltips use, see the notes) */
export function cells(r: Rank, level: number, sp: number, agony = false): Cells {
  const n = r.per ? Math.max(0, Math.min(level, r.ml || CAP, CAP) - (r.bl ?? r.learn)) : 0;
  const add = (r.per ?? 0) * n, bonus = sp * (r.coef ?? 0);
  const out: Cells = {
    id: r.dmgId ? `${r.id} → ${r.dmgId}` : String(r.id), level: String(r.learn), cast: r.cast ? secs(r.cast) : 'instant',
    duration: r.ticks ? secs(r.dur) : '', period: r.ticks ? secs(r.period) : '', ticks: r.ticks ? String(r.ticks) : '',
    base: f(r.base, 2), perLevel: r.per ? `+${f(r.per, 2)}` : '', variance: r.var && !r.ticks ? `±${f(r.var * 50, 1)}%` : '',
    coeffPerTick: r.ticks ? f(r.coef ?? 0, 4) : '', coeff: f((r.coef ?? 0) * (r.ticks || 1)), perTick: '', damage: '',
  };
  if (r.ticks) {
    // a tick: the scaled base rounded to a whole number, plus spell power × coefficient, rounded again
    const tick = Math.round(r.base + add + 1e-9);
    if (agony) {
      // Bane of Agony: only the base ramps over the three stages; every tick gets the full spell-power share
      const k = r.ticks / 3, mults = [0.5, 1, 1.5], s = mults.map((m) => tick * m + bonus);
      out.perTick = s.map((x) => f(x, 1)).join('/');
      out.damage = f(s.reduce((a, b) => a + b, 0) * k, 0);
      out.stages = mults.map((m, j) => ({ name: `ticks ${j * k + 1}–${(j + 1) * k}`, part: `×${m} base`, base: f(r.base * m, 2),
        ticks: String(k), coeffPerTick: out.coeffPerTick, coeff: f((r.coef ?? 0) * k), perTick: f(s[j], 1), damage: f(s[j] * k, 0) }));
    } else {
      const t = Math.round(tick + bonus + 1e-9);
      out.perTick = String(t);
      out.damage = String(t * r.ticks);
    }
  } else {
    // direct damage: spell power adds to both ends; the low end rounds to the nearest whole number, the high end rounds up
    const lo = (r.dice ? r.dice[0] + add : (r.base + add) * (1 - (r.var ?? 0) / 2)) + bonus;
    const hi = (r.dice ? r.dice[1] + add : (r.base + add) * (1 + (r.var ?? 0) / 2)) + bonus;
    const a = Math.round(lo + 1e-9), b = Math.ceil(hi - 1e-9);
    out.damage = a === b ? String(a) : `${a}–${b}`;
  }
  return out;
}

const sch = (s: RankedSpell) => (s.school === 'Fire' ? 'fire' : 'shadow');
const tds = (c: Partial<Record<Key, string>>, mark?: (k: Key) => boolean) =>
  ORDER.map((k) => `<td class="${cls(k)}${mark?.(k) ? ' chg' : ''}">${esc(c[k] ?? '')}</td>`).join('');

/** the rank picker, like a gear lock: ‹ previous · shown · next ›, the neighbours faded. Drag across it either way to roll
 *  through the ranks, or click an arrow or a neighbour, or use the arrow keys. A rank not learned yet at this level is dimmed. */
function chips(s: RankedSpell, shown: number, level: number, picked: boolean) {
  const n = s.forever.length, i = Math.max(shown, 0), r = s.forever[i];
  const num = (k: number, c: string) => k < 0 || k >= n ? `<span class="lk-n ${c}" aria-hidden="true"></span>`
    : `<span class="lk-n ${c}${s.forever[k].learn <= level ? '' : ' later'}" data-to="${k}" aria-hidden="true">${k + 1}</span>`;
  // chevrons drawn like the site's other icons (stroked, rounded, in the text colour)
  const chev = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const text = shown < 0 ? 'none learned yet' : `rank ${i + 1} of ${n}, learned at ${r.learn}${picked ? ', picked' : ''}`;
  return `<span class="lock${picked ? ' picked' : ''}${shown < 0 ? ' none' : ''}" role="slider" tabindex="0" data-k="${esc(s.key)}" `
    + `aria-label="${esc(s.name)} rank" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${i + 1}" aria-valuetext="${text}" `
    + `title="Rank ${i + 1} of ${n} · ${r.id} · learned at ${r.learn}">`
    + `<span class="lk-a" data-to="${i - 1}" aria-hidden="true"${i ? '' : ' data-off'}>${chev('m14.5 6.5-5.5 5.5 5.5 5.5')}</span>`
    + num(i - 1, 'side') + num(i, 'cur') + num(i + 1, 'side')
    + `<span class="lk-a" data-to="${i + 1}" aria-hidden="true"${i < n - 1 ? '' : ' data-off'}>${chev('m9.5 6.5 5.5 5.5-5.5 5.5')}</span></span>`;
}

export interface View { level: number; sp: number; classic: boolean; pins: Record<string, number> }

/** the table body, and how many Classic rows differ from Forever's */
export function detailBody(v: View) {
  let html = '', changed = 0, missing = 0;
  for (const s of ranked) {
    const shown = v.pins[s.key] ?? rankAt(s.forever, v.level);
    const head = `<th scope="row">${esc(s.name)}</th><td class="muted">${esc(s.part)}</td><td class="rks">${chips(s, shown, v.level, v.pins[s.key] !== undefined)}</td>`;
    if (shown < 0) {
      html += `<tr class="${sch(s)} none">${head}<td class="muted g" colspan="${COLS - 3}">not learned yet (rank 1 at ${s.forever[0].learn})</td></tr>`;
      continue;
    }
    const c = cells(s.forever[shown], v.level, v.sp, s.agony);
    html += `<tr class="${sch(s)}">${head}${tds(c)}</tr>`;
    for (const st of c.stages ?? []) html += `<tr class="${sch(s)} stage"><th scope="row">${st.name}</th><td class="muted">${st.part}</td><td></td>${tds(st)}</tr>`;
    if (!v.classic) continue;
    const cr = s.classic, label = `Classic${cr && cr.name !== s.name ? ` · ${esc(cr.name)}` : ''}`;
    // the same rank when Classic has it (a picked Shadow Bolt 9), else Classic's own highest at this level
    const pinned = v.pins[s.key] !== undefined ? cr?.ranks.findIndex((r) => r.id === s.forever[shown].id) ?? -1 : -1;
    const j = cr ? (pinned >= 0 ? pinned : rankAt(cr.ranks, v.level)) : -1;
    if (!cr || j < 0) {
      if (!cr) missing++;
      html += `<tr class="${sch(s)} cmp"><th scope="row">↳ ${label}</th><td class="muted" colspan="${COLS - 1}">${cr ? 'not learned yet' : 'not in Classic'}</td></tr>`;
      continue;
    }
    const k = cells(cr.ranks[j], v.level, v.sp, s.agony);
    const differs = (key: Key) => key !== 'id' && key !== 'level' && k[key] !== c[key];
    if (ORDER.some(differs)) changed++;
    html += `<tr class="${sch(s)} cmp"><th scope="row">↳ ${label}</th><td></td><td class="muted">rank ${j + 1}</td>${tds(k, differs)}</tr>`;
  }
  const note = !v.classic ? '' : [changed ? `${changed} spells differ in Classic (changes highlighted)` : 'no differences', missing ? `${missing} not in Classic` : '']
    .filter(Boolean).join(' · ');
  return { html, note };
}
