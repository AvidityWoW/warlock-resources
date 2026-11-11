// Card titles and their controls stay in view while you scroll through a card, on every page. CSS makes them sticky
// (global.css); this works out how far down each one stops, so they stack instead of covering each other:
//   the site header, then a page's own sticky bar (the gear toolbar, the glossary's A–Z), then each card a piece sits
//   in, outermost first (the wand list's level band under its group), then pieces above it in its own card (Full
//   detail's title, then its sliders). Small cards inside a card, like the macros, scroll normally.
// Each card also gets --below, the line under its last frozen piece, where a data table's heading row sticks (below).
const PIECE = '.card>.card-h, .master>.card-h, [data-stick]';
const CARD = '.card, .master';
const BARS = '.site-header, .toolbar, .az';

/** the frozen pieces that belong to a card itself, in order (not those of cards inside it) */
const piecesOf = (card: Element) => [...card.querySelectorAll<HTMLElement>(PIECE)].filter((p) => p.parentElement!.closest(CARD) === card);

function stack() {
  // the page's sticky bars sit one under another from the top
  let base = 0;
  for (const b of document.querySelectorAll<HTMLElement>(BARS)) {
    const cs = getComputedStyle(b);
    if (cs.position === 'sticky' && cs.display !== 'none') base = Math.max(base, (parseFloat(cs.top) || 0) + b.offsetHeight);
  }
  const done = new Map<Element, number>();   // card → the line under its frozen pieces
  for (const card of document.querySelectorAll<HTMLElement>(CARD)) {
    const outer = card.parentElement?.closest(CARD);
    let top = outer ? done.get(outer) ?? base : base;   // cards come in document order, so an outer one is already done
    // outer titles paint over inner ones, which slide up under them as their card ends (all below the page bars, at 5)
    let depth = 0;
    for (let a = card.parentElement?.closest(CARD); a; a = a.parentElement?.closest(CARD)) depth++;
    for (const p of piecesOf(card)) {
      p.style.top = `${top}px`;
      p.style.zIndex = String(Math.max(1, 4 - depth));
      top += p.offsetHeight;
    }
    done.set(card, top);
    card.style.setProperty('--below', `${top}px`);
  }
}

// Data tables: the heading row follows down the table, under its card's frozen pieces (--below), and stops at the last
// row. A table that fits its card gets .fits on its box and the browser does it with position: sticky, smooth however fast
// you scroll. One that scrolls sideways sits in a scroll box, which sticky can't see past, so its heading is moved here.
const tables = () => [...document.querySelectorAll<HTMLTableElement>('.tscroll>.dtable')].filter((t) => t.tHead);

function fit() {
  for (const t of tables()) {
    const box = t.parentElement!;
    box.classList.remove('fits');
    box.classList.toggle('fits', t.offsetWidth <= box.clientWidth + 1);
  }
  follow();
}

function follow() {
  for (const t of tables()) {
    const head = t.tHead!;
    if (t.parentElement!.classList.contains('fits')) { head.style.transform = ''; continue; }
    const top = parseFloat(getComputedStyle(t.closest(CARD) ?? document.documentElement).getPropertyValue('--below'))
      || document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
    const r = t.getBoundingClientRect(), rows = t.tBodies[0]?.rows, last = rows?.[rows.length - 1]?.offsetHeight ?? 0;
    const off = Math.round(Math.min(Math.max(0, top - r.top), r.height - head.offsetHeight - last));
    head.style.transform = off > 0 ? `translateY(${off}px)` : '';
  }
}
// scroll events already come at most once a frame, so this runs straight from them; nothing to do when every table fits
window.addEventListener('scroll', () => { if (document.querySelector('.tscroll:not(.fits)>.dtable')) follow(); }, { passive: true });

let observer: ResizeObserver | null = null;
document.addEventListener('astro:page-load', () => {
  observer?.disconnect();
  // a title or bar that changes height (wrapping on a narrow screen, fonts arriving) moves everything under it, and a
  // table that grows or shrinks (Classic rows, a filter) may start or stop fitting its card
  observer = new ResizeObserver(() => { stack(); fit(); });
  for (const el of document.querySelectorAll(`${PIECE}, ${BARS}, .tscroll, .tscroll>.dtable`)) observer.observe(el);
  stack();
  fit();
});
