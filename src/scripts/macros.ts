// Macros page: search, the stone level (kept in localStorage as macros:level), and the Copy buttons.
import { LIMIT, MAX_LEVEL, fill, highlight, stonesIn, stoneRank, cqsSlowsFiller } from '../lib/macro';

const KEY = 'macros:level';

document.addEventListener('astro:page-load', () => {
  const q = document.querySelector<HTMLInputElement>('#mq');
  if (!q) return;   // not the macros page
  const ctl = new AbortController();
  const on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });

  // Tabs: Library and Guide & builder. The hash (#guide) picks the tab, so the guide can be linked to.
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('.mtabs [role="tab"]')];
  const show = (tab: HTMLButtonElement) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')!)!.hidden = !on;
    }
  };
  const guideTab = tabs[1];
  if (location.hash === '#guide' || location.hash === '#builder') show(guideTab);
  for (const t of tabs) {
    t.addEventListener('click', () => {
      show(t);
      history.replaceState(history.state, '', t === guideTab ? '#guide' : location.pathname + location.search);
    }, on);
    t.addEventListener('keydown', (e) => {   // arrow keys move between tabs
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const next = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.click(); next.focus();
    }, on);
  }
  // a jump link inside the library (#casting etc.) should always land on the library
  window.addEventListener('hashchange', () => show(location.hash === '#guide' || location.hash === '#builder' ? guideTab : tabs[0]), on);

  const level = document.querySelector<HTMLInputElement>('#mlevel')!;
  const count = document.querySelector<HTMLElement>('#mcount')!;
  const none = document.querySelector<HTMLElement>('#mnone')!;
  const cards = [...document.querySelectorAll<HTMLElement>('.macro')];
  const groups = [...document.querySelectorAll<HTMLElement>('.mgroup')];

  // Macros with stones or a dropdown: redraw the text, rank note and length for the level and the dropdown's choice.
  let lvl = MAX_LEVEL;
  const drawCard = (pre: HTMLElement) => {
    const body = pre.dataset.body!;
    const card = pre.closest<HTMLElement>('.macro')!;
    // each control's value: a dropdown's choice, a number box's text, or the ticked checkboxes joined by /
    const picked = Object.fromEntries([...card.querySelectorAll<HTMLElement>('[data-token]')].map((el) => [el.dataset.token!,
      el instanceof HTMLFieldSetElement ? [...el.querySelectorAll<HTMLInputElement>('input:checked')].map((i) => i.value).join('/') : (el as HTMLInputElement).value]));
    const derive = pre.dataset.derive ? JSON.parse(pre.dataset.derive) : undefined;
    const cqs = derive?.cqs;
    const text = fill(body, lvl, picked, derive);
    const warn = card.querySelector<HTMLElement>('.cqs-warn');   // /cqs every press with a filler: say it slows the filler
    if (warn) {
      const slowed = cqsSlowsFiller(picked, cqs);
      warn.hidden = !slowed;
      if (slowed) warn.querySelector('.cqs-spell')!.textContent = slowed;
    }
    pre.querySelector('code')!.innerHTML = highlight(text);
    const rank = card.querySelector('.rank');
    if (rank) rank.textContent = stonesIn(body, picked).map((s) => {
      const [at, r] = stoneRank(s, lvl);
      return `${r ? `${r} ` : ''}${s} (${at})`;
    }).join(', ');
    const chars = card.querySelector<HTMLElement>('.chars')!;
    chars.textContent = `${text.length}/${LIMIT}`;
    chars.classList.toggle('over', text.length > LIMIT);
  };
  const draw = (to: number) => {
    lvl = to;
    for (const pre of document.querySelectorAll<HTMLElement>('.code[data-body]')) drawCard(pre);   // any card may use the level (a stone, or a rank on "Your level")
  };
  // Spell / aim pairs that can't work (Corruption at the cursor, Rain of Fire on a mouseover chain). Any spell can always be
  // picked: if it doesn't fit the current aim, the aim moves to the first one that does, with a short note. The aim menu
  // greys out the aims that don't fit the chosen spells, so the pair stays valid. (Greying out spells as well would lock
  // you in: Rain of Fire greyed out until the aim is Cursor, Cursor greyed out until the spell is a ground spell.)
  interface Validate { spells: string[]; aim: string; allowed: Record<string, string[] | null>; kinds: Record<string, string>; says: Record<string, string> }
  const validate = (card: HTMLElement, changed?: EventTarget | null) => {
    const warn = card.querySelector<HTMLElement>('.mwarn[data-validate]');
    if (!warn) return;
    const v: Validate = JSON.parse(warn.dataset.validate!);
    const sel = (t: string) => card.querySelector<HTMLSelectElement>(`select[data-token="${t}"]`)!;
    const aim = sel(v.aim), ok = (aimValue: string, spell: string) => {
      const allowed = v.allowed[aimValue];
      return !allowed || !(spell in v.kinds) || allowed.includes(v.kinds[spell]);
    };
    const spells = v.spells.map(sel);
    const fits = (aimValue: string) => spells.every((s) => ok(aimValue, s.value));
    let note = '';
    if (!fits(aim.value)) {
      const to = [...aim.options].find((o) => fits(o.value));
      const bad = spells.find((s) => !ok(aim.value, s.value))!;
      if (to) {
        if (spells.includes(changed as HTMLSelectElement)) note = `${bad.value} ${v.says[v.kinds[bad.value]]}, so the aim is now "${to.text}".`;
        aim.value = to.value;
      } else note = `${bad.value} ${v.says[v.kinds[bad.value]]}, and no aim here fits it together with the other spell.`;
    }
    for (const s of spells) for (const o of s.options) o.disabled = false;
    for (const o of aim.options) o.disabled = !fits(o.value);
    warn.hidden = !note;
    warn.textContent = note;
  };
  for (const card of document.querySelectorAll<HTMLElement>('.macro')) if (card.querySelector('.mwarn[data-validate]')) validate(card);

  // any control on a card (dropdown, checkbox, number box) redraws it; drawn once now too, as the browser may have restored choices
  for (const card of document.querySelectorAll<HTMLElement>('.macro')) {
    if (!card.querySelector('[data-token]')) continue;
    const pre = card.querySelector<HTMLElement>('.code')!;
    const redraw = (e?: Event) => { validate(card, e?.target); drawCard(pre); };
    card.addEventListener('change', redraw, on);
    card.addEventListener('input', (e) => { if ((e.target as HTMLElement).matches('input[type="number"]')) redraw(e); }, on);
    drawCard(pre);
  }
  const clamp = (n: number) => Math.min(MAX_LEVEL, Math.max(1, Math.round(n)));
  let saved = MAX_LEVEL;
  try { saved = clamp(Number(localStorage.getItem(KEY)) || MAX_LEVEL); } catch {}
  if (saved !== MAX_LEVEL) { level.value = String(saved); draw(saved); }
  const setLevel = () => {
    if (level.value === '' || !Number.isFinite(level.valueAsNumber)) return;   // mid-edit: wait for a number
    const n = clamp(level.valueAsNumber);
    draw(n);
    try { n === MAX_LEVEL ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, String(n)); } catch {}
  };
  level.addEventListener('input', setLevel, on);
  level.addEventListener('change', () => { level.value = String(clamp(level.valueAsNumber || MAX_LEVEL)); setLevel(); }, on);

  // Search: every word has to appear somewhere in the card (name, note, badge or macro text).
  const filter = () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const c of cards) {
      const hay = c.dataset.search + ' ' + c.querySelector('code')!.textContent!.toLowerCase();
      const hit = words.every((w) => hay.includes(w));
      c.hidden = !hit;
      if (hit) shown++;
    }
    for (const g of groups) g.hidden = !g.querySelector('.macro:not([hidden])');
    count.textContent = words.length ? `${shown} of ${cards.length} macros` : `${cards.length} macros`;
    none.hidden = shown > 0;
  };
  q.addEventListener('input', filter, on);
  document.querySelector('#mclear')!.addEventListener('click', () => { q.value = ''; filter(); q.focus(); }, on);
  if (q.value) filter();   // the browser may have restored a search

  // Copy: the macro exactly as shown, with a moment of "Copied".
  for (const btn of document.querySelectorAll<HTMLButtonElement>('.macro .copy')) {
    let timer = 0;
    btn.addEventListener('click', async () => {
      const code = btn.closest('.macro')!.querySelector('code')!;
      try { await navigator.clipboard.writeText(code.textContent!); }
      catch { getSelection()?.selectAllChildren(code); return; }   // no clipboard access: select it, ready for Ctrl+C
      btn.classList.add('done');
      clearTimeout(timer);
      timer = window.setTimeout(() => btn.classList.remove('done'), 1600);
    }, on);
  }
});
