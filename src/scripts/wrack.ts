// Wrack page: the number of Wracks and their start times (boxes, or drag their windows on the timeline), the level and
// spell power redraw the timeline and the table.
import { wrackView, ranFor, settle, lengthen, resizeStart, earliest, latest, GCD, CAP, GEOM, CHANNEL, DEFAULT_STARTS, LAST_START, MIN_DUR, DOT_KEYS, type View } from '../lib/wrack';

document.addEventListener('astro:page-load', () => {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const chart = $<HTMLElement>('wr-chart');
  if (!chart) return;   // not the Wrack page
  const rows = $<HTMLElement>('wr-rows')!, take = $<HTMLElement>('wr-take')!, tip = $<HTMLElement>('wr-tip')!, box = chart.parentElement!;
  const ctl = new AbortController(), on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });

  const counts = [...document.querySelectorAll<HTMLButtonElement>('.wr-count [data-count]')];
  // each Wrack's line: its start and its duration
  const ats = [...document.querySelectorAll<HTMLElement>('.wr-at')].map((el, i) => ({ el, n: $<HTMLInputElement>(`wr-at-${i}`)!, d: $<HTMLInputElement>(`wr-for-${i}`)! }));
  // level and spell power: a slider and its number box each
  const pairs = {
    level: { r: $<HTMLInputElement>('wr-level')!, n: $<HTMLInputElement>('wr-level-n')!, lo: 1, hi: CAP },
    sp: { r: $<HTMLInputElement>('wr-sp')!, n: $<HTMLInputElement>('wr-sp-n')!, lo: 0, hi: 9999 },
  };
  type K = keyof typeof pairs;
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(x) || 0));
  const v: View = { starts: DEFAULT_STARTS.slice(0, 1), durs: [CHANNEL], level: clamp(+pairs.level.r.value, 1, CAP),
    sp: clamp(+pairs.sp.r.value, 0, 9999), order: [...DOT_KEYS] };

  const render = () => {
    counts.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.count! === v.starts.length)));
    ats.forEach(({ el, n, d }, i) => {
      el.hidden = i >= v.starts.length;
      if (i >= v.starts.length) return;
      // the cast's range: a GCD after the Wrack before it (cutting that one off if it's still channeling) to a GCD before
      // the next; the duration's: up to 6 s or the gap before the next is cast
      n.min = String(earliest(v.starts, v.durs, i));
      n.max = String(latest(v.starts, v.durs, i));
      n.value = String(v.starts[i]);
      d.min = String(MIN_DUR);
      d.max = String(+Math.min(CHANNEL, i < v.starts.length - 1 ? v.starts[i + 1] - v.starts[i] : CHANNEL).toFixed(2));
      d.value = String(ranFor(v.starts, v.durs, i));   // as it runs, after any recast cuts it short
    });
    for (const k of Object.keys(pairs) as K[]) {
      const p = pairs[k];
      p.n.value = String(v[k]);
      p.r.value = String(Math.min(v[k], +p.r.max));   // a box can go past its slider's end (spell power)
      p.r.style.setProperty('--p', `${((+p.r.value - +p.r.min) / (+p.r.max - +p.r.min)) * 100}%`);
    }
    const d = wrackView(v);
    const focused = (document.activeElement as Element | null)?.closest?.('[data-row]')?.getAttribute('data-row');
    chart.innerHTML = d.svg;
    rows.innerHTML = d.rows;
    take.innerHTML = d.takeaway;
    if (focused != null) chart.querySelector<SVGElement>(`[data-row="${moved ?? focused}"]`)?.focus();   // keep a moved row focused
    moved = null;
    // the number boxes' − and + grey out at their new ends
    document.dispatchEvent(new Event('change'));
  };

  // how many Wracks: a new one goes straight after the last, or they all go back to the defaults if there's no room
  for (const b of counts) b.addEventListener('click', () => {
    const n = +b.dataset.count!;
    const next = [...v.starts.slice(0, n)], durs = [...v.durs.slice(0, n)];
    // a new one goes once the last has ended, and at least a GCD after it was cast
    while (next.length < n) { const p = next[next.length - 1]; next.push(Math.max(p + durs[durs.length - 1], p + GCD)); durs.push(CHANNEL); }
    const fits = next[n - 1] <= LAST_START;
    v.starts = fits ? next : DEFAULT_STARTS.slice(0, n);
    v.durs = fits ? durs : Array(n).fill(CHANNEL);
    render();
  }, on);
  ats.forEach(({ n, d }, i) => {
    n.addEventListener('input', () => { if (n.value !== '') { v.starts = settle(v.starts, v.durs, i, +n.value); render(); } }, on);
    d.addEventListener('input', () => { if (d.value !== '') { v.durs = lengthen(v.starts, v.durs, i, +d.value); render(); } }, on);
    for (const x of [n, d]) x.addEventListener('change', (e) => { if (e.isTrusted) render(); }, on);   // an emptied box goes back to the value shown
  });
  for (const k of Object.keys(pairs) as K[]) {
    const p = pairs[k], set = (x: number) => { v[k] = clamp(x, p.lo, p.hi); render(); };
    p.r.addEventListener('input', () => set(+p.r.value), on);
    p.n.addEventListener('input', () => { if (p.n.value !== '') set(+p.n.value); }, on);
    p.n.addEventListener('change', (e) => { if (e.isTrusted) render(); }, on);
  }

  // cast order: drag a DoT's row (by its name) up or down, or use the arrow keys on it; the top row goes on first
  let moved: string | null = null;
  const move = (from: number, to: number) => {
    to = Math.max(0, Math.min(v.order.length - 1, to));
    if (to === from) return false;
    const o = [...v.order], [k] = o.splice(from, 1);
    o.splice(to, 0, k);
    v.order = o;
    moved = String(to);
    render();
    return true;
  };
  let rowDrag: { i: number; y: number; px: number } | null = null;
  chart.addEventListener('pointerdown', (e) => {
    const row = (e.target as Element).closest('[data-row]');
    if (e.button !== 0 || !row) return;
    const r = chart.querySelector('svg')!.getBoundingClientRect();
    rowDrag = { i: +row.getAttribute('data-row')!, y: e.clientY, px: GEOM.ROW * (r.width / GEOM.W) };   // a row's height on screen
    chart.classList.add('sorting');
    tip.hidden = true;
    e.preventDefault();
  }, on);
  document.addEventListener('pointermove', (e) => {
    if (!rowDrag) return;
    const steps = Math.round((e.clientY - rowDrag.y) / rowDrag.px);
    if (steps && move(rowDrag.i, rowDrag.i + steps)) {
      const to = Math.max(0, Math.min(v.order.length - 1, rowDrag.i + steps));
      rowDrag.y += (to - rowDrag.i) * rowDrag.px;
      rowDrag.i = to;
    }
  }, on);
  const endSort = () => { rowDrag = null; chart.classList.remove('sorting'); };
  document.addEventListener('pointerup', endSort, on);
  document.addEventListener('pointercancel', endSort, on);
  chart.addEventListener('keydown', (e) => {
    const row = (e.target as Element).closest('[data-row]');
    if (!row || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const i = +row.getAttribute('data-row')!;
    move(i, i + (e.key === 'ArrowUp' ? -1 : 1));
  }, on);

  // drag a Wrack's window (its handle on top, or the shaded channel) along the timeline, or one of its sides in or out to
  // change how long it channels; all in 0.05 s steps. what: 'move', or the side being dragged ('l' or 'r').
  let drag: { i: number; what: 'move' | 'l' | 'r'; x: number; from: number; scale: number } | null = null;
  chart.addEventListener('pointerdown', (e) => {
    const edge = (e.target as Element).closest('[data-edge]'), el = edge ?? (e.target as Element).closest('[data-drag]');
    if (e.button !== 0 || !el) return;
    const r = chart.querySelector('svg')!.getBoundingClientRect();
    const i = +(edge ? edge.getAttribute('data-edge')! : el.getAttribute('data-drag')!);
    const what = edge ? (edge.getAttribute('data-side') as 'l' | 'r') : 'move';
    // seconds per screen pixel: the drawing's time span over the width it's drawn at
    drag = { i, what, x: e.clientX, from: what === 'r' ? v.starts[i] + ranFor(v.starts, v.durs, i) : v.starts[i],
      scale: (GEOM.SPAN / (GEOM.W - GEOM.LABEL - GEOM.RIGHT)) * (GEOM.W / r.width) };
    chart.classList.add(what === 'move' ? 'dragging' : 'resizing');
    tip.hidden = true;
    e.preventDefault();
  }, on);
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const to = drag.from + (e.clientX - drag.x) * drag.scale, i = drag.i;
    const before = `${v.starts[i]},${v.durs[i]}`;
    if (drag.what === 'move') v.starts = settle(v.starts, v.durs, i, to);
    else if (drag.what === 'r') v.durs = lengthen(v.starts, v.durs, i, to - v.starts[i]);
    else ({ starts: v.starts, durs: v.durs } = resizeStart(v.starts, v.durs, i, to));
    if (`${v.starts[i]},${v.durs[i]}` !== before) render();
  }, on);
  const stop = () => { drag = null; chart.classList.remove('dragging', 'resizing'); };
  document.addEventListener('pointerup', stop, on);
  document.addEventListener('pointercancel', stop, on);

  // mouseover labels on the ticks: the spell, which tick, when and how much
  const show = (el: Element) => {
    tip.textContent = el.getAttribute('data-tip');
    tip.hidden = false;
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    // centred above the tick, kept inside the chart
    const left = Math.min(Math.max(r.left + r.width / 2 - b.left, tip.offsetWidth / 2 + 4), b.width - tip.offsetWidth / 2 - 4);
    tip.style.left = `${left}px`;
    tip.style.top = `${r.top - b.top}px`;
  };
  chart.addEventListener('pointerover', (e) => { const el = (e.target as Element).closest('[data-tip]'); if (el && !drag) show(el); }, on);
  chart.addEventListener('pointerout', (e) => { if ((e.target as Element).closest('[data-tip]')) tip.hidden = true; }, on);
  chart.addEventListener('scroll', () => { tip.hidden = true; }, on);

  render();
});
