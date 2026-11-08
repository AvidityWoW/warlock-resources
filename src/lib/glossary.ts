// Glossary helpers: entry ids, sorting, and turning a definition's [[links]] and `code` into HTML (at build time).
import { TERMS, type Term } from '../data/glossary';
import { url } from './url';

/** an entry's anchor: #t-shp, #t-hot-spell, #t-cqs */
export const termId = (t: Term) => 't-' + t.term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** the letter an entry files under: its first letter, or # for /cast, @mouseover and #showtooltip */
export const letterOf = (t: Term) => /^[a-z]/i.test(t.term) ? t.term[0].toUpperCase() : '#';

/** A to Z, ignoring case and leading symbols; # (slash commands and the like) first */
export const sorted = [...TERMS].sort((a, b) => {
  const la = letterOf(a), lb = letterOf(b);
  if (la !== lb) return la === '#' ? -1 : lb === '#' ? 1 : la.localeCompare(lb);
  return a.term.replace(/^[^a-z0-9]+/i, '').localeCompare(b.term.replace(/^[^a-z0-9]+/i, ''), 'en', { sensitivity: 'base' });
});

// link lookup: a term wins; an alias is fine if only one entry has it
const key = (s: string) => s.toLowerCase();
const byTerm = new Map(TERMS.map((t) => [key(t.term), t]));
const byAlias = new Map<string, Term[]>();
for (const t of TERMS) for (const a of t.also ?? []) byAlias.set(key(a), [...(byAlias.get(key(a)) ?? []), t]);
const ids = new Set<string>();
for (const t of TERMS) {
  if (byTerm.get(key(t.term)) !== t || ids.has(termId(t))) throw new Error(`glossary: "${t.term}" is listed twice, or shares its anchor`);
  ids.add(termId(t));
}

const find = (name: string, from: Term) => {
  const t = byTerm.get(key(name));
  if (t) return t;
  const hits = byAlias.get(key(name)) ?? [];
  if (hits.length === 1) return hits[0];
  throw new Error(`glossary: [[${name}]] in "${from.term}" ${hits.length ? `could be ${hits.map((h) => h.term).join(' or ')}` : 'matches no entry'}`);
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** a definition as HTML: [[Term]] / [[Term|text]] become links to entries, [[/page/|text]] to a page, `x` code */
export const render = (t: Term) => t.def.split(/(\[\[[^\]]+\]\]|`[^`]+`)/).map((part) => {
  if (part.startsWith('`')) return `<code>${esc(part.slice(1, -1))}</code>`;
  if (!part.startsWith('[[')) return esc(part);
  const [target, text] = part.slice(2, -2).split('|');
  if (target.startsWith('/')) return `<a href="${esc(url(target))}">${esc(text ?? target)}</a>`;
  const to = find(target, t);
  return `<a class="xref" href="#${termId(to)}">${esc(text ?? target)}</a>`;
}).join('');

/** the words a definition shows, for search (links reduced to their text) */
export const plain = (t: Term) => t.def.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1').replace(/`/g, '');
