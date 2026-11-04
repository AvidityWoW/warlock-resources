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
/** the body with each {token} replaced by its dropdown choice; a choice may hold another token (the trinket lines
 *  carry {mod}), so it runs until nothing changes */
const withPicks = (body: string, picked: Picked) => {
  for (let i = 0; i < 3; i++) {
    const next = body.replace(/\{(\w+)\}/g, (m, k: string) => (k in picked ? picked[k] : m));
    if (next === body) break;
    body = next;
  }
  return body;
};
/** the stones a macro uses (after its dropdowns), in order, without repeats */
export const stonesIn = (body: string, picked: Picked = {}) => [...new Set([...withPicks(body, picked).matchAll(TOKEN)].map((m) => m[2]))];

/** how fill() sets {cqs} by itself: cooldown dropdown → the dropdown holding its modifier (e.g. potion → pmod), and the
 *  dropdown holding the filler spell, if any */
export interface CqsFrom { parts: Record<string, string>; filler?: string }

/** {cqs} from the cooldowns in use: every press if any of them fires every press, else on their modifiers ("or"),
 *  and left out when no cooldown is picked. Keeps the delay off unmodified presses whenever the cooldowns sit on a key. */
function autoCqs(picked: Picked, from: CqsFrom): string {
  const conds = Object.entries(from.parts).filter(([part]) => picked[part] !== undefined && picked[part] !== SKIP).map(([, mod]) => (picked[mod] ?? '').trim());
  if (!conds.length) return SKIP;
  if (conds.includes('')) return '';
  // the shortest condition covering them all: [mod] takes in any single key, several keys merge into [mod:shift/ctrl],
  // all three are [mod], and a modifier plus [nomod] covers every press
  const keys = new Set<string>();
  let anyMod = false, noMod = false;
  for (const c of conds) {
    if (c === '[mod]') anyMod = true;
    else if (c === '[nomod]') noMod = true;
    else for (const k of (c.match(/^\[mod:([a-z/]+)\]$/)?.[1] ?? '').split('/').filter(Boolean)) keys.add(k);
  }
  if (keys.size >= 3) anyMod = true;
  if (noMod && (anyMod || keys.size)) return '';
  const mod = anyMod ? '[mod]' : keys.size ? `[mod:${['shift', 'ctrl', 'alt'].filter((k) => keys.has(k)).join('/')}]` : '';
  return ' ' + mod + (noMod ? '[nomod]' : '');
}

/** the filler spell when /cqs would run on unmodified presses (every press, or [nomod]) and slow every cast of it, for a
 *  warning; else null */
export function cqsSlowsFiller(picked: Picked, from?: CqsFrom): string | null {
  if (!from?.filler) return null;
  const spell = picked[from.filler], cqs = autoCqs(picked, from);
  return (cqs === '' || cqs.includes('[nomod]')) && spell && spell !== SKIP ? spell : null;
}

/** the macro as it goes in the game: dropdown choices filled in, stone names for this level, and any line using a
 *  dropdown set to SKIP ("None") dropped. A #showtooltip line isn't dropped but left plain, so the button still shows
 *  whatever the macro will do first. */
/** values worked out from other controls rather than picked: {cqs} (see autoCqs) and a castsequence's {reset}, from a
 *  seconds box and reset checkboxes ("reset=8/target/combat ", or nothing when neither is set) */
export interface Derive { cqs?: CqsFrom; reset?: { secs: string; on: string } }

export function fill(body: string, level: number, picked: Picked = {}, derive?: Derive): string {
  if (derive?.cqs) picked = { ...picked, cqs: autoCqs(picked, derive.cqs) };
  if (derive?.reset) {
    const secs = (picked[derive.reset.secs] ?? '').trim();
    const parts = [/^\d+(\.\d+)?$/.test(secs) && +secs > 0 ? String(+secs) : '', ...(picked[derive.reset.on] ?? '').split('/')].filter(Boolean);
    picked = { ...picked, reset: parts.length ? `reset=${parts.join('/')} ` : '' };
  }
  const skips = (line: string) => [...line.matchAll(/\{(\w+)\}/g)].some((m) => picked[m[1]] === SKIP);
  const kept = body.split('\n').flatMap((line) => (!skips(line) ? [line] : line.startsWith('#showtooltip') ? ['#showtooltip'] : [])).join('\n');
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
