// Wand page: faction, sources, search, "show selected", ticking wands on / off your upgrade path, the reset button,
// and the sticky toolbar's level label. Rows carry what's needed in data-* attributes; everything here runs in the browser.
type Fac = 'b' | 'a' | 'h';
const SIDE: Record<Fac, string> = { b: '', a: 'Alliance', h: 'Horde' };
const VIEW = 'wands:view', PICKS = 'wands:picks', REMOVED = 'wands:removed', BLANK = 'wands:blank';

const load = <T>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } };
const store = (key: string, value: unknown, empty: boolean) => { try { empty ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch {} };

document.addEventListener('astro:page-load', () => {
  const q = document.getElementById('q') as HTMLInputElement | null;
  if (!q) return;                                  // not the wand page
  const $ = (id: string) => document.getElementById(id)!;
  const only = $('only') as HTMLInputElement;
  const segs = [...document.querySelectorAll<HTMLButtonElement>('.seg button')];
  const typeItems = [...document.querySelectorAll<HTMLButtonElement>('#types [role=menuitemcheckbox]')];
  const rows = [...document.querySelectorAll<HTMLElement>('.wand')];
  const listed = rows.filter((r) => r.closest('.band'));   // the no-source wands stay out of counts and the path
  const bands = [...document.querySelectorAll<HTMLElement>('.band')];
  const lists = [...document.querySelectorAll<HTMLElement>('.wands')];
  const toolbar = document.querySelector<HTMLElement>('.toolbar')!;
  const types = $('types') as HTMLDetailsElement;

  // Leaving the page (in-site navigation) removes the window / document listeners added below.
  const ctl = new AbortController(), signal = ctl.signal;
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });

  // ---- state, remembered in this browser
  const view = load<{ fac?: Fac; only?: boolean; off?: string[] }>(VIEW, {});
  let fac: Fac = view.fac && view.fac in SIDE ? view.fac : 'b';
  only.checked = !!view.only;
  const off = new Set<string>(view.off ?? []);            // source types switched off
  const picks = new Set<string>(load<string[]>(PICKS, []).map(String));
  // Your path edits: wands you ticked on top of the suggestions (gold), and suggestions you unticked.
  const removed = new Set<string>(load<string[]>(REMOVED, []).map(String));
  // "Deselect all" switches the suggestions off: your path is then only the wands you tick.
  let blank = load<boolean>(BLANK, false) === true;
  const save = () => {
    store(VIEW, { fac, only: only.checked, off: [...off] }, fac === 'b' && !only.checked && !off.size);
    store(PICKS, [...picks], !picks.size);
    store(REMOVED, [...removed], !removed.size);
    store(BLANK, true, !blank);
  };

  // ---- the toolbar's label follows the level band under it; a divider shows once the toolbar is stuck
  let ticking = false;
  const track = () => {
    ticking = false;
    const bar = toolbar.getBoundingClientRect();
    toolbar.classList.toggle('stuck', window.scrollY > 0 && bar.top <= parseFloat(getComputedStyle(toolbar).top) + 0.5);
    const visible = bands.filter((b) => !b.hidden);
    // the label only appears once the first level heading has scrolled up under the toolbar
    const firstHead = visible[0]?.querySelector('h2');
    toolbar.classList.toggle('show-now', !!firstHead && firstHead.getBoundingClientRect().bottom <= bar.bottom);
    let cur = visible[0];
    for (const b of visible) if (b.getBoundingClientRect().top <= bar.bottom + 8) cur = b;
    $('now').textContent = cur ? cur.dataset.label! : 'No wands';
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(track); } };
  window.addEventListener('scroll', onScroll, { passive: true, signal });
  window.addEventListener('resize', onScroll, { passive: true, signal });

  const side = () => SIDE[fac];
  // In play: the right faction and a source type that's switched on. (Search only hides rows.)
  const inPlay = (r: HTMLElement) => {
    const d = r.dataset, sd = side();
    return (!sd || !d.side || d.side === sd) && !off.has(d.kind || 'Other');
  };
  /** Your path, in level order: every wand in play that beats all before it (unless you unticked it), plus the ones you
   *  ticked. After "Deselect all" there are no suggestions, so it's just the ones you ticked. */
  function pathIds() {
    const ids = new Set<string>(); let best = -1;
    for (const r of listed) {
      if (!inPlay(r)) continue;
      const id = r.dataset.id!, dps = +r.dataset.dps!;
      if (blank) { if (picks.has(id)) ids.add(id); continue; }
      if (removed.has(id)) continue;
      if (dps > best) { best = dps; ids.add(id); } else if (picks.has(id)) ids.add(id);
    }
    return ids;
  }

  function apply() {
    const terms = q!.value.trim().toLowerCase().split(/\s+/).filter(Boolean), path = pathIds();
    // Each path wand's gain is its DPS minus the previous path wand's (a weaker added wand shows a minus).
    let prev: number | null = null, shown = 0;
    for (const r of rows) {
      const d = r.dataset, ok = inPlay(r), dps = +d.dps!, isListed = listed.includes(r), id = d.id!;
      const onPath = path.has(id);
      const g = r.querySelector('.gain')!;
      g.textContent = '';
      g.classList.remove('down');
      if (onPath) {
        if (prev !== null) {
          const diff = dps - prev;
          g.textContent = (diff >= 0 ? '+' : '−') + Math.abs(diff).toFixed(1);
          g.classList.toggle('down', diff < 0);
        }
        prev = dps;
      }
      r.classList.toggle('up', onPath);
      r.classList.toggle('pick', onPath && picks.has(id));
      const tog = r.querySelector<HTMLInputElement>('.tog');
      if (tog) tog.checked = onPath;
      const show = ok && terms.every((t) => d.text!.includes(t)) && (!only.checked || onPath);
      r.hidden = !show;
      if (show && isListed) shown++;
    }
    // two-tone rows: alternate over the rows actually showing in each list
    for (const list of lists) {
      list.classList.add('js');
      let i = 0;
      for (const r of list.children as HTMLCollectionOf<HTMLElement>) if (!r.hidden) r.classList.toggle('alt', i++ % 2 === 1);
    }
    for (const b of bands) {
      const n = b.querySelectorAll('.wand:not([hidden])').length;
      b.hidden = n === 0;
      b.querySelector('.n')!.textContent = String(n);
    }
    // controls
    for (const s of segs) s.setAttribute('aria-pressed', String(s.dataset.fac === fac));
    for (const t of typeItems) t.setAttribute('aria-checked', String(!off.has(t.dataset.kind!)));
    const onTypes = typeItems.filter((t) => !off.has(t.dataset.kind!));
    $('typesum').textContent = onTypes.length === typeItems.length ? 'All' : onTypes.length === 1 ? onTypes[0].dataset.kind! : onTypes.length ? `${onTypes.length} of ${typeItems.length}` : 'None';
    $('count').textContent = `${shown} ${shown === 1 ? 'wand' : 'wands'}`;
    $('empty').hidden = shown > 0;
    // One Reset button, always there: greyed out when there's nothing to reset; its tooltip says what it will reset.
    const filters = [fac !== 'b' && 'faction', off.size && 'source', only.checked && 'show selected', q!.value && 'search'].filter(Boolean) as string[];
    const added = picks.size, dropped = removed.size;
    const edits = [blank && 'deselected all', added && `${added} added`, dropped && `${dropped} dropped`].filter(Boolean).join(', ');
    const rb = $('reset-all') as HTMLButtonElement, what = [...filters, edits && `your path (${edits})`].filter(Boolean);
    rb.disabled = !what.length;
    rb.title = what.length ? `Reset ${what.join(', ')}` : 'Nothing to reset';
    // Deselect all while anything's ticked; once nothing is, the same button brings the suggestions back.
    const empty = path.size === 0, db = $('desel');
    db.classList.toggle('on', empty);
    db.setAttribute('aria-label', empty ? 'Use suggested' : 'Deselect all');
    db.title = empty ? 'Tick the suggested upgrades again' : 'Untick every wand, including the suggested upgrades';
    shareBtn.disabled = empty;
    $('edits').hidden = !edits;
    $('edits').querySelector('.what')!.textContent = edits;
    track();
  }

  // ---- rows: the checkbox (or anywhere on the row) puts a wand on or off your path
  const toggle = (id: string) => {
    if (pathIds().has(id)) {
      if (picks.has(id)) picks.delete(id); else removed.add(id);        // untick: drop it
    } else {
      removed.delete(id);                                              // tick: a dropped suggestion comes back…
      if (!pathIds().has(id)) picks.add(id);                           // …anything else is added (gold)
    }
    save(); apply();
  };
  // Quick repeated clicks in one spot (e.g. unticking several wands in a row with "Show selected" on) must each count,
  // so: no double-click word selection on rows, and a click is only ignored if the mouse moved while held (a text drag).
  let downX = 0, downY = 0;
  for (const r of listed) {
    r.addEventListener('mousedown', (e) => {
      downX = e.clientX; downY = e.clientY;
      if (e.detail > 1 && !(e.target as HTMLElement).closest('a')) e.preventDefault();
    });
    r.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('a')) return;                                      // links still open
      const dragged = Math.hypot(e.clientX - downX, e.clientY - downY) > 4;
      if (dragged && !t.closest('.tog') && getSelection()?.toString()) return;   // selecting text doesn't toggle
      toggle(r.dataset.id!);
    });
  }

  // ---- sharing: a link lists the wands on your path (base-36 ids, in level order) and your faction.
  // Opening one makes that your path, keeping green for what's suggested and gold for what was added; Undo puts yours back.
  const shareUrl = () => {
    const u = new URL(location.pathname, location.origin);
    u.searchParams.set('path', [...pathIds()].map((id) => (+id).toString(36)).join('.'));
    if (fac !== 'b') u.searchParams.set('f', fac);
    return u.href;
  };
  const shareBtn = $('share') as HTMLButtonElement;
  let copiedTimer = 0;
  shareBtn.addEventListener('click', async () => {
    const url = shareUrl();
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { navigator.share({ title: 'My wand path', url }).catch(() => {}); return; }
    try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy this link', url); return; }
    shareBtn.classList.add('done'); clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => shareBtn.classList.remove('done'), 2000);
  });
  const params = new URLSearchParams(location.search);
  if (params.has('path')) {
    const known = new Set(listed.map((r) => r.dataset.id!));
    const want = new Set((params.get('path') ?? '').split('.').filter(Boolean).map((t) => String(parseInt(t, 36))).filter((id) => known.has(id)));
    const before = { fac, only: only.checked, off: [...off], picks: [...picks], removed: [...removed], blank };
    const f = params.get('f') as Fac | null;
    fac = f && f in SIDE ? f : 'b'; only.checked = false; off.clear();
    picks.clear(); removed.clear(); blank = want.size === 0;
    if (!blank) {
      for (const id of want) picks.add(id);
      // drop suggestions that aren't on the shared path (dropping one can promote another, so repeat until settled)
      for (let extra = [...pathIds()].filter((id) => !want.has(id)); extra.length; extra = [...pathIds()].filter((id) => !want.has(id)))
        for (const id of extra) removed.add(id);
      // anything that's on the path as a suggestion anyway doesn't need to be an added (gold) one
      for (const id of [...picks]) { picks.delete(id); if (!pathIds().has(id)) picks.add(id); }
    }
    save();
    history.replaceState(history.state, '', location.pathname + location.hash);   // tidy the address bar; keep Astro's state
    const note = $('shared');
    note.hidden = false;
    $('share-keep').addEventListener('click', () => { note.hidden = true; });
    $('share-undo').addEventListener('click', () => {
      fac = before.fac; only.checked = before.only; blank = before.blank;
      off.clear(); before.off.forEach((k) => off.add(k));
      picks.clear(); before.picks.forEach((k) => picks.add(k));
      removed.clear(); before.removed.forEach((k) => removed.add(k));
      note.hidden = true; save(); apply();
    });
  }

  // ---- controls
  segs.forEach((s) => s.addEventListener('click', () => { fac = s.dataset.fac as Fac; save(); apply(); }));
  for (const t of typeItems) t.addEventListener('click', () => { const k = t.dataset.kind!; off.has(k) ? off.delete(k) : off.add(k); save(); apply(); });
  only.addEventListener('change', () => { save(); apply(); });
  q.addEventListener('input', apply);
  // the Source menu opens under its button; if that would run off the right edge, it lines up with the button's right edge
  types.addEventListener('toggle', () => {
    const menu = types.querySelector<HTMLElement>('.menu')!;
    menu.classList.remove('flip');
    if (types.open && menu.getBoundingClientRect().right > document.documentElement.clientWidth - 8) menu.classList.add('flip');
  });
  // the Source menu closes on a click outside it or Escape
  document.addEventListener('click', (e) => { if (types.open && !types.contains(e.target as Node)) types.open = false; }, { signal });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && types.open) { types.open = false; types.querySelector('summary')!.focus(); } }, { signal });

  $('desel').addEventListener('click', () => {
    if (pathIds().size) { blank = true; picks.clear(); } else blank = false;   // deselect all / use suggested
    removed.clear(); save(); apply();
  });
  // Reset: faction, sources, show selected, search and your ticks, all back to how the page started.
  $('reset-all').addEventListener('click', () => { fac = 'b'; only.checked = false; q.value = ''; off.clear(); picks.clear(); removed.clear(); blank = false; save(); apply(); });
  // "Nothing here" only needs the filters cleared; your ticks stay.
  $('reset').addEventListener('click', () => { fac = 'b'; only.checked = false; q.value = ''; off.clear(); save(); apply(); });

  apply();
});
