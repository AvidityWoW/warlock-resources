// Talents page: the build (one rank per talent) lives in the URL's hash, so a link shares it, and in localStorage, so the
// page opens the way you left it. A mouse clicks to learn and right-clicks to unlearn, with a label on hover; a finger taps
// a talent for its card, with − and + on it. Keys on a focused talent: Enter or + learns, − or Delete unlearns.
import { data } from '../data/talents';
import { T, type Build, empty, total, inTab, levelFor, blockers, broken, canAdd, canRemove, add, remove, resetTab, encode, decode } from '../lib/talents';

const KEY = 'talents:v1';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

document.addEventListener('astro:page-load', () => {
  const tip = document.getElementById('tl-tip');
  if (!tip) return;   // not the Talents page
  const ctl = new AbortController(), on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });
  const $ = (id: string) => document.getElementById(id)!;
  const btns = [...document.querySelectorAll<HTMLButtonElement>('.tl-talent')];
  const arrows = [...document.querySelectorAll<HTMLElement>('.tl-arrow')];
  const pts = [...document.querySelectorAll<HTMLElement>('[data-pts]')];
  const trees = [...document.querySelectorAll<HTMLElement>('[data-tree]')];

  // the build: from the link if it has one, else as you left it
  const fromHash = location.hash.slice(1);
  let saved = '';
  try { saved = localStorage.getItem(KEY) ?? ''; } catch { /* private window: fine */ }
  let b: Build = fromHash || saved ? decode(fromHash || saved) : empty();

  // the open card: which talent, and whether it's a finger's (with − and +) or a mouse's or keyboard's label
  let open: { i: number; touch: boolean } | null = null;

  const render = () => {
    const n = total(b), bad = broken(b), isBad = new Set(bad);
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
    pts.forEach((el) => { el.textContent = String(inTab(b, +el.dataset.pts!)); });
    $('tl-spent').textContent = String(n);
    $('tl-level').textContent = n ? `Needs level ${levelFor(n)}` : 'Spend a point to see the level it needs';
    // what you've picked, tree by tree, each at its rank
    const list = data.tabs.map((tab, ti) => {
      const picked = T.map((t, i) => ({ t, r: b[i] })).filter((x) => x.t.tab === ti && x.r);
      if (!picked.length) return '';
      return `<div class="tl-sec tl-t${ti}"><h3>${esc(tab.name)} <span class="muted">${inTab(b, ti)} points</span></h3><ul>`
        + picked.map(({ t, r }) => { const i = T.indexOf(t), x = isBad.has(i);
          return `<li${x ? ' class="bad"' : ''}><b>${esc(t.name)}</b> <span class="tl-r">${r}/${t.max}</span>${x ? ' <span class="tl-bad">missing its requirements</span>' : ''}<span class="muted">${esc(t.ranks[r - 1])}</span></li>`; }).join('')
        + '</ul></div>';
    }).join('');
    $('tl-list').innerHTML = list || '<p class="muted tl-none">No talents yet.</p>';
    // the link and the saved copy
    const code = encode(b);
    history.replaceState(history.state, '', code ? `#${code}` : location.pathname + location.search);
    try { localStorage.setItem(KEY, code); } catch { /* fine */ }
    if (open) show(open.i, open.touch);
  };

  const change = (next: Build) => { if (next !== b) { b = next; render(); } };

  // the card: name and rank, what's in the way, this rank and the next
  const show = (i: number, touch: boolean) => {
    // what's in the way: of the next rank, or, for a red talent, of the points it already has
    const t = T[i], r = b[i], why = blockers(b, i), bad = r > 0 && why.length > 0;
    open = { i, touch };
    tip.innerHTML = `<p class="tl-tip-h"><b>${esc(t.name)}</b><span class="muted">Rank ${r}/${t.max}</span></p>`
      + (bad ? '<p class="tl-tip-bad">Missing its requirements: it wouldn\'t work in game</p>' : '')
      + why.map((w) => `<p class="tl-tip-why${bad ? ' bad' : ''}">${esc(w)}</p>`).join('')
      + (r ? `<p>${esc(t.ranks[r - 1])}</p>` : '')
      + (r < t.max ? `${r ? '<p class="tl-tip-next">Next rank</p>' : ''}<p${r ? ' class="muted"' : ''}>${esc(t.ranks[r])}</p>` : '')
      + (touch ? `<div class="tl-tip-acts"><button type="button" class="pill" data-act="-1" ${canRemove(b, i) ? '' : 'disabled'} aria-label="Unlearn a rank">−</button>`
        + `<button type="button" class="pill" data-act="1" ${canAdd(b, i) ? '' : 'disabled'} aria-label="Learn a rank">+</button></div>` : '');
    tip.classList.toggle('touch', touch);
    tip.hidden = false;
    // above the talent, or below it if there's no room; kept on screen
    const e = btns.find((x) => +x.dataset.i! === i)!.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    const left = Math.min(Math.max(8, e.left + e.width / 2 - w / 2), window.innerWidth - w - 8);
    const above = e.top - h - 10 > 60;
    tip.style.left = `${left}px`;
    tip.style.top = `${above ? e.top - h - 10 : e.bottom + 10}px`;
  };
  const hide = () => { open = null; tip.hidden = true; };

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
      change(e.shiftKey ? remove(b, i) : add(b, i));
    }, on);
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!finger) change(remove(b, i)); }, on);
    el.addEventListener('keydown', (e) => {
      if (e.key === '-' || e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); change(remove(b, i)); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); change(add(b, i)); }
    }, on);
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(i, false); }, on);
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !open?.touch) hide(); }, on);
    el.addEventListener('focus', () => { if (!finger && el.matches(':focus-visible')) show(i, false); }, on);
    el.addEventListener('blur', () => { if (!open?.touch) hide(); }, on);
  }
  tip.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLButtonElement>('[data-act]');
    if (a && open) change(a.dataset.act === '1' ? add(b, open.i) : remove(b, open.i));
  }, on);
  window.addEventListener('scroll', () => { if (open && !open.touch) hide(); else if (open) show(open.i, true); }, { ...on, passive: true });

  for (const r of document.querySelectorAll<HTMLButtonElement>('[data-reset]')) r.addEventListener('click', () => change(resetTab(b, +r.dataset.reset!)), on);
  $('tl-reset').addEventListener('click', () => change(empty()), on);
  // Copy link: the page's address with the build, and a moment of "Copied"
  const copy = $('tl-copy');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); copy.classList.add('done'); setTimeout(() => copy.classList.remove('done'), 1500); }
    catch { /* no clipboard: the address bar has it */ }
  }, on);
  // a pasted link opened in the same tab
  window.addEventListener('hashchange', () => change(decode(location.hash.slice(1))), on);

  render();
});
