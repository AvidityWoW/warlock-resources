// Consumes page: your level dims the rows you can't use yet (or hides them, with "Only what I can use"), and each card's
// heading counts what's usable.
import { levelBar, onPage } from '../lib/levelbar';

onPage('cs-bar', (bar, signal) => {
  const cards = [...document.querySelectorAll<HTMLElement>('.cs-card')];
  levelBar(bar, 'consumes:v1', signal, (c) => {
    for (const card of cards) {
      const rows = [...card.querySelectorAll<HTMLTableRowElement>('tbody tr[data-level]')];
      let have = 0;
      for (const r of rows) {
        const ok = +r.dataset.level! <= c.level;
        if (ok) have++;
        r.classList.toggle('have', ok);
        r.hidden = !!c.only && !ok;
      }
      for (const body of card.querySelectorAll('tbody')) body.hidden = !body.querySelector('tr[data-level]:not([hidden])');   // a buff with nothing usable goes too
      card.querySelector('.cs-count')!.textContent = `· ${have} of ${rows.length} at level ${c.level}`;
      card.classList.toggle('cs-none', !!c.only && !have);
    }
  });
});
