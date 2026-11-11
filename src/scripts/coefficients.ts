// Coefficients page: "Copy image" and "Save image" draw the summary table onto a canvas, in the current theme, with the
// page title, build and site link, so it can be pasted into Discord or saved as a PNG.
import { coefficients, COEFF_BUILD } from '../data/coefficients';
import { SITE } from '../data/site';
import { ranked } from '../data/coefficient-ranks';
import { detailBody, CAP, SP_MAX, type View } from './coefficient-detail';

const SCALE = 2;   // draw at twice the size, so it stays sharp on high-DPI screens and when zoomed in Discord
const PAD = 28, ROW = 34, HEAD = 30, GAP = 28;
const COLS = [
  { label: 'Spell', right: false },
  { label: 'Dmg', right: true },
  { label: 'Per tick', right: true },
  { label: 'Ticks', right: true },
  { label: 'Coeff', right: true },
  { label: 'Coeff/tick', right: true },
];

function draw(): HTMLCanvasElement {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  const c = { bg: v('--bg'), surface: v('--surface'), odd: v('--row-odd'), even: v('--row-even'), line: v('--line'), text: v('--text'),
    muted: v('--muted'), accent: v('--accent'), fire: v('--fire'), shadow: v('--shadow') };
  const sans = getComputedStyle(document.body).fontFamily;
  const title = css.getPropertyValue('--title-font').trim() || 'Georgia, serif';
  const F = { title: `700 26px ${title}`, sub: `400 13px ${sans}`, head: `600 11px ${sans}`, name: `650 15px ${sans}`, cell: `400 15px ${sans}`,
    bold: `700 15px ${sans}`, foot: `400 12px ${sans}` };

  const rows = coefficients.map((r) => ({
    color: r.school === 'Fire' ? c.fire : c.shadow,
    mark: r.school === 'Fire' ? '◆' : '●',
    cells: [r.label ?? r.name, r.damage, r.perTick ?? '', r.ticks ?? '', r.coeff, r.coeffPerTick ?? ''],
  }));

  // column widths from their widest cell (the marker sits in the Dmg column, before the number)
  const m = document.createElement('canvas').getContext('2d')!;
  const width = (font: string, t: string) => { m.font = font; return m.measureText(t).width; };
  const w = COLS.map((col, i) => Math.max(width(F.head, col.label.toUpperCase()) + 2,
    ...rows.map((r) => width(i === 0 ? F.name : i === 4 ? F.bold : F.cell, r.cells[i]) + (i === 1 ? 18 : 0))));
  const tableW = w.reduce((a, b) => a + b, 0) + GAP * (COLS.length - 1) + 32;
  const sub = `WoW Forever ${COEFF_BUILD}`;
  const W = Math.ceil(PAD * 2 + Math.max(tableW, width(F.title, 'Warlock spell-power coefficients'), width(F.sub, sub)));
  const tableY = PAD + 64;
  const H = Math.ceil(tableY + HEAD + rows.length * ROW + 46);

  const cv = document.createElement('canvas');
  cv.width = W * SCALE; cv.height = H * SCALE;
  const g = cv.getContext('2d')!;
  g.scale(SCALE, SCALE);
  g.fillStyle = c.bg; g.fillRect(0, 0, W, H);
  g.textBaseline = 'middle';

  g.font = F.title; g.fillStyle = c.accent; g.fillText('Warlock spell-power coefficients', PAD, PAD + 12);
  g.font = F.sub; g.fillStyle = c.muted; g.fillText(sub, PAD, PAD + 42);

  // table: rounded box, header band, two-tone rows
  const x0 = PAD, w0 = W - PAD * 2, hT = HEAD + rows.length * ROW;
  g.save();
  g.beginPath(); g.roundRect(x0, tableY, w0, hT, 10); g.clip();
  g.fillStyle = c.surface; g.fillRect(x0, tableY, w0, HEAD);
  rows.forEach((_, i) => { g.fillStyle = i % 2 ? c.even : c.odd; g.fillRect(x0, tableY + HEAD + i * ROW, w0, ROW); });
  g.restore();
  g.strokeStyle = c.line; g.lineWidth = 1;
  g.beginPath(); g.roundRect(x0 + .5, tableY + .5, w0 - 1, hT - 1, 10); g.stroke();

  // x where each column starts and ends
  const xs: [number, number][] = [];
  let x = x0 + 16;
  w.forEach((cw, i) => { xs.push([x, x + cw]); x += cw + GAP; });
  const put = (t: string, i: number, y: number) => {
    const [a, b] = xs[i];
    g.textAlign = COLS[i].right ? 'right' : 'left';
    g.fillText(t, COLS[i].right ? b : a, y);
  };

  g.font = F.head; g.fillStyle = c.muted;
  COLS.forEach((col, i) => put(col.label.toUpperCase(), i, tableY + HEAD / 2 + 1));

  rows.forEach((r, i) => {
    const y = tableY + HEAD + i * ROW + ROW / 2 + 1;
    r.cells.forEach((t, j) => {
      if (!t) return;
      g.font = j === 0 ? F.name : j === 4 ? F.bold : F.cell;
      g.fillStyle = j === 1 || j === 2 ? r.color : j === 5 ? c.muted : c.text;
      put(t, j, y);
      if (j === 1) {   // school marker before the damage
        const tw = g.measureText(t).width;
        g.font = `400 11px ${sans}`; g.textAlign = 'right';
        g.fillText(r.mark, xs[1][1] - tw - 7, y);
      }
    });
  });

  // footer: legend left, site right
  const fy = tableY + hT + 24;
  g.font = F.foot; g.textAlign = 'left';
  g.fillStyle = c.fire; g.fillText('◆ Fire', PAD, fy);
  g.fillStyle = c.shadow; g.fillText('● Shadow', PAD + width(F.foot, '◆ Fire') + 14, fy);
  g.fillStyle = c.muted; g.textAlign = 'right';
  // the published address, even when the image is made from a local copy
  const url = new URL('coefficients/', new URL(import.meta.env.BASE_URL.replace(/\/?$/, '/'), import.meta.env.SITE ?? location.origin));
  g.fillText(`${SITE} · ${url.host}${url.pathname}`, W - PAD, fy);
  return cv;
}

const blob = (cv: HTMLCanvasElement) => new Promise<Blob>((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error('no image'))), 'image/png'));

// flips the button to its second label ("Copied") for a moment; a failed copy says so in that slot instead
function flash(btn: HTMLButtonElement, failed = '') {
  const b = btn.querySelector<HTMLElement>('.labels>.b')!, was = (btn.dataset.done ??= b.textContent!);
  b.textContent = failed || was;
  btn.classList.add('done');
  setTimeout(() => btn.classList.remove('done'), 1600);
}

document.addEventListener('astro:page-load', () => {
  const copy = document.querySelector<HTMLButtonElement>('#cf-copy'), save = document.querySelector<HTMLButtonElement>('#cf-save');
  if (!copy || !save) return;   // not the coefficients page
  const ctl = new AbortController();
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });
  const ready = () => document.fonts.ready.then(draw);

  // Copy needs ClipboardItem (all current browsers); without it, the button is hidden and Save is the way
  if (!('ClipboardItem' in window) || !navigator.clipboard?.write) copy.hidden = true;
  copy.addEventListener('click', async () => {
    try {
      // hand the clipboard a promise, so Safari still counts it as part of the click
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': ready().then(blob) })]);
      flash(copy);
    } catch { flash(copy, 'Use Save'); }
  }, { signal: ctl.signal });

  save.addEventListener('click', async () => {
    const url = URL.createObjectURL(await blob(await ready()));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'warlock-coefficients.png' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash(save);
  }, { signal: ctl.signal });
});

// Full detail: the level and spell-power sliders (each with a number box), rank chips and Classic toggle redraw the table body
document.addEventListener('astro:page-load', () => {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const lvl = $<HTMLInputElement>('cf-level'), body = $<HTMLElement>('cf-rows');
  if (!lvl || !body) return;   // not the coefficients page
  const lvlN = $<HTMLInputElement>('cf-level-n')!, sp = $<HTMLInputElement>('cf-sp')!, spN = $<HTMLInputElement>('cf-sp-n')!;
  const at = $<HTMLElement>('cf-at')!, cmp = $<HTMLButtonElement>('cf-classic')!, note = $<HTMLElement>('cf-note')!;
  const hint = note.textContent;
  const ctl = new AbortController(), on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(x) || 0));
  // the browser may keep the sliders' values when coming back to the page: start from them
  const v: View = { level: clamp(+lvl.value, 1, CAP), sp: clamp(+sp.value, 0, 9999), classic: false, pins: {} };

  const render = () => {
    lvl.value = lvlN.value = String(v.level);
    spN.value = String(v.sp); sp.value = String(Math.min(v.sp, SP_MAX));   // the box can go past the slider's end
    at.textContent = `at level ${v.level}, ${v.sp} SP`;
    for (const r of [lvl, sp]) r.style.setProperty('--p', `${((+r.value - +r.min) / (+r.max - +r.min)) * 100}%`);   // the slider's filled part
    // − and + grey out at the ends of their box's range
    for (const st of document.querySelectorAll<HTMLElement>('#cf-detail [data-stepper]')) {
      const el = st.querySelector('input')!;
      st.querySelector<HTMLButtonElement>('[data-step="-1"]')!.disabled = +el.value <= +el.min;
      st.querySelector<HTMLButtonElement>('[data-step="1"]')!.disabled = +el.value >= +el.max;
    }
    cmp.setAttribute('aria-pressed', String(v.classic));
    const d = detailBody(v);
    body.innerHTML = d.html;
    note.textContent = [Object.keys(v.pins).length ? 'Showing the ranks you picked; moving the level resets them.' : hint, d.note].filter(Boolean).join(' · ');
  };
  const setLevel = (x: number) => { v.level = clamp(x, 1, CAP); v.pins = {}; render(); };
  const setSp = (x: number) => { v.sp = clamp(x, 0, 9999); render(); };
  lvl.addEventListener('input', () => setLevel(+lvl.value), on);
  lvlN.addEventListener('input', () => { if (lvlN.value !== '') setLevel(+lvlN.value); }, on);
  sp.addEventListener('input', () => setSp(+sp.value), on);
  spN.addEventListener('input', () => { if (spN.value !== '') setSp(+spN.value); }, on);
  // − and + on the number boxes (the Hit cap page's stepper): step, then tell the box as if typed
  const card = $<HTMLElement>('cf-detail')!;
  card.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-step]');
    const el = b?.closest('[data-stepper]')?.querySelector('input');
    if (!b || !el) return;
    if (b.dataset.step === '1') el.stepUp(); else el.stepDown();
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, on);
  // clicking anywhere in a box's middle focuses it
  for (const m of card.querySelectorAll<HTMLElement>('.step-in')) m.addEventListener('mousedown', (e) => { if (e.target === m) { e.preventDefault(); m.querySelector('input')!.focus(); } }, on);
  // an emptied box goes back to the value shown
  for (const n of [lvlN, spN]) n.addEventListener('change', render, on);
  cmp.addEventListener('click', () => { v.classic = !v.classic; render(); }, on);
  // rank locks: drag across one either way to roll through its ranks (drag left for higher, like turning a gear), or click
  // an arrow or a faded neighbour. A rank is shown at the current level; one learned later stays at its base damage. The table
  // is redrawn on every step, so the lock is found again by its spell each time.
  const STEP = 16;   // px of drag per rank
  const lock = (key: string) => body.querySelector<HTMLElement>(`.lock[data-k="${CSS.escape(key)}"]`);
  const pick = (key: string, i: number) => {
    const n = ranked.find((x) => x.key === key)!.forever.length;
    i = Math.min(n - 1, Math.max(0, i));
    if (v.pins[key] !== i) { v.pins[key] = i; render(); }
    lock(key)?.focus({ preventScroll: true });
  };
  let drag: { key: string; x: number; from: number; moved: boolean; to: number | null } | null = null;
  body.addEventListener('pointerdown', (e) => {
    const l = (e.target as Element).closest<HTMLElement>('.lock');
    if (!l || e.button !== 0) return;
    e.preventDefault();
    const hit = (e.target as Element).closest<HTMLElement>('[data-to]');
    drag = { key: l.dataset.k!, x: e.clientX, from: +l.getAttribute('aria-valuenow')! - 1, moved: false, to: hit && !hit.hasAttribute('data-off') ? +hit.dataset.to! : null };
    document.documentElement.classList.add('cf-dragging');
    lock(drag.key)?.focus({ preventScroll: true });
  }, on);
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = drag.x - e.clientX;
    if (Math.abs(dx) >= 4) drag.moved = true;
    if (drag.moved) pick(drag.key, drag.from + Math.round(dx / STEP));
  }, on);
  const stop = () => {
    if (drag && !drag.moved && drag.to !== null) pick(drag.key, drag.to);   // a click on an arrow or a neighbour
    drag = null;
    document.documentElement.classList.remove('cf-dragging');
  };
  document.addEventListener('pointerup', stop, on);
  document.addEventListener('pointercancel', () => { if (drag) drag.to = null; stop(); }, on);
  body.addEventListener('keydown', (e) => {
    const l = (e.target as Element).closest<HTMLElement>('.lock');
    if (!l) return;
    const now = +l.getAttribute('aria-valuenow')! - 1, n = +l.getAttribute('aria-valuemax')!;
    const to = { ArrowLeft: now - 1, ArrowDown: now - 1, ArrowRight: now + 1, ArrowUp: now + 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    pick(l.dataset.k!, to);
  }, on);
  if (v.level !== CAP || v.sp !== 0) render();
});
