// Wrack page: the number of Wracks and their start times (boxes, or drag their windows on the timeline), the level, spell
// power and haste redraw the timeline and the table.
import { wrackView, ranFor, settle, lengthen, resizeStart, refit, earliest, latest, longest, gcdAt, defaultStarts, CAP, GEOM, CHANNEL, LAST_START, MAX_HASTE, MIN_DUR, STEP, DOT_KEYS, type View } from '../lib/wrack';

document.addEventListener('astro:page-load', () => {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const chart = $<HTMLElement>('wr-chart');
  if (!chart) return;   // not the Wrack page
  const rows = $<HTMLElement>('wr-rows')!, take = $<HTMLElement>('wr-take')!, tip = $<HTMLElement>('wr-tip')!, box = chart.parentElement!;
  const ctl = new AbortController(), on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });

  // each Wrack's button, down the left of its line: lit in its shade while it's on
  const counts = [...document.querySelectorAll<HTMLButtonElement>('.wr-casts [data-count]')];
  // each Wrack's line: its start and its duration
  const ats = [...document.querySelectorAll<HTMLElement>('.wr-at')].map((el, i) => ({ el, n: $<HTMLInputElement>(`wr-at-${i}`)!, d: $<HTMLInputElement>(`wr-for-${i}`)! }));
  // level and spell power: a slider and its number box each
  const pairs = {
    level: { r: $<HTMLInputElement>('wr-level')!, n: $<HTMLInputElement>('wr-level-n')!, lo: 1, hi: CAP },
    sp: { r: $<HTMLInputElement>('wr-sp')!, n: $<HTMLInputElement>('wr-sp-n')!, lo: 0, hi: 9999 },
    haste: { r: $<HTMLInputElement>('wr-haste')!, n: $<HTMLInputElement>('wr-haste-n')!, lo: 0, hi: MAX_HASTE },
  };
  type K = keyof typeof pairs;
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(x) || 0));
  const v: View = { starts: defaultStarts().slice(0, 1), durs: [CHANNEL], level: clamp(+pairs.level.r.value, 1, CAP),
    sp: clamp(+pairs.sp.r.value, 0, 9999), haste: clamp(+pairs.haste.r.value, 0, MAX_HASTE), order: [...DOT_KEYS] };
  // the 10 ms batch switches, start and end, only on /wrack/batched/, and their legend entry, shown while either is on
  const bStart = $<HTMLButtonElement>('wr-batch-start'), bEnd = $<HTMLButtonElement>('wr-batch-end'), bMid = $<HTMLButtonElement>('wr-batch-between');
  const pressed = (b: HTMLButtonElement | null) => b?.getAttribute('aria-pressed') === 'true';
  const missKey = document.querySelector<HTMLElement>('.wr-lg-miss');
  const setBatch = () => {
    v.batch = { start: pressed(bStart), end: pressed(bEnd), between: pressed(bMid) };
    if (missKey) missKey.hidden = !v.batch.start && !v.batch.end && !v.batch.between;
  };
  for (const b of [bStart, bEnd, bMid]) b?.addEventListener('click', () => { b.setAttribute('aria-pressed', String(!pressed(b))); setBatch(); render(); }, on);
  setBatch();
  /** haste as a fraction */
  const h = () => v.haste / 100;

  const render = () => {
    counts.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.count! <= v.starts.length)));
    ats.forEach(({ el, n, d }, i) => {
      // a Wrack that's off keeps its line, dimmed, with its boxes blank and shut
      const off = i >= v.starts.length;
      el.classList.toggle('off', off);
      n.disabled = d.disabled = off;
      if (off) { n.value = d.value = ''; return; }
      // the cast's range: a GCD after the Wrack before it (cutting that one off if it's still channeling) to a GCD before
      // the next; the duration's: up to 6 s or the gap before the next is cast
      n.min = String(earliest(v.starts, i, h()));
      n.max = String(latest(v.starts, i, h()));
      // to two decimals ("4.50"), so the boxes line up, unless it's being typed in
      if (document.activeElement !== n) n.value = v.starts[i].toFixed(2);
      d.min = String(MIN_DUR);
      // up to 6 s or the gap before the next is cast; shown as it runs, after any recast cuts it short
      d.max = String(longest(v.starts, i));
      if (document.activeElement !== d) d.value = ranFor(v.starts, v.durs, i).toFixed(2);
    });
    for (const k of Object.keys(pairs) as K[]) {
      const p = pairs[k];
      p.n.value = String(v[k]);
      const r = String(Math.min(v[k], +p.r.max));   // a box can go past its slider's end (spell power)
      if (p.r.value !== r) p.r.value = r;   // left alone while it's what's being dragged (touch drags can drop a reset slider)
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

  // how many Wracks: a Wrack's button turns it on, with those before it, or off, with those after it (the first stays
  // on). A new one goes straight after the last, or they all go back to the defaults if there's no room.
  for (const b of counts) b.addEventListener('click', () => {
    const k = +b.dataset.count!, n = k === v.starts.length && k > 1 ? k - 1 : k;
    const next = [...v.starts.slice(0, n)], durs = [...v.durs.slice(0, n)];
    // a new one goes once the last has ended, and at least a GCD after it was cast
    while (next.length < n) {
      const p = next[next.length - 1];
      next.push(Math.ceil(Math.max(p + durs[durs.length - 1], p + gcdAt(h())) / STEP - 1e-6) * STEP);
      durs.push(CHANNEL);
    }
    const fits = next[n - 1] <= LAST_START;
    v.starts = fits ? next.map((t) => +t.toFixed(2)) : defaultStarts(h()).slice(0, n);
    v.durs = fits ? durs : Array(n).fill(CHANNEL);
    render();
  }, on);
  ats.forEach(({ n, d }, i) => {
    n.addEventListener('input', () => { if (n.value !== '') { v.starts = settle(v.starts, i, +n.value, h()); render(); } }, on);
    d.addEventListener('input', () => { if (d.value !== '') { v.durs = lengthen(v.starts, v.durs, i, +d.value); render(); } }, on);
    for (const x of [n, d]) x.addEventListener('change', (e) => { if (e.isTrusted) render(); }, on);   // an emptied box goes back to the value shown
  });
  for (const k of Object.keys(pairs) as K[]) {
    const p = pairs[k], set = (x: number) => {
      const was = h();
      v[k] = clamp(x, p.lo, p.hi);
      if (k === 'haste') v.starts = refit(v.starts, h(), was);   // a shorter GCD frees the casts; a longer one pushes them apart
      render();
    };
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
  // change how long it channels; all in 0.01 s steps. what: 'move', or the side being dragged ('l' or 'r').
  // y: where it was pressed, so a tap on a tick inside a window (which starts a drag that goes nowhere) still shows its label
  let drag: { i: number; what: 'move' | 'l' | 'r'; x: number; y: number; from: number; scale: number } | null = null;
  /** what a press lands on to drag: a side, or the window or handle; under a tick's target, the window behind it. A finger
   *  only takes the handle and the sides: swiped across the middle of a window, it scrolls the chart sideways. */
  const grabbed = (e: { target: EventTarget | null; clientX: number; clientY: number }, touch: boolean) => {
    const t = e.target as Element, at = (sel: string) => t.closest(sel)
      ?? (t.classList.contains('wr-hit') ? document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.matches(sel)) ?? null : null);
    const edge = at('[data-edge]');
    return { edge, el: edge ?? at(touch ? '.wr-handle[data-drag]' : '[data-drag]') };
  };
  // on a touch screen, a finger on a handle, a side or a DoT's name drags it instead of scrolling the page or the chart
  chart.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (e.touches.length === 1 && ((e.target as Element).closest('[data-row]') || grabbed({ target: e.target, clientX: t.clientX, clientY: t.clientY }, true).el)) e.preventDefault();
  }, { ...on, passive: false });
  chart.addEventListener('pointerdown', (e) => {
    const { edge, el } = grabbed(e, e.pointerType === 'touch');
    if (e.button !== 0 || !el) return;
    const r = chart.querySelector('svg')!.getBoundingClientRect();
    const i = +(edge ? edge.getAttribute('data-edge')! : el.getAttribute('data-drag')!);
    const what = edge ? (edge.getAttribute('data-side') as 'l' | 'r') : 'move';
    // seconds per screen pixel: the drawing's time span over the width it's drawn at
    drag = { i, what, x: e.clientX, y: e.clientY, from: what === 'r' ? v.starts[i] + ranFor(v.starts, v.durs, i) : v.starts[i],
      scale: (GEOM.SPAN / (GEOM.W - GEOM.LABEL - GEOM.RIGHT)) * (GEOM.W / r.width) };
    chart.classList.add(what === 'move' ? 'dragging' : 'resizing');
    tip.hidden = true;
    e.preventDefault();
  }, on);
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const to = drag.from + (e.clientX - drag.x) * drag.scale, i = drag.i;
    const before = `${v.starts[i]},${v.durs[i]}`;
    if (drag.what === 'move') v.starts = settle(v.starts, i, to, h());
    else if (drag.what === 'r') v.durs = lengthen(v.starts, v.durs, i, to - v.starts[i]);
    else ({ starts: v.starts, durs: v.durs } = resizeStart(v.starts, v.durs, i, to, h()));
    if (`${v.starts[i]},${v.durs[i]}` !== before) render();
  }, on);
  const stop = (e: PointerEvent) => {
    if (drag && e.type === 'pointerup' && e.pointerType !== 'mouse' && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) {
      const el = document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.matches('[data-tip]'));
      drag = null;
      if (el) show(el);
    }
    drag = null;
    chart.classList.remove('dragging', 'resizing');
  };
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
  // a finger has no hover: a label stays up after the tap that showed it, until a tap somewhere else
  chart.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && (e.target as Element).closest('[data-tip]')) tip.hidden = true; }, on);
  document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !(e.target as Element).closest?.('#wr-chart [data-tip]')) tip.hidden = true; }, on);
  chart.addEventListener('scroll', () => { tip.hidden = true; }, on);

  render();
});
