// Text with links in it, for data files: "[Name](item:123)" becomes a Wowhead Forever link (item, spell, quest or npc).
// Everything else is escaped, so the result is safe for set:html.
import { wowhead } from '../data/gear';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const rich = (text: string) =>
  esc(text).replace(/\[([^\]]+)\]\((item|spell|quest|npc):(\d+)\)/g,
    (_, name, type, id) => `<a class="link" href="${wowhead(type, +id)}" target="_blank" rel="noopener">${name}</a>`);
