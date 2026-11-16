// Runs a LevelBar: your level (slider and number box), any segmented choices (<div class="seg" data-name="tree"> with
// <button data-v="...">) and tick boxes (<input type="checkbox" data-name="...">). Every change calls draw() with all the
// choices. Your level is shared by the pages that use this (level:v1); the rest is kept per page under `key`.
import { MAX_LEVEL } from './macro';

export type Choices = { level: number } & Record<string, string | boolean | number>;
const LEVEL_KEY = 'level:v1';
const read = (k: string) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window: fine */ } };

export function levelBar(bar: HTMLElement, key: string, signal: AbortSignal, draw: (c: Choices) => void) {
  const on = { signal };
  const slider = bar.querySelector<HTMLInputElement>('[data-lv="slider"]')!, box = bar.querySelector<HTMLInputElement>('[data-lv="box"]')!;
  const segs = [...bar.querySelectorAll<HTMLElement>('.seg[data-name]')];
  const checks = [...bar.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-name]')];

  const savedLevel = read(LEVEL_KEY), saved = read(key) ?? {};
  const c: Choices = { level: Number.isInteger(savedLevel) && savedLevel >= 1 && savedLevel <= MAX_LEVEL ? savedLevel : +slider.value };
  for (const seg of segs) {
    const values = [...seg.querySelectorAll<HTMLButtonElement>('[data-v]')].map((b) => b.dataset.v!);
    c[seg.dataset.name!] = values.includes(saved[seg.dataset.name!]) ? saved[seg.dataset.name!] : values[0];
  }
  for (const box of checks) c[box.dataset.name!] = saved[box.dataset.name!] === true;

  const redraw = () => {
    slider.value = box.value = String(c.level);
    slider.style.setProperty('--p', `${((c.level - 1) / (MAX_LEVEL - 1)) * 100}%`);
    for (const seg of segs) for (const b of seg.querySelectorAll<HTMLButtonElement>('[data-v]')) b.setAttribute('aria-pressed', String(b.dataset.v === c[seg.dataset.name!]));
    for (const box of checks) box.checked = c[box.dataset.name!] === true;
    draw(c);
    const { level, ...rest } = c;
    write(LEVEL_KEY, level);
    write(key, rest);
  };
  const setLevel = (v: number) => { if (Number.isFinite(v)) { c.level = Math.min(MAX_LEVEL, Math.max(1, Math.round(v))); redraw(); } };
  slider.addEventListener('input', () => setLevel(+slider.value), on);
  box.addEventListener('input', () => { if (box.value !== '') setLevel(+box.value); }, on);
  box.addEventListener('change', (e) => { if (e.isTrusted) redraw(); }, on);   // an emptied box goes back to the level shown
  for (const seg of segs) for (const b of seg.querySelectorAll<HTMLButtonElement>('[data-v]')) b.addEventListener('click', () => { c[seg.dataset.name!] = b.dataset.v!; redraw(); }, on);
  for (const box of checks) box.addEventListener('change', () => { c[box.dataset.name!] = box.checked; redraw(); }, on);
  redraw();
}

/** run `start` on each visit to the page that has #id, with a signal that ends when the page is swapped out */
export function onPage(id: string, start: (bar: HTMLElement, signal: AbortSignal) => void) {
  document.addEventListener('astro:page-load', () => {
    const bar = document.getElementById(id);
    if (!bar) return;
    const ctl = new AbortController();
    document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });
    start(bar, ctl.signal);
  });
}
