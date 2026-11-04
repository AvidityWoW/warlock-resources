// Macro text: stone ranks by level, and syntax colouring. Shared by the macros page (built with level 60) and its
// script (which redraws the stone macros when you change the level), so both draw them the same way.

/** the game's limit on a macro's length */
export const LIMIT = 255;
export const MAX_LEVEL = 60;

// Each stone's ranks: [level the Create spell's rank is learned, rank word of the stone it makes]. An empty word is the
// plain rank ("Healthstone"). The Create spell itself has one name for every rank ("Create Healthstone").
const STONES: Record<string, [number, string][]> = {
  Healthstone: [[10, 'Minor'], [22, 'Lesser'], [34, ''], [46, 'Greater'], [58, 'Major']],
  Soulstone: [[18, 'Minor'], [30, 'Lesser'], [40, ''], [50, 'Greater'], [60, 'Major']],
  Spellstone: [[36, ''], [48, 'Greater'], [60, 'Major']],
  Firestone: [[28, 'Lesser'], [36, ''], [46, 'Greater'], [56, 'Major']],
};

/** the best rank of a stone at this level (the first rank if you're too low for any) */
export function stoneRank(stone: string, level: number): [number, string] {
  const ranks = STONES[stone];
  let best = ranks[0];
  for (const r of ranks) if (level >= r[0]) best = r;
  return best;
}

const TOKEN = /\{(item|create):(\w+)\}/g;
/** dropdown choices by token, e.g. { spell: 'Fear(Rank 1)' } */
export type Picked = Record<string, string>;
/** a dropdown choice meaning "leave this out": every line using that dropdown is dropped (an empty choice just inserts nothing) */
export const SKIP = '-';
/** a stone token, even one whose stone comes from a dropdown ({item:{stone}}) */
export const usesStones = (body: string) => /\{(item|create):/.test(body);
/** a dropdown choice's menu label and macro text */
export const choice = (c: string | [string, string]): [string, string] => (typeof c === 'string' ? [c, c] : c);
/** the body with each {token} replaced by its dropdown choice */
const withPicks = (body: string, picked: Picked) => body.replace(/\{(\w+)\}/g, (m, k: string) => (k in picked ? picked[k] : m));
/** the stones a macro uses (after its dropdowns), in order, without repeats */
export const stonesIn = (body: string, picked: Picked = {}) => [...new Set([...withPicks(body, picked).matchAll(TOKEN)].map((m) => m[2]))];

/** the macro as it goes in the game: dropdown choices filled in, stone names for this level, and any line using a
 *  dropdown set to SKIP ("None") dropped */
export function fill(body: string, level: number, picked: Picked = {}): string {
  const kept = body.split('\n').filter((line) => ![...line.matchAll(/\{(\w+)\}/g)].some((m) => picked[m[1]] === SKIP)).join('\n');
  return withPicks(kept, picked).replace(TOKEN, (_, how: string, stone: string) => {
    if (!STONES[stone]) return stone;
    const [, rank] = stoneRank(stone, level);
    if (how === 'item') return rank ? `${rank} ${stone}` : stone;
    return `Create ${stone}`;   // casts the highest rank you know
  });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const span = (cls: string, s: string) => (s ? `<span class="${cls}">${esc(s)}</span>` : '');
const CHAT = new Set(['/s', '/say', '/p', '/party', '/raid', '/ra', '/rw', '/y', '/yell', '/g', '/guild', '/e', '/emote', '/w', '/whisper', '/i', '/instance']);

/** filled macro text → HTML with each part in a span: directives, commands, [conditions], ; separators, chat, Lua */
export function highlight(text: string): string {
  return text.split('\n').map((line) => {
    const directive = line.match(/^(#\S+)(.*)$/);
    if (directive) return span('m-dir', directive[1]) + span('m-arg', directive[2]);
    const cmd = line.match(/^(\/\S+)(.*)$/);
    if (!cmd) return esc(line);
    const [, name, rest] = cmd;
    const lower = name.toLowerCase();
    if (lower === '/run' || lower === '/script') return span('m-cmd', name) + span('m-lua', rest);
    if (CHAT.has(lower)) return span('m-cmd', name) + span('m-chat', rest);
    // the rest: [conditions], ; between clauses, and the spell or item names in between
    const parts = rest.match(/\[[^\]]*\]|;|[^[;]+/g) ?? [];
    return span('m-cmd', name) + parts.map((p) => (p[0] === '[' ? span('m-cond', p) : p === ';' ? span('m-sep', p) : span('m-arg', p))).join('');
  }).join('\n');
}
