// Wand page: faction, source types, search, "path only", ticking wands on / off your upgrade path, reset,
// and the sticky toolbar's level label. Rows carry what's needed in data-* attributes; everything here runs in the browser.
type Fac = 'b' | 'a' | 'h';
const SIDE: Record<Fac, string> = { b: '', a: 'Alliance', h: 'Horde' };
const VIEW = 'wands:view', PICKS = 'wands:picks', REMOVED = 'wands:removed';

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
  const save = () => {
    store(VIEW, { fac, only: only.checked, off: [...off] }, fac === 'b' && !only.checked && !off.size);
    store(PICKS, [...picks], !picks.size);
    store(REMOVED, [...removed], !removed.size);
  };

  // ---- the toolbar's label follows the level band under it; a divider shows once the toolbar is stuck
  let ticking = false;
  const track = () => {
    ticking = false;
    const bar = toolbar.getBoundingClientRect();
    toolbar.classList.toggle('stuck', window.scrollY > 0 && bar.top <= parseFloat(getComputedStyle(toolbar).top) + 0.5);
    const visible = bands.filter((b) => !b.hidden);
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
  /** Your path, in level order: every wand in play that beats all before it (unless you unticked it), plus the ones you ticked. */
  function pathIds() {
    const ids = new Set<string>(); let best = -1;
    for (const r of listed) {
      if (!inPlay(r)) continue;
      const id = r.dataset.id!, dps = +r.dataset.dps!;
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
    for (const b of bands) {
      const n = b.querySelectorAll('.wand:not([hidden])').length;
      b.hidden = n === 0;
      b.querySelector('.n')!.textContent = String(n);
    }
    // controls
    for (const s of segs) s.setAttribute('aria-pressed', String(s.dataset.fac === fac));
    for (const t of typeItems) t.setAttribute('aria-checked', String(!off.has(t.dataset.kind!)));
    const onTypes = typeItems.filter((t) => !off.has(t.dataset.kind!));
    $('typesum').textContent = onTypes.length === typeItems.length ? 'All' : onTypes.length === 1 ? onTypes[0].dataset.kind! : onTypes.length ? `${onTypes.length} types` : 'None';
    $('count').textContent = `${shown} ${shown === 1 ? 'wand' : 'wands'}`;
    $('empty').hidden = shown > 0;
    $('defaults').hidden = fac === 'b' && !only.checked && !off.size && !q!.value;
    const added = [...picks].length, dropped = [...removed].length;
    $('edits').hidden = !added && !dropped;
    $('edits').querySelector('.what')!.textContent = [added && `${added} added`, dropped && `${dropped} dropped`].filter(Boolean).join(', ');
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
  // Quick repeated clicks in one spot (e.g. unticking several wands in a row with "Path only" on) must each count,
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
  $('reset-path').addEventListener('click', () => { picks.clear(); removed.clear(); save(); apply(); });

  // ---- controls
  segs.forEach((s) => s.addEventListener('click', () => { fac = s.dataset.fac as Fac; save(); apply(); }));
  for (const t of typeItems) t.addEventListener('click', () => { const k = t.dataset.kind!; off.has(k) ? off.delete(k) : off.add(k); save(); apply(); });
  only.addEventListener('change', () => { save(); apply(); });
  q.addEventListener('input', apply);
  // the Type menu closes on a click outside it or Escape
  document.addEventListener('click', (e) => { if (types.open && !types.contains(e.target as Node)) types.open = false; }, { signal });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && types.open) { types.open = false; types.querySelector('summary')!.focus(); } }, { signal });

  // Reset: faction, types, path only and search back to how the page started. Your path ticks stay ("reset path" clears those).
  const reset = () => {
    fac = 'b'; only.checked = false; q.value = ''; off.clear();
    save(); apply();
  };
  $('defaults').addEventListener('click', reset);
  $('reset').addEventListener('click', reset);

  apply();
});
