// Class quests page: your level marks each chain as startable or not (on its card and in the row of links at the top);
// faction hides the other side's routes. A shopping list's ticks are kept too (quests:shop:v2), and the
// "Progress check" commands copy.
import { levelBar, onPage } from '../lib/levelbar';

onPage('cq-bar', (bar, signal) => {
  const cards = [...document.querySelectorAll<HTMLElement>('.cq-card')], links = [...document.querySelectorAll<HTMLElement>('.cq-toc a')];
  const count = document.getElementById('cq-count')!;
  // shopping lists: tick off what you have
  const SHOP = 'quests:shop:v2';
  let got: string[] = [];
  try { got = JSON.parse(localStorage.getItem(SHOP) ?? '[]'); } catch { /* private window: fine */ }
  for (const shop of document.querySelectorAll<HTMLElement>('.cq-shop')) {
    const boxes = [...shop.closest('.cq-card')!.querySelectorAll<HTMLInputElement>('input[data-buy]')], clear = shop.querySelector<HTMLButtonElement>('.cq-clear')!;
    const id = (b: HTMLInputElement) => `${shop.dataset.chain}:${b.dataset.buy}`;
    const sync = () => {
      const n = boxes.filter((b) => b.checked).length;
      shop.querySelector('.cq-shop-n')!.textContent = `${n} of ${boxes.length}`;
      clear.hidden = !n;
      const mine = boxes.map(id);
      got = [...got.filter((g) => !mine.includes(g)), ...boxes.filter((b) => b.checked).map(id)];
      try { localStorage.setItem(SHOP, JSON.stringify(got)); } catch { /* private window: fine */ }
    };
    for (const b of boxes) { b.checked = got.includes(id(b)); b.addEventListener('change', sync, { signal }); }
    clear.addEventListener('click', () => { for (const b of boxes) b.checked = false; sync(); }, { signal });
    sync();
  }

  // the "Progress check" commands: copy, with a moment of "Copied"
  for (const btn of document.querySelectorAll<HTMLButtonElement>('.cq-find .copy')) {
    let timer = 0;
    btn.addEventListener('click', async () => {
      const code = btn.parentElement!.querySelector('code')!;
      try { await navigator.clipboard.writeText(code.textContent!); }
      catch { code.closest('details')!.open = true; getSelection()?.selectAllChildren(code); return; }   // no clipboard access: show and select it, ready for Ctrl+C
      btn.classList.add('done');
      clearTimeout(timer);
      timer = window.setTimeout(() => btn.classList.remove('done'), 1600);
    }, { signal });
  }

  levelBar(bar, 'quests:v1', signal, (c) => {
    let open = 0;
    for (const card of cards) {
      const from = +card.dataset.level!, ok = c.level >= from;
      if (ok) open++;
      card.classList.toggle('locked', !ok);
      card.querySelector('.cq-state')!.textContent = ok ? 'You can start this' : `From level ${from}`;
      for (const r of card.querySelectorAll<HTMLElement>('.cq-route')) r.hidden = c.fac !== 'b' && r.dataset.side !== 'C' && r.dataset.side !== c.fac;
    }
    for (const a of links) a.classList.toggle('locked', c.level < +a.dataset.level!);
    const later = cards.map((card) => +card.dataset.level!).filter((lv) => lv > c.level);
    count.textContent = `${open} of ${cards.length} open at level ${c.level}` + (later.length ? `, next at ${Math.min(...later)}` : '');
  });
});
