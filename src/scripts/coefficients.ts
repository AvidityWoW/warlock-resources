// Coefficients page: "Copy image" and "Save image" draw the summary table onto a canvas, in the current theme, with the
// page title, build and site link, so it can be pasted into Discord or saved as a PNG.
import { coefficients, COEFF_BUILD } from '../data/coefficients';
import { SITE } from '../data/site';

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
