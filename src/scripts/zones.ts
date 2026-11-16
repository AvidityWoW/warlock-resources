// Zones page: your level lights up the rows that suit it, moves the marker on every range bar and recolours the bars; faction hides the
// other side's zones; "Only my level" hides the rest. Choices are kept in localStorage (zones:v1).
import { MAX_LEVEL } from '../lib/macro';
import { conVars } from '../data/zones';

const KEY = 'zones:v1';
interface Saved { level: number; fac: 'b' | 'A' | 'H'; only: boolean }
const load = (): Partial<Saved> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
const save = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private window: fine */ } };

document.addEventListener('astro:page-load', () => {
  const bar = document.getElementById('zn-bar');
  if (!bar) return;   // not the zones page
  const ctl = new AbortController(), on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });

  const slider = document.getElementById('zn-level') as HTMLInputElement, box = document.getElementById('zn-level-n') as HTMLInputElement;
  const only = document.getElementById('zn-only') as HTMLInputElement;
  const facs = [...bar.querySelectorAll<HTMLButtonElement>('[data-fac]')];
  const cards = [...document.querySelectorAll<HTMLElement>('.zn-card')];

  const saved = load();
  const s: Saved = {
    level: Number.isInteger(saved.level) && saved.level! >= 1 && saved.level! <= MAX_LEVEL ? saved.level! : +slider.value,
    fac: saved.fac === 'A' || saved.fac === 'H' ? saved.fac : 'b',
    only: saved.only === true,
  };

  const draw = () => {
    const lv = s.level;
    slider.value = box.value = String(lv);
    slider.style.setProperty('--p', `${((lv - 1) / (MAX_LEVEL - 1)) * 100}%`);
    facs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fac === s.fac)));
    only.checked = s.only;
    for (const card of cards) {
      // your-level line and the difficulty colours on the range bars
      for (const [k, v] of conVars(lv, MAX_LEVEL).split(';').map((d) => d.split(':'))) card.style.setProperty(k, v);
      const rows = [...card.querySelectorAll<HTMLTableRowElement>('tbody tr')];
      let fit = 0, shown = 0, total = 0;
      for (const r of rows) {
        const side = r.dataset.side, theirs = s.fac !== 'b' && side !== 'C' && side !== s.fac;
        const ok = lv >= +r.dataset.min! && lv <= +r.dataset.max!;
        r.classList.toggle('fit', ok);
        r.hidden = theirs || (s.only && !ok);
        if (!theirs) { total++; if (ok) fit++; }
        if (!r.hidden) shown++;
      }
      const count = card.querySelector<HTMLElement>('.zn-count')!;
      count.textContent = `· ${fit} of ${total} for level ${lv}`;
      card.querySelector<HTMLElement>('.tscroll')!.hidden = !shown;
      const empty = card.querySelector<HTMLElement>('.empty')!;
      empty.hidden = !!shown;
      empty.textContent = `No ${count.dataset.noun} for level ${lv}.`;
    }
    save(s);
  };

  const setLevel = (v: number) => { if (Number.isFinite(v)) { s.level = Math.min(MAX_LEVEL, Math.max(1, Math.round(v))); draw(); } };
  slider.addEventListener('input', () => setLevel(+slider.value), on);
  box.addEventListener('input', () => { if (box.value !== '') setLevel(+box.value); }, on);
  box.addEventListener('change', (e) => { if (e.isTrusted) draw(); }, on);   // an emptied box goes back to the level shown
  for (const b of facs) b.addEventListener('click', () => { s.fac = b.dataset.fac as Saved['fac']; draw(); }, on);
  only.addEventListener('change', () => { s.only = only.checked; draw(); }, on);
  draw();
});
