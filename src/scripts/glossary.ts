// Glossary page: search and topic chips. A term matches when every word of the search is in its name, full name,
// aliases or definition. Following a link to an entry the filters hide clears them first, so the link always lands.
document.addEventListener('astro:page-load', () => {
  const q = document.querySelector<HTMLInputElement>('#gq');
  if (!q) return;   // not the glossary page
  const ctl = new AbortController();
  const on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });

  const terms = [...document.querySelectorAll<HTMLElement>('.gterm')];
  const letters = [...document.querySelectorAll<HTMLElement>('.gletter')];
  const az = [...document.querySelectorAll<HTMLAnchorElement>('.az a')];
  const chips = [...document.querySelectorAll<HTMLButtonElement>('.gcats button')];
  const count = document.querySelector<HTMLElement>('#gcount')!;
  const none = document.querySelector<HTMLElement>('#gnone')!;
  let cat = '';

  const apply = () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const t of terms) {
      t.hidden = (cat !== '' && t.dataset.cat !== cat) || !words.every((w) => t.dataset.search!.includes(w));
      if (!t.hidden) shown++;
    }
    const open = new Set<string>();
    for (const s of letters) {
      s.hidden = !s.querySelector('.gterm:not([hidden])');
      if (!s.hidden) open.add(s.dataset.letter!);
    }
    for (const a of az) a.classList.toggle('off', !open.has(a.dataset.letter!));
    const all = shown === terms.length;
    count.textContent = all ? `${terms.length} terms` : `${shown} of ${terms.length}`;
    none.hidden = shown > 0;
  };
  const pick = (c: string) => {
    cat = c;
    for (const b of chips) b.setAttribute('aria-pressed', String(b.dataset.cat === c));
    apply();
  };
  const reset = () => { q.value = ''; pick(''); };

  q.addEventListener('input', apply, on);
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape' && q.value) { q.value = ''; apply(); } }, on);
  for (const b of chips) b.addEventListener('click', () => pick(b.dataset.cat!), on);
  document.querySelector('#gclear')!.addEventListener('click', () => { reset(); q.focus(); }, on);

  // a link to a hidden entry (a cross-reference, or a #t-… link from elsewhere): show everything, then go there
  const reveal = () => {
    const el = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (el?.closest('[hidden]')) { reset(); el.scrollIntoView(); }
  };
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a.xref, .az a');
    const el = a && document.getElementById(a.hash.slice(1));
    if (el?.closest('[hidden]')) reset();
  }, { ...on, capture: true });
  window.addEventListener('hashchange', reveal, on);
  reveal();
  if (q.value) apply();   // the browser may restore a search on back/forward
});
