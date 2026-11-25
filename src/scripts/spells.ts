// Spells page: your level marks each row as had, next (the next level that brings something) or later; the tree buttons and
// "Hide below my level" filter the rows. Choices are kept by lib/levelbar.ts (spells:v1).
import { levelBar, onPage } from '../lib/levelbar';

onPage('sp-bar', (bar, signal) => {
  const card = document.querySelector<HTMLElement>('.sp-card')!;
  const rows = [...card.querySelectorAll<HTMLTableRowElement>('tbody tr')];
  const count = document.getElementById('sp-count')!, scroll = card.querySelector<HTMLElement>('.tscroll')!, empty = card.querySelector<HTMLElement>('.empty')!;

  levelBar(bar, 'spells:v1', signal, (c) => {
    const picked = rows.filter((r) => (c.tree === 'all' || r.dataset.tree === c.tree || r.dataset.tree === 'Mount'));
    const next = Math.min(...picked.map((r) => +r.dataset.level!).filter((lv) => lv > c.level));   // Infinity at the end
    let have = 0, shown = 0, last = 0;
    for (const r of rows) {
      const lv = +r.dataset.level!, on = picked.includes(r) && !(c.ahead && lv < c.level);
      r.hidden = !on;
      r.classList.toggle('have', lv <= c.level);
      r.classList.toggle('next', lv === next);
      if (!on) continue;
      r.classList.toggle('top', lv !== last);   // a rule above the first row of each level
      r.classList.toggle('odd', shown % 2 === 0);
      last = lv;
      shown++;
    }
    for (const r of picked) if (+r.dataset.level! <= c.level) have++;
    count.textContent = `· ${have} of ${picked.length} by level ${c.level}` + (Number.isFinite(next) ? `, more at ${next}` : '');
    scroll.hidden = !shown;
    empty.hidden = !!shown;
  });
});
