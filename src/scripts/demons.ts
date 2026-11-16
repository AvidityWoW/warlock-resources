// Demon spells page: your level marks each spell rank as known-able, next or later, and each card's heading says how many
// ranks the demon can know and what their grimoires cost. A demon you can't summon yet is dimmed.
import { levelBar, onPage } from '../lib/levelbar';
import { money } from '../data/spellbook';

onPage('dm-bar', (bar, signal) => {
  const cards = [...document.querySelectorAll<HTMLElement>('.dm-card')];
  levelBar(bar, 'demons:v1', signal, (c) => {
    for (const card of cards) {
      const rows = [...card.querySelectorAll<HTMLTableRowElement>('tbody tr[data-level]')], from = +card.dataset.level!;
      const next = Math.min(...rows.map((r) => +r.dataset.level!).filter((lv) => lv > c.level));
      let have = 0, cost = 0;
      for (const r of rows) {
        const lv = +r.dataset.level!;
        r.classList.toggle('have', lv <= c.level);
        r.classList.toggle('next', lv === next);
        if (lv <= c.level) { have++; cost += +r.dataset.price!; }
      }
      card.classList.toggle('locked', c.level < from);
      card.querySelector('.dm-count')!.textContent = c.level < from ? `· from level ${from}`
        : `· ${have} of ${rows.length} ranks by level ${c.level}` + (cost ? `, ${money(cost)} of grimoires` : '');
    }
  });
});
