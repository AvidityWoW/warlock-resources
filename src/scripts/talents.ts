// Talents page: the build is kept as its order (every point in the order it was spent), in the URL's hash, so a link
// shares it, and in localStorage, so the page opens the way you left it. A mouse clicks to learn and right-clicks to
// unlearn, with a label on hover; a finger taps a talent for its card, with − and + on it. Keys on a focused talent:
// Enter or + learns, − or Delete unlearns.
import { data } from '../data/talents';
import {
  T, type Order, buildOf, total, inTab, above, levelFor, blockers, broken, canAdd, canRemove, add, remove, resetTab,
  stepsOk, repair, encode, decode,
} from '../lib/talents';

const KEY = 'talents:v1';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const icon = (i: number) => `<img src="${base}talents/${T[i].icon}.jpg" alt="" width="56" height="56" decoding="async">`;

/** the order a line a level: the talent, the rank it reaches there, and whether the game allowed it then */
function steps(o: Order) {
  const fine = stepsOk(o), seen = new Map<number, number>();
  return o.map((i, k) => {
    const r = (seen.get(i) ?? 0) + 1;
    seen.set(i, r);
    return { i, k, level: levelFor(k + 1), r, bad: !fine[k] };
  });
}
/** the order with steps k to k + n - 1 moved to before step `to` (an index in the order as it was) */
function move(o: Order, k: number, n: number, to: number): Order {
  if (to >= k && to <= k + n) return o;
  const part = o.slice(k, k + n), rest = [...o.slice(0, k), ...o.slice(k + n)];
  const at = to > k ? to - n : to;
  return [...rest.slice(0, at), ...part, ...rest.slice(at)];
}


document.addEventListener('astro:page-load', () => {
  const tip = document.getElementById('tl-tip');
  if (!tip) return;   // not the Talents page
  const ctl = new AbortController(), on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });
  const $ = (id: string) => document.getElementById(id)!;
  const btns = [...document.querySelectorAll<HTMLButtonElement>('.tl-talent')];
  const arrows = [...document.querySelectorAll<HTMLElement>('.tl-arrow')];
  const gates = [...document.querySelectorAll<HTMLElement>('.tl-gate')];
  const pts = [...document.querySelectorAll<HTMLElement>('[data-pts]')];
  const segs = [...document.querySelectorAll<HTMLElement>('[data-seg]')];
  const trees = [...document.querySelectorAll<HTMLElement>('[data-tree]')];

  // the Order as icons only (a row per five levels), remembered
  const ICONS = 'talents:icons';
  const ol = $('tl-order'), iconsBtn = $('tl-icons');
  const setIcons = (v: boolean) => {
    ol.classList.toggle('icons', v);
    iconsBtn.setAttribute('aria-pressed', String(v));
    try { localStorage.setItem(ICONS, v ? '1' : ''); } catch { /* fine */ }
  };
  let iconsOn = false;
  try { iconsOn = localStorage.getItem(ICONS) === '1'; } catch { /* fine */ }
  setIcons(iconsOn);
  iconsBtn.addEventListener('click', () => setIcons(!ol.classList.contains('icons')), on);

  // the build: from the link if it has one, else as you left it
  const fromHash = location.hash.slice(1);
  let saved = '';
  try { saved = localStorage.getItem(KEY) ?? ''; } catch { /* private window: fine */ }
  let o: Order = decode(fromHash || saved);

  // the open card: which talent, and whether it's a finger's (with − and +) or a mouse's or keyboard's label
  let open: { i: number; touch: boolean } | null = null;
  // the talent whose points the Order list is lighting up, while the mouse is on it
  let hot = -1;

  const render = () => {
    const b = buildOf(o), n = total(b), bad = broken(b), isBad = new Set(bad);
    btns.forEach((el) => {
      const i = +el.dataset.i!, t = T[i], r = b[i];
      // learned, but its gate or prerequisite has gone: red
      el.classList.toggle('bad', isBad.has(i));
      el.classList.toggle('on', r > 0);
      el.classList.toggle('max', r === t.max);
      // can take a point now / can't yet (and has none)
      el.classList.toggle('open', r < t.max && canAdd(b, i));
      el.classList.toggle('locked', !r && !canAdd(b, i));
      el.querySelector('.tl-rank')!.textContent = `${r}/${t.max}`;
      el.setAttribute('aria-label', `${t.name}, ${r} of ${t.max}${isBad.has(i) ? ', missing its requirements' : ''}`);
    });
    // a tree with any red talent in it glows red
    for (const tree of trees) tree.classList.toggle('bad', bad.some((i) => T[i].tab === +tree.dataset.tree!));
    // an arrow lights once the talent it comes from is maxed, and goes red with it
    for (const a of arrows) {
      const i = +a.dataset.from!;
      a.classList.toggle('on', b[i] === T[i].max && !isBad.has(i));
      a.classList.toggle('bad', b[i] === T[i].max && isBad.has(i));
    }
    // a row's gate number lights once the rows above it hold enough points
    for (const g of gates) {
      const tab = +g.closest<HTMLElement>('[data-tree]')!.dataset.tree!;
      g.classList.toggle('met', above(b, tab, +g.dataset.row!) >= +g.dataset.gate!);
    }
    const split = data.tabs.map((_, ti) => inTab(b, ti));
    pts.forEach((el) => { el.textContent = String(split[+el.dataset.pts!]); });
    segs.forEach((el) => { el.style.flexGrow = String(split[+el.dataset.seg!]); });
    $('tl-split').textContent = split.join(' / ');
    $('tl-spent').textContent = String(n);
    $('tl-level').textContent = n ? `Needs level ${levelFor(n)}` : 'Spend a point to see the level it needs';

    // the order, a line a level; points taken too early (a broken build) in red
    const rs = steps(o), run = data.tabs.map(() => 0);
    $('tl-order').innerHTML = rs.map((x) => {
      const t = T[x.i];
      // a band heading every 5 levels, and a note when this point opens a tree's next row
      run[t.tab]++;
      const band = (x.level % 5 === 0 || x.k === 0) ? ` data-band="Levels ${x.level - (x.level % 5)}–${x.level - (x.level % 5) + 4}"` : '';
      const opens = run[t.tab] % 5 === 0 && run[t.tab] <= 30 ? ` data-note="${esc(data.tabs[t.tab].name)} row ${run[t.tab] / 5 + 1} opens"` : '';
      return `<li class="tl-t${t.tab}${x.bad ? ' bad' : ''}${x.i === hot ? ' hot' : ''}" data-i="${x.i}" data-k="${x.k}" data-n="1"${band}${opens} title="Level ${x.level}: ${esc(t.name)} ${x.r}/${t.max}${x.bad ? ' (missing its requirements)' : ''}">`
        + `<button type="button" class="tl-grip" aria-label="Move ${esc(t.name)}, level ${x.level}: drag, or use the up and down arrow keys">`
        + '<svg viewBox="0 0 10 16" aria-hidden="true"><circle cx="2.5" cy="3" r="1.4"/><circle cx="7.5" cy="3" r="1.4"/><circle cx="2.5" cy="8" r="1.4"/><circle cx="7.5" cy="8" r="1.4"/><circle cx="2.5" cy="13" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/></svg></button>'
        + `<span class="tl-lv">${x.level}</span>`
        + `${icon(x.i)}<span class="tl-on"><b>${esc(t.name)}</b> <span class="tl-r">${x.r}/${t.max}</span>`
        + `${x.bad ? '<span class="tl-bad">missing its requirements</span>' : ''}<span class="tl-txt">${esc(t.ranks[x.r - 1])}</span></span>`
        + '</li>';
    }).join('');
    $('tl-order-none').hidden = rs.length > 0;
    $('tl-order-hint').hidden = !rs.length;
    ($('tl-copy-order') as HTMLButtonElement).disabled = !rs.length;

    // what you've picked, tree by tree, each at its rank
    const list = data.tabs.map((tab, ti) => {
      const picked = T.map((t, i) => ({ t, i, r: b[i] })).filter((x) => x.t.tab === ti && x.r);
      if (!picked.length) return '';
      return `<div class="tl-sec tl-t${ti}"><h3>${esc(tab.name)} <span class="muted">${split[ti]} points</span></h3><ul>`
        + picked.map(({ t, i, r }) => { const x = isBad.has(i);
          return `<li${x ? ' class="bad"' : ''}>${icon(i)}<div><b>${esc(t.name)}</b> <span class="tl-r">${r}/${t.max}</span>${x ? ' <span class="tl-bad">missing its requirements</span>' : ''}<span class="muted">${esc(t.ranks[r - 1])}</span></div></li>`; }).join('')
        + '</ul></div>';
    }).join('');
    $('tl-list').innerHTML = list || '<p class="muted tl-none">No talents yet.</p>';
    // the link and the saved copy
    const code = encode(o);
    history.replaceState(history.state, '', code ? `#${code}` : location.pathname + location.search);
    try { localStorage.setItem(KEY, code); } catch { /* fine */ }
    if (open) show(open.i, open.touch);
  };

  const change = (next: Order) => { if (next !== o) { o = next; render(); } };

  // ---------- reordering the Order list: drag a line by its grip (mouse or finger), or arrow keys on a focused grip ----------
  // A line moved above what its talent needs (its gate or arrow) lands at the first level it can be taken at instead.
  const say = (t: string) => { const n = $('tl-moved'); n.textContent = t; n.hidden = !t; };
  /** move steps k..k+n-1 before step `to`, then put the order right; returns the step the first moved point ended at */
  const reorder = (k: number, n: number, to: number) => {
    const i = o[k], want = move(o, k, n, to);
    if (want === o) return k;
    const got = repair(want);
    // the first moved point is its talent's c-th: where it was asked to go, and where the game lets it be
    const at = to > k ? to - n : to, c = want.slice(0, at + 1).filter((x) => x === i).length;
    const nth = (x: Order) => { let m = 0; return x.findIndex((y) => y === i && ++m === c); };
    const p = nth(got);
    say(p > at ? `${T[i].name} can't be taken before level ${levelFor(p + 1)}, so it went there.` : '');
    change(got);
    return p;
  };
  const order = $('tl-order');
  let drag: { li: HTMLElement; k: number; n: number; ghost: HTMLElement; dy: number; to: number; id: number; raf: number; y: number } | null = null;
  const lines = () => [...order.children] as HTMLElement[];
  const mark = (to: number) => {
    // a line across the gap the lines will drop into: above the line that starts at `to`, or below the last one
    for (const li of lines()) {
      const k = +li.dataset.k!, n = +li.dataset.n!;
      li.classList.toggle('drop-a', k === to);
      li.classList.toggle('drop-b', to === o.length && k + n === to);
    }
  };
  const aim = (x: number, y: number) => {
    if (!drag) return;
    const under = document.elementFromPoint(x, y)?.closest<HTMLElement>('#tl-order > li');
    if (under) {
      const r = under.getBoundingClientRect(), k = +under.dataset.k!, n = +under.dataset.n!;
      const across = order.classList.contains('icons');   // icons run left to right
      drag.to = (across ? x < r.left + r.width / 2 : y < r.top + r.height / 2) ? k : k + n;
    } else {
      // past the list's ends
      const all = lines(), first = all[0].getBoundingClientRect(), last = all[all.length - 1].getBoundingClientRect();
      if (y < first.top) drag.to = 0; else if (y > last.bottom && x > last.left) drag.to = o.length;
    }
    mark(drag.to);
  };
  // scroll the page while a line is held near the top or bottom of the screen
  const edge = () => {
    if (!drag) return;
    const m = 70, v = drag.y < m ? -(m - drag.y) / 4 : drag.y > innerHeight - m ? (drag.y - innerHeight + m) / 4 : 0;
    if (v) window.scrollBy(0, v);
    drag.raf = requestAnimationFrame(edge);
  };
  order.addEventListener('pointerdown', (e) => {
    // a line is picked up by its grip or its icon; with Icons only, anywhere on the tile
    const el = e.target as Element;
    const grip = el.closest<HTMLElement>('.tl-grip')
      ?? (el.closest('#tl-order > li > img') || order.classList.contains('icons') ? el.closest<HTMLElement>('#tl-order > li') : null);
    if (!grip || e.button > 0) return;
    e.preventDefault();
    const li = grip.closest<HTMLElement>('li')!, r = li.getBoundingClientRect();
    const ghost = li.cloneNode(true) as HTMLElement;
    ghost.className += ' tl-ghost';
    // with Icons only, the copy under the pointer is the tile, not a line
    if (order.classList.contains('icons')) ghost.classList.add('icon');
    Object.assign(ghost.style, { width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px` });
    document.body.append(ghost);
    li.classList.add('dragging');
    document.documentElement.classList.add('tl-dragging');
    grip.setPointerCapture(e.pointerId);
    drag = { li, k: +li.dataset.k!, n: +li.dataset.n!, ghost, dy: e.clientY - r.top, to: +li.dataset.k!, id: e.pointerId, raf: 0, y: e.clientY };
    drag.raf = requestAnimationFrame(edge);
    hide();
  }, on);
  order.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.y = e.clientY;
    drag.ghost.style.top = `${e.clientY - drag.dy}px`;
    drag.ghost.style.left = `${e.clientX - drag.ghost.offsetWidth / 2}px`;
    aim(e.clientX, e.clientY);
  }, on);
  const drop = (e: PointerEvent, keep: boolean) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    cancelAnimationFrame(d.raf);
    d.ghost.remove();
    document.documentElement.classList.remove('tl-dragging');
    d.li.classList.remove('dragging');
    mark(-1);
    if (keep) reorder(d.k, d.n, d.to);
  };
  order.addEventListener('pointerup', (e) => drop(e, true), on);
  order.addEventListener('pointercancel', (e) => drop(e, false), on);
  order.addEventListener('keydown', (e) => {
    const grip = (e.target as Element).closest<HTMLElement>('.tl-grip');
    if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const li = grip.closest<HTMLElement>('li')!, all = lines(), j = all.indexOf(li), k = +li.dataset.k!, n = +li.dataset.n!;
    // past the next line up, or the next line down
    const nb = all[e.key === 'ArrowUp' ? j - 1 : j + 1];
    if (!nb) return;
    const to = e.key === 'ArrowUp' ? +nb.dataset.k! : +nb.dataset.k! + +nb.dataset.n!;
    const p = reorder(k, n, to);
    // keep the focus on the line that moved (it may have merged with a neighbour)
    lines().find((x) => +x.dataset.k! <= p && p < +x.dataset.k! + +x.dataset.n!)?.querySelector<HTMLElement>('.tl-grip')?.focus();
  }, on);

  // the card: name and rank, what's in the way, this rank and the next, and the levels its points are taken at
  const show = (i: number, touch: boolean) => {
    // what's in the way: of the next rank, or, for a red talent, of the points it already has
    const b = buildOf(o), t = T[i], r = b[i], why = blockers(b, i), bad = r > 0 && why.length > 0;
    const lvls = o.flatMap((x, k) => (x === i ? [levelFor(k + 1)] : []));
    open = { i, touch };
    tip.className = `tl-tip tl-t${t.tab}${touch ? ' touch' : ''}`;
    tip.innerHTML = `<div class="tl-tip-h">${icon(i)}<p><b>${esc(t.name)}</b><span class="muted">${esc(data.tabs[t.tab].name)} · rank ${r}/${t.max}</span></p></div>`
      + (bad ? '<p class="tl-tip-bad">Missing its requirements: it wouldn\'t work in game</p>' : '')
      + why.map((w) => `<p class="tl-tip-why${bad ? ' bad' : ''}">${esc(w)}</p>`).join('')
      + (r ? `<p>${esc(t.ranks[r - 1])}</p>` : '')
      + (r < t.max ? `${r ? '<p class="tl-tip-next">Next rank</p>' : ''}<p${r ? ' class="muted"' : ''}>${esc(t.ranks[r])}</p>` : '')
      + (lvls.length ? `<p class="tl-tip-lv">Taken at level${lvls.length > 1 ? 's' : ''} ${lvls.join(', ')}</p>` : '')
      + (touch ? `<div class="tl-tip-acts"><button type="button" class="pill" data-act="-1" ${canRemove(b, i) ? '' : 'disabled'} aria-label="Unlearn a rank">−</button>`
        + `<button type="button" class="pill" data-act="1" ${canAdd(b, i) ? '' : 'disabled'} aria-label="Learn a rank">+</button></div>` : '');
    tip.hidden = false;
    // above the talent, or below it if there's no room; kept on screen
    const e = btns.find((x) => +x.dataset.i! === i)!.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    const left = Math.min(Math.max(8, e.left + e.width / 2 - w / 2), window.innerWidth - w - 8);
    const up = e.top - h - 10 > 60;
    tip.style.left = `${left}px`;
    tip.style.top = `${up ? e.top - h - 10 : e.bottom + 10}px`;
  };
  const hide = () => { open = null; tip.hidden = true; };
  // a talent under the mouse lights its lines in the Order list, and a line there lights its talent
  const light = (i: number) => {
    hot = i;
    for (const li of $('tl-order').children) li.classList.toggle('hot', +(li as HTMLElement).dataset.i! === i);
    for (const el of btns) el.classList.toggle('hot', +el.dataset.i! === i);
  };

  // which kind of pointer pressed last, so a click knows if it was a finger
  let finger = false;
  const talentOf = (e: Event) => (e.target as Element).closest<HTMLButtonElement>('.tl-talent');
  document.addEventListener('pointerdown', (e) => {
    finger = e.pointerType !== 'mouse';
    if (finger && !talentOf(e) && !(e.target as Element).closest('#tl-tip')) hide();
  }, on);
  for (const el of btns) {
    const i = +el.dataset.i!;
    el.addEventListener('click', (e) => {
      if (finger && e.detail) { finger = false; return open?.i === i && open.touch ? hide() : show(i, true); }
      change(e.shiftKey ? remove(o, i) : add(o, i));
    }, on);
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!finger) change(remove(o, i)); }, on);
    el.addEventListener('keydown', (e) => {
      if (e.key === '-' || e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); change(remove(o, i)); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); change(add(o, i)); }
    }, on);
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { show(i, false); light(i); } }, on);
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { light(-1); if (!open?.touch) hide(); } }, on);
    el.addEventListener('focus', () => { if (!finger && el.matches(':focus-visible')) show(i, false); }, on);
    el.addEventListener('blur', () => { if (!open?.touch) hide(); }, on);
  }
  order.addEventListener('pointerover', (e) => {
    const li = (e.target as Element).closest<HTMLElement>('li');
    if (e.pointerType === 'mouse' && !drag) light(li ? +li.dataset.i! : -1);
  }, on);
  order.addEventListener('pointerleave', () => light(-1), on);
  tip.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLButtonElement>('[data-act]');
    if (a && open) change(a.dataset.act === '1' ? add(o, open.i) : remove(o, open.i));
  }, on);
  window.addEventListener('scroll', () => { if (open && !open.touch) hide(); else if (open) show(open.i, true); }, { ...on, passive: true });

  for (const r of document.querySelectorAll<HTMLButtonElement>('[data-reset]')) r.addEventListener('click', () => change(resetTab(o, +r.dataset.reset!)), on);
  $('tl-reset').addEventListener('click', () => { say(''); change([]); }, on);
  // a button that copies some text, with a moment of "Copied"
  const copier = (id: string, text: () => string) => {
    const el = $(id);
    el.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text()); el.classList.add('done'); setTimeout(() => el.classList.remove('done'), 1500); }
      catch { /* no clipboard */ }
    }, on);
  };
  // Copy link: the page's address, which holds the build and the level of every point. Copy order: a line a level, with the link under it
  copier('tl-copy', () => location.href);
  copier('tl-copy-order', () => steps(o).map((x) => `${String(x.level).padEnd(3)} ${T[x.i].name} ${x.r}/${T[x.i].max}`).join('\n') + `\n${location.href}`);
  // a pasted link opened in the same tab
  window.addEventListener('hashchange', () => change(decode(location.hash.slice(1))), on);

  render();
});
