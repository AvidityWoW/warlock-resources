// Hit cap page: reads the form, redraws the result, the bar and the table's "Your chance" column. Choices are kept in
// localStorage (hitcap:*), so the page opens the way you left it.
import { hit, pct, SUPPRESSION_PER_POINT, SUPPRESSION_POINTS, MAX_HIT } from '../lib/hit';
import { MAX_LEVEL } from '../lib/macro';

const KEY = 'hitcap:v2';   // v2: Suppression is points (0–5), not a checkbox
interface Saved { you: number; them: number; gear: number; sup: number; other: number }

const load = (): Partial<Saved> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
const save = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private window: fine */ } };

document.addEventListener('astro:page-load', () => {
  const form = document.querySelector<HTMLFormElement>('#hc');
  if (!form) return;   // not the hit cap page
  const ctl = new AbortController();
  const on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });

  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const you = $<HTMLInputElement>('hc-you'), them = $<HTMLInputElement>('hc-them');
  const gear = $<HTMLInputElement>('hc-gear'), other = $<HTMLInputElement>('hc-other'), sup = $<HTMLSelectElement>('hc-sup');
  const chips = [...form.querySelectorAll<HTMLButtonElement>('.chips button')];
  const rows = [...document.querySelectorAll<HTMLTableRowElement>('#hc-rows tr')];

  // a number box's value, held to its min and max; a blank or half-typed box counts as its min
  const num = (el: HTMLInputElement) => {
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? Math.min(+el.max, Math.max(+el.min, v)) : +el.min;
  };

  const s = load();
  if (typeof s.you === 'number') you.value = String(s.you);
  if (typeof s.them === 'number') them.value = String(s.them);
  if (typeof s.gear === 'number') gear.value = String(s.gear);
  if (typeof s.other === 'number') other.value = String(s.other);
  if (typeof s.sup === 'number' && Number.isInteger(s.sup) && s.sup >= 0 && s.sup <= SUPPRESSION_POINTS) sup.value = String(s.sup);

  const draw = () => {
    const lv = num(you), tl = num(them), gap = tl - lv;
    const bonus = num(gear) + Number(sup.value) * SUPPRESSION_PER_POINT + num(other);
    const h = hit(gap, bonus);

    $('hc-chance').textContent = pct(h.chance);
    $('hc-miss').textContent = pct(100 - h.chance);
    $('hc-base').textContent = pct(h.base);
    $('hc-bonus').textContent = `+${pct(bonus)}`;
    $('hc-need').textContent = pct(h.needed);
    const state = $('hc-state');
    state.className = `state ${h.short ? 'short' : h.wasted ? 'over' : 'capped'}`;
    state.textContent = h.short ? `${pct(h.short)} short of never missing`
      : h.wasted ? `Never missing, with ${pct(h.wasted)} more hit than you need` : 'Never missing';

    // the bar shows from a round number below the base chance up to 100%
    const from = Math.max(0, Math.min(90, Math.floor((Math.min(h.base, h.chance) - 4) / 10) * 10));
    const w = (n: number) => `${(Math.max(0, n) / (100 - from)) * 100}%`;
    const shown = Math.min(h.base, MAX_HIT);
    $('hc-b-base').style.width = w(shown - from);
    $('hc-b-bonus').style.width = w(h.chance - shown);
    $('hc-b-short').style.width = w(MAX_HIT - Math.max(h.chance, shown));
    const ticks = $('hc-ticks');
    ticks.replaceChildren(...Array.from({ length: (100 - from) / 10 + 1 }, (_, i) => {
      const t = document.createElement('span');
      t.textContent = `${from + i * 10}`;
      t.style.left = `${(i * 10 / (100 - from)) * 100}%`;
      return t;
    }));

    // the table: levels follow yours, "Your chance" uses your hit, and your target's row is marked
    for (const r of rows) {
      const g = Number(r.dataset.gap);
      r.querySelector('.lvl')!.textContent = lv + g >= 1 ? String(lv + g) : '–';
      r.classList.toggle('on', g === gap);
      r.querySelector('.you')!.textContent = pct(hit(g, bonus).chance);
    }
    for (const c of chips) c.setAttribute('aria-pressed', String(Number(c.dataset.gap) === gap));
    // − and + grey out at the ends of their box's range
    for (const st of form.querySelectorAll<HTMLElement>('[data-stepper]')) {
      const el = st.querySelector('input')!, v = num(el);
      st.querySelector<HTMLButtonElement>('[data-step="-1"]')!.disabled = v <= +el.min;
      st.querySelector<HTMLButtonElement>('[data-step="1"]')!.disabled = v >= +el.max;
    }

    save({ you: lv, them: tl, gear: num(gear), sup: Number(sup.value), other: num(other) });
  };

  // − and + on the number boxes are wired by the Stepper component, and fire input like typing
  form.addEventListener('input', draw, on);
  // quick targets set the level relative to yours
  for (const c of chips) c.addEventListener('click', () => { them.value = String(Math.min(MAX_LEVEL + 10, num(you) + Number(c.dataset.gap))); draw(); }, on);
  // tidy a box that was left blank or out of range
  form.addEventListener('change', (e) => { const el = e.target as HTMLInputElement; if (el instanceof HTMLInputElement && el.type === 'number') el.value = String(num(el)); draw(); }, on);
  draw();
});
