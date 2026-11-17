// Wrack and your DoTs: while you channel Wrack (6 s), your Corruption, Siphon Life and Bane of Agony on the target tick
// twice as often. How, from two combat logs (2026-11-11, fifteen fights): each DoT keeps its own ticks, one every period
// from when it went on, whatever Wrack does; while Wrack channels it also ticks halfway between them. Its duration doesn't
// change, so its last own tick still lands as it runs out, and a channel adds one tick per halfway point it covers.
// (Of 107 halfway points inside a channel, 103 ticked; the 4 that didn't were within 0.2 s of the channel's edge, where
// the server's tick timing blurs it.)
// The timeline puts the DoTs on one global cooldown apart, in the order picked (Corruption, Siphon Life, Bane of Agony by
// default, Corruption taken as instant), then up to four Wracks, none overlapping and each at least one GCD after the cast
// before it.
// Each DoT can be recast once. Recasts in Forever are lossy, with no pandemic or rollover: the one before ends on the spot,
// its remaining ticks lost, and the new one starts over, its first tick a period later (Agony back at x0.5). A recast is a
// cast like any other, a GCD clear of the rest, and one during a channel cuts it off.
import { ranked, type Rank } from '../data/coefficient-ranks';
import { cells, rankAt, CAP } from '../scripts/coefficient-detail';

export const CHANNEL = 6;     // seconds
export const GCD = 1.5;
export const WRACK_LEVEL = 40;
export const MAX_WRACKS = 4;
export const LAST_START = 34; // the latest a Wrack can start on the timeline (a full channel still fits before 40 s)
export const MAX_HASTE = 15;  // percent
/** the server's batch window (seconds), with the options on (/wrack/batched/): a DoT tick in a channel's first 10 ms
 *  (start), its last (end; Wrack's own last tick still lands), or the 10 ms around a recast straight after the channel
 *  before, 5 ms either side (between), isn't switched on */
export const BATCH = 0.01;
/** Wrack's start and length move in thousandths of a second */
export const STEP = 0.001;

// Haste (h, a fraction: 0.1 for 10%) speeds up the global cooldown and cast times, nothing else: the GCD is
// 1.5 s / (1 + h), never under 1 s (which takes 50%, so not on this page). Channels and DoTs don't change: Wrack still
// runs 6 s and ticks each second, and the DoTs keep their period and duration. Every spell here is instant, so haste only
// packs the casts closer: the DoTs going on sooner after each other, and Wrack sooner after them and after each other.
/** the global cooldown at a haste */
export const gcdAt = (h = 0) => Math.max(1, GCD / (1 + h));
/** how many times a channel that ran len seconds ticked: once for each full second */
const ticksIn = (len: number) => Math.floor(len + 1e-9);

/** the DoTs Wrack speeds up, by their key in the rank data, in the default order they're cast (one GCD apart) */
export const DOT_KEYS = ['Corruption', 'Siphon Life', 'Bane of Agony'] as const;
/** Wrack's default start times: straight after the DoTs, then back to back */
export const defaultStarts = (h = 0) => Array.from({ length: MAX_WRACKS }, (_, i) => +(Math.ceil(DOT_KEYS.length * gcdAt(h) / STEP - 1e-6) * STEP + i * CHANNEL).toFixed(3));
export const DEFAULT_STARTS = defaultStarts(0);

/** a channel, from and to (seconds); the page keeps them in order and apart */
export type Win = readonly [number, number];
/** the first of some casts (cuts: the DoT recasts) that comes after t, or Infinity */
const nextCut = (t: number, cuts: number[]) => Math.min(Infinity, ...cuts.filter((c) => c > t + 1e-9));
/** the channels as they run: each for its length, unless the next Wrack or a DoT recast (cuts) is cast before it ends,
 *  which cuts it off there */
export const windowsOf = (starts: number[], durs: number[], cuts: number[] = []): Win[] =>
  starts.map((a, i) => [a, Math.min(a + (durs[i] ?? CHANNEL), starts[i + 1] ?? Infinity, nextCut(a, cuts))] as const);
/** how long Wrack i actually channels, after any recast cuts it short */
export const ranFor = (starts: number[], durs: number[], i: number, cuts: number[] = []) => { const [a, b] = windowsOf(starts, durs, cuts)[i]; return +(b - a).toFixed(3); };
/** which channel a moment falls in (its place in the list), or -1 */
const channelOf = (t: number, wins: Win[]) => wins.findIndex(([a, b]) => t >= a - 1e-9 && t < b - 1e-9);   // from its start, up to its end
const inChannel = (t: number, wins: Win[]) => channelOf(t, wins) >= 0;

/** stage: Bane of Agony's ramp step, 0 (x0.5), 1 (x1) or 2 (x1.5); channel: which Wrack it landed in, or -1 */
export interface Tick { t: number; amount: number; boosted: boolean; extra: boolean; channel: number; stage?: number;
  /** one of the ticks Wrack adds, halfway between two of the DoT's own (which never move) */
  added?: boolean }
/** one application of a DoT: cast at on, cut off at off (by a recast), or run out there (off === end) */
export interface App { on: number; off: number; end: number }
/** one of its own ticks a recast threw away */
export interface Lost { t: number; amount: number; stage?: number; by: number }
export interface DotLine {
  key: string; name: string; rank: number; learned: boolean; period: number; duration: number;
  /** when it first goes on (one GCD after the one before) and when it finally runs out */
  on: number; off: number;
  /** each time it's cast, the first and then any recast */
  apps: App[];
  /** the ticks the recast cut off, where they would have landed */
  lost: Lost[];
  /** its ticks with Wrack, and where they land without it */
  ticks: Tick[]; normal: number[];
  /** its sub-ticks: the halfway points between its own ticks, which only tick while a Wrack channels over them */
  subs: number[];
  totalNormal: number; totalWrack: number;
  /** ticks and damage that land during the channels, without and with Wrack */
  inNormal: number; inWrack: number; ticksNormal: number; ticksWrack: number;
  /** ticks in all with Wrack */
  count: number;
}
export interface WrackLine { rank: Rank; learned: boolean; perTick: number; total: number }

const num = (t: string) => t.split('/').map(Number);

/** the highest rank learned at a level (or rank 1 if none yet, at its base damage) */
function rankFor(key: string, level: number) {
  const s = ranked.find((x) => x.key === key)!;
  const i = rankAt(s.forever, level);
  return { s, i: Math.max(i, 0), learned: i >= 0 };
}

/** a DoT's period and duration (seconds) at a level */
export function dotTiming(key: string, level: number) {
  const { s, i } = rankFor(key, level), r = s.forever[i];
  return { period: (r.period ?? 0) / 1000, duration: (r.dur ?? 0) / 1000 };
}

/** ons: when it's cast, first and then any recast, in order. missed: a halfway point inside a channel that still doesn't
 *  tick (the 10 ms batch, on /wrack/batched/) */
export function dotLine(key: string, level: number, sp: number, wins: Win[], ons: number[], missed: (t: number) => boolean = () => false): DotLine {
  const { s, i, learned } = rankFor(key, level);
  const r = s.forever[i], c = cells(r, level, sp, s.agony);
  const period = (r.period ?? 0) / 1000, duration = (r.dur ?? 0) / 1000, n = r.ticks;
  // each cast runs its full duration, or until the next one cuts it off (a tick landing on the recast's moment still counts)
  const apps: App[] = ons.map((on, j) => ({ on, end: on + duration, off: Math.min(on + duration, ons[j + 1] ?? Infinity) }));
  // Bane of Agony's three stages (x0.5 / x1 / x1.5 base, each with the full spell-power share) go by time since it went
  // on (since its latest cast): a third of its duration each (8 s), a tick on a boundary counting in the earlier one, so
  // without Wrack it's ticks 1-4, 5-8 and 9-12. With Wrack a tick takes the stage of the moment it lands in.
  const amounts = s.agony ? num(c.perTick) : [Number(c.perTick)];
  const stage = (t: number, on: number) => Math.min(2, Math.max(0, Math.ceil((t - on) / (duration / 3) - 1e-9) - 1));
  const amount = (t: number, on: number) => (s.agony ? amounts[stage(t, on)] : amounts[0]);
  const st = (t: number, on: number) => (s.agony ? { stage: stage(t, on) } : {});
  const normalTicks: { t: number; amount: number }[] = [], ticks: Tick[] = [], lost: Lost[] = [], subs: number[] = [];
  for (const { on, off } of apps) {
    for (let k = 1; k <= n; k++) {
      const own = on + k * period, half = on + (k - 0.5) * period;
      // with Wrack: its own ticks, where they always are, and a tick halfway before each one that lands while Wrack channels
      if (half <= off + 1e-9) {
        subs.push(half);
        const channel = channelOf(half, wins);
        if (channel >= 0 && !missed(half))
          ticks.push({ t: half, amount: amount(half, on), boosted: true, channel, added: true, extra: true, ...st(half, on) });
      }
      if (own > off + 1e-9) { lost.push({ t: own, amount: amount(own, on), by: off, ...st(own, on) }); continue; }
      const channel = channelOf(own, wins);
      normalTicks.push({ t: own, amount: amount(own, on) });
      ticks.push({ t: own, amount: amount(own, on), boosted: channel >= 0, channel, added: false, extra: false, ...st(own, on) });
    }
  }
  const total = (xs: { amount: number }[]) => xs.reduce((a, x) => a + x.amount, 0);
  const inNormal = normalTicks.filter((x) => inChannel(x.t, wins)), inWrack = ticks.filter((x) => x.boosted);
  return {
    key, name: s.name, rank: i + 1, learned, period, duration, on: ons[0], off: apps[apps.length - 1].off, apps, lost,
    ticks, normal: normalTicks.map((x) => x.t), subs,
    totalNormal: total(normalTicks), totalWrack: total(ticks),
    inNormal: total(inNormal), inWrack: total(inWrack), ticksNormal: inNormal.length, ticksWrack: inWrack.length, count: ticks.length,
  };
}

const snap = (x: number) => Math.round(x / STEP) / (1 / STEP);
// the bounds of a cast go on the same 0.001 s grid, so the number boxes step along it: a GCD after the cast before, rounded up
const up = (x: number) => +(Math.ceil(x / STEP - 1e-6) * STEP).toFixed(3), down = (x: number) => +(Math.floor(x / STEP + 1e-6) * STEP).toFixed(3);
/** the earliest the first Wrack can go: one GCD after the last DoT is cast */
export const firstStart = (h = 0) => up(DOT_KEYS.length * gcdAt(h));
export const FIRST_START = firstStart(0);
/** the earliest Wrack i can be cast: one GCD after the one before. Recast during that one's channel, it cuts it off. */
export const earliest = (starts: number[], i: number, h = 0) => (i ? up(starts[i - 1] + gcdAt(h)) : firstStart(h));
/** the latest Wrack i can be cast: one GCD before the next (which cuts its channel off if it comes first) */
export const latest = (starts: number[], i: number, h = 0) => (i < starts.length - 1 ? down(starts[i + 1] - gcdAt(h)) : LAST_START);
/** the longest Wrack i can be set to channel: a full channel, or the gap before the next cast (a Wrack or a recast, cuts) */
export const longest = (starts: number[], i: number, cuts: number[] = []) =>
  +Math.min(CHANNEL, (i < starts.length - 1 ? starts[i + 1] : Infinity) - starts[i], nextCut(starts[i], cuts) - starts[i]).toFixed(3);

/** the nearest moment to t, on the 0.001 s grid, from lo to hi and a GCD (g) clear of every other cast; null if none is */
export function fit(t: number, others: number[], lo: number, hi: number, g: number) {
  const ok = (x: number) => x >= lo - 1e-9 && x <= hi + 1e-9 && others.every((c) => Math.abs(x - c) >= g - 1e-6);
  const x = snap(t);
  if (ok(x)) return +x.toFixed(3);
  const near = [lo, hi, ...others.flatMap((c) => [up(c + g), down(c - g)])].filter(ok);
  return near.length ? near.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a)) : null;
}

/** move one Wrack's cast, in 0.001 s steps, at least a GCD after the one before and before the one after (it stops there
 *  rather than pushing them), and a GCD clear of any recast (rec), hopping over one to the other side.
 *  Its own length is kept: a channel the next cast cuts off grows back if it moves away. */
export function settle(starts: number[], moved: number, to: number, h = 0, rec: number[] = []) {
  const out = [...starts];
  out[moved] = fit(to, rec, earliest(out, moved, h), latest(out, moved, h), gcdAt(h)) ?? out[moved];
  return out;
}
/** change one Wrack's duration, 0.5 s to a full channel in 0.001 s steps, no longer than the gap before the next cast */
export function lengthen(starts: number[], durs: number[], i: number, to: number, rec: number[] = []) {
  const out = [...durs];
  out[i] = +Math.min(longest(starts, i, rec), Math.max(MIN_DUR, snap(to))).toFixed(3);
  return out;
}
export const MIN_DUR = 0.5;
/** drag a Wrack's left side: its cast moves, the end of its channel stays put (so it channels longer or shorter), from a
 *  GCD after the cast before (cutting a Wrack off) to 0.5 s before its end, and no more than 6 s before it */
export function resizeStart(starts: number[], durs: number[], i: number, to: number, h = 0, rec: number[] = []) {
  const g = gcdAt(h), end = windowsOf(starts, durs, rec)[i][1];
  // a GCD clear of the recasts either side of the channel
  const lo = Math.max(earliest(starts, i, h), end - CHANNEL, ...rec.filter((c) => c < end - 1e-9).map((c) => up(c + g)));
  const hi = Math.min(end - MIN_DUR, latest(starts, i, h), ...rec.filter((c) => c >= end - 1e-9).map((c) => down(c - g)));
  const start = Math.min(hi, Math.max(lo, snap(to)));
  const s2 = [...starts], d2 = [...durs];
  s2[i] = +start.toFixed(3); d2[i] = +(end - start).toFixed(3);
  return { starts: s2, durs: d2 };
}
/** after the haste changes (from was to h): each Wrack moved later if it's now inside the GCD of the cast before, or all
 *  of them back to their defaults if that pushes the last past the end of the timeline */
export function refit(starts: number[], h = 0, was = 0) {
  const out = [...starts];
  // one cast right after the one before (as early as it could go) stays right after it
  for (let i = 0; i < out.length; i++)
    out[i] = Math.abs(starts[i] - earliest(starts, i, was)) < 1e-6 ? earliest(out, i, h) : Math.max(out[i], earliest(out, i, h));
  return out[out.length - 1] <= LAST_START ? out : defaultStarts(h).slice(0, out.length);
}

/** each DoT's recast, by its key (one each at most); a time, or missing for none */
export type Recasts = Partial<Record<string, number>>;
/** the latest a recast can go */
export const RECAST_LAST = 38;
/** put one DoT's recast at t, or as near as it can go: after the opening casts, by RECAST_LAST, a GCD clear of the Wracks
 *  and the other recasts; null if there's no room */
export const placeRecast = (t: number, starts: number[], rec: Recasts, key: string, h = 0) =>
  fit(t, [...starts, ...Object.entries(rec).filter(([k, x]) => k !== key && x != null).map(([, x]) => x!)], firstStart(h), RECAST_LAST, gcdAt(h));
/** after the Wracks move (more of them, or the haste): each recast moved to the nearest place still free, or dropped */
export function refitRecasts(rec: Recasts, starts: number[], h = 0) {
  const out: Recasts = {};
  for (const [k, t] of Object.entries(rec)) {
    if (t == null) continue;
    const at = placeRecast(t, starts, out, k, h);
    if (at != null) out[k] = at;
  }
  return out;
}
/** the recasts' times, in no particular order */
export const recastTimes = (rec: Recasts | undefined) => Object.values(rec ?? {}).filter((x): x is number => x != null);

export function wrackLine(level: number, sp: number): WrackLine {
  const { s, i } = rankFor('Wrack', level);
  const r = s.forever[i], c = cells(r, level, sp);
  return { rank: r, learned: level >= r.learn, perTick: Number(c.perTick), total: Number(c.damage) };
}

export { CAP };

/* ---------- the timeline drawing: one SVG, coloured by classes in wrack.css so it follows the theme ---------- */

const W = 800, LABEL = 172, RIGHT = 38, ROW = 52, TOP = 30, AXIS = 30;
const SPAN = 40;   // seconds shown
/** the drawing's layout, for turning a point on it back into a time (dragging the channel) */
export const GEOM = { W, LABEL, RIGHT, SPAN, ROW };

export function timeline(wins: Win[], dots: DotLine[], wrackTick: number, missWhy: (t: number) => string | undefined = () => undefined) {
  const starts = wins.map((w) => w[0]);
  const x = (t: number) => LABEL + (Math.min(t, SPAN) / SPAN) * (W - LABEL - RIGHT);
  const rows = 1 + dots.length, H = TOP + rows * ROW + AXIS;
  const y = (row: number) => TOP + row * ROW + ROW / 2;
  const f = (n: number) => +n.toFixed(1);
  const secs = (t: number) => `${+t.toFixed(3)} s`;
  let g = '', hits = '';
  // a tick's mark: a circle, or for Bane of Agony one shape per ramp step (circle x0.5, square x1, diamond x1.5)
  const mark = (cx: number, cy: number, r: number, cls: string, stage?: number) => {
    if (stage === 1) return `<rect class="${cls}" x="${f(cx - r * 0.9)}" y="${f(cy - r * 0.9)}" width="${f(r * 1.8)}" height="${f(r * 1.8)}" rx="1"/>`;
    if (stage === 2) { const d = r * 1.3; return `<polygon class="${cls}" points="${f(cx)},${f(cy - d)} ${f(cx + d)},${f(cy)} ${f(cx)},${f(cy + d)} ${f(cx - d)},${f(cy)}"/>`; }
    return `<circle class="${cls}" cx="${f(cx)}" cy="${f(cy)}" r="${r}"/>`;
  };
  // its number, under it
  // (w: the Wrack whose colour it takes, -2 for an added tick in the accent, -1 for a plain one)
  const label = (cx: number, cy: number, n: number, w: number) => `<text class="wr-num${w !== -1 ? ` on${w >= 0 ? ` wr-w${w}` : ''}` : ''}" x="${f(cx)}" y="${f(cy + 19)}" text-anchor="middle">${n}</text>`;
  const STAGE = ['×0.5', '×1', '×1.5'];
  // each tick gets a bigger, invisible target on top that carries its mouseover label (scripts/wrack.ts shows it)
  const hit = (cx: number, cy: number, tip: string) => { hits += `<circle class="wr-hit" cx="${f(cx)}" cy="${cy}" r="10" data-tip="${tip}"/>`; };
  // each channel, shaded down every row, with a handle on top to drag it (the whole window drags too)
  const many = starts.length > 1;
  starts.forEach((start, w) => {
    const wx = x(start), ww = x(wins[w][1]) - x(start), hx = wx + ww / 2;
    g += `<rect class="wr-window wr-w${w}" data-drag="${w}" x="${f(wx)}" y="${TOP}" width="${f(ww)}" height="${rows * ROW}" rx="6"/>`;
    // its two sides: drag them in or out to change how long it channels (under the tick targets, which win where they meet)
    for (const [side, ex] of [['l', wx], ['r', wx + ww]] as const)
      g += `<rect class="wr-edge wr-w${w}" data-edge="${w}" data-side="${side}" x="${f(ex - 5)}" y="${TOP}" width="10" height="${rows * ROW}"><title>Drag to ${side === 'l' ? 'start sooner or later' : 'channel longer or shorter'}</title></rect>`;
    g += `<g class="wr-handle wr-w${w}" data-drag="${w}"><rect class="wr-grab" x="${f(hx - 30)}" y="${TOP - 30}" width="60" height="30"/><rect x="${f(hx - 22)}" y="${TOP - 22}" width="44" height="18" rx="9"/>`
      + (many ? `<text x="${f(hx)}" y="${TOP - 9}" text-anchor="middle">${w + 1}</text>`
        : [-5, 0, 5].map((d) => `<line x1="${f(hx + d)}" x2="${f(hx + d)}" y1="${TOP - 17}" y2="${TOP - 9}"/>`).join(''))
      + `<title>Drag to move Wrack${many ? ` ${w + 1}` : ''}</title></g>`;
  });
  // grid every 5 s
  for (let t = 0; t <= SPAN; t += 5) g += `<line class="wr-grid" x1="${f(x(t))}" x2="${f(x(t))}" y1="${TOP}" y2="${TOP + rows * ROW}"/>`;
  // Wrack: each channel's bar and its six ticks
  g += `<text class="wr-name" x="${LABEL - 12}" y="${y(0) + 5}" text-anchor="end">Wrack</text>`;
  starts.forEach((start, w) => {
    const n = ticksIn(wins[w][1] - start);   // a tick each full second of the channel
    g += `<rect class="wr-chan wr-w${w}" x="${f(x(start))}" y="${y(0) - 7}" width="${f(x(wins[w][1]) - x(start))}" height="14" rx="7"/>`;
    // how long it channels, over its tick dots
    g += `<text class="wr-dur wr-w${w}" x="${f((x(start) + x(wins[w][1])) / 2)}" y="${y(0) - 12}" text-anchor="middle">${+(wins[w][1] - start).toFixed(3)} s</text>`;
    for (let k = 1; k <= n; k++) {
      const t = start + k;
      g += `<circle class="wr-tick wr-own wr-w${w}" cx="${f(x(t))}" cy="${y(0)}" r="4"/>` + label(x(t), y(0), k, -1);
      hit(x(t), y(0), `Wrack${many ? ` ${w + 1}` : ''} · tick ${k} of ${n} · ${secs(t)} · ${wrackTick} damage`);
    }
  });
  dots.forEach((d, i) => {
    const row = i + 1, yy = y(row);
    // the name, with its cast number and a grip: drag the row up or down (or use the arrow keys on it) to cast it sooner or later
    g += `<g class="wr-row" data-row="${i}" tabindex="0" role="button" aria-label="${d.name}, cast ${i + 1} of ${dots.length}. Drag, or use the up and down arrow keys, to change the order">`
      + `<rect class="wr-rowhit" x="0" y="${yy - ROW / 2 + 4}" width="${LABEL - 4}" height="${ROW - 8}" rx="6"/>`
      + [-4, 0, 4].map((dy) => `<circle class="wr-grip" cx="9" cy="${yy + dy}" r="1.4"/><circle class="wr-grip" cx="14" cy="${yy + dy}" r="1.4"/>`).join('')
      + `<text class="wr-order" x="28" y="${yy + 5}">${i + 1}</text>`
      + `<text class="wr-name" x="${LABEL - 12}" y="${yy + 5}" text-anchor="end">${d.name}</text></g>`;
    // what a recast cut off goes in a faint lane just above the row, clear of the new one's ticks
    const ghost = yy - 14;
    // the recast's whole run is in the recast colour: its line, own ticks, notches and end (a tick on the recast's very
    // moment still belongs to the one before)
    const reOn = d.apps[1]?.on ?? Infinity, re = (t: number) => (t > reOn + 1e-9 ? ' wr-rerun' : '');
    d.apps.forEach((a, j) => {
      // its line while it runs; cut off by a recast, the rest it would have run is dashed, up in the lane
      g += `<line class="wr-run${j ? ' wr-rerun' : ''}" x1="${f(x(a.on))}" x2="${f(x(a.off))}" y1="${yy}" y2="${yy}"/>`;
      if (a.off < a.end - 1e-9) g += `<path class="wr-run wr-cut" d="M${f(x(a.off))} ${yy - 6}V${ghost}H${f(x(a.end))}"/>`;
      // where it runs out, under its last tick (unless that's past the end of the timeline)
      else if (a.end <= SPAN + 1e-9) g += `<line class="wr-endmark${j ? ' wr-rerun' : ''}" x1="${f(x(a.end))}" x2="${f(x(a.end))}" y1="${yy - 9}" y2="${yy + 9}"/>`;
      if (!j) {
        g += `<circle class="wr-cast" cx="${f(x(a.on))}" cy="${yy}" r="3"/>`;
        hit(x(a.on), yy, `${d.name} · cast at ${secs(a.on)} · runs ${secs(d.duration)}, to ${secs(a.end)}`);
        return;
      }
      // the recast: a ring to drag along the row
      const cut = d.lost.filter((l) => Math.abs(l.by - a.on) < 1e-9), was = d.apps[j - 1];
      g += `<g class="wr-recast" data-recast="${d.key}"><circle class="wr-grab" cx="${f(x(a.on))}" cy="${yy}" r="12"/>`
        + `<circle cx="${f(x(a.on))}" cy="${yy}" r="6"/><circle class="wr-recast-in" cx="${f(x(a.on))}" cy="${yy}" r="2"/></g>`;
      hit(x(a.on), yy, `${d.name} · recast at ${secs(a.on)} · runs to ${secs(a.end)}&#10;`
        + (cut.length ? `Cuts the one before off ${secs(was.end - a.on)} early: ${cut.length} tick${cut.length > 1 ? 's' : ''} lost (${+cut.reduce((s, l) => s + l.amount, 0).toFixed(1)} damage)`
          : 'Nothing lost: the one before had run out') + '&#10;Drag to move it');
    });
    // the ticks a recast threw away: faded, dashed, where they would have landed
    for (const l of d.lost) {
      if (l.t > SPAN + 1e-9) continue;
      g += mark(x(l.t), ghost, 3.2, 'wr-tick wr-lost', l.stage);
      hit(x(l.t), ghost,`${d.name} · lost tick · would have landed at ${secs(l.t)} for ${+l.amount.toFixed(1)} damage&#10;Cut off by the recast at ${secs(l.by)}`);
    }
    // its sub-ticks, halfway between its own: dormant notches, unless a Wrack channels over one and switches it on
    for (const t of d.subs) {
      if (t > SPAN + 1e-9) continue;   // past the end of the timeline
      if (d.ticks.some((q) => q.added && Math.abs(q.t - t) < 1e-6)) continue;
      // inside a channel but missed by the batch: a dotted hollow circle in the shade of the Wrack it fell in
      const late = channelOf(t, wins), why = late >= 0 ? missWhy(t) : undefined;
      if (why) {
        g += `<circle class="wr-miss wr-w${late}" cx="${f(x(t))}" cy="${yy}" r="5"/>`;
        hit(x(t), yy, `${d.name} · missed tick at ${secs(t)}&#10;${why}, so the batch misses it`);
        continue;
      }
      g += `<line class="wr-sub${re(t)}" x1="${f(x(t))}" x2="${f(x(t))}" y1="${yy - 5}" y2="${yy + 5}"/>`;
      hit(x(t), yy, `${d.name} · sub-tick at ${secs(t)}&#10;Dormant: it only ticks while Wrack channels over it`);
    }
    d.ticks.forEach((t, k) => {
      if (t.t > SPAN + 1e-9) return;   // a recast's ticks can run past the end of the timeline (they still count in the table)
      // a sub-tick a Wrack switched on is filled, glowing in that Wrack's colour; the DoT's own stay hollow, where they always are
      const cls = `wr-tick${t.added ? ` wr-fast wr-w${t.channel}` : re(t.t)}`;
      g += mark(x(t.t), yy, t.added ? 5 : 4, cls, t.stage) + label(x(t.t), yy, k + 1, t.added ? t.channel : -1);
      hit(x(t.t), yy, `${d.name} · tick ${k + 1} · ${secs(t.t)} · ${+t.amount.toFixed(1)} damage`
        + `${t.stage !== undefined ? ` (${STAGE[t.stage]} base)` : ''}${t.added ? ` · a sub-tick switched on by Wrack${many ? ` ${t.channel + 1}` : ''}` : ''}`);
    });
  });
  // the time axis
  const ay = TOP + rows * ROW + 18;
  for (let t = 0; t <= SPAN; t += 5) g += `<text class="wr-axis" x="${f(x(t))}" y="${ay}" text-anchor="middle">${t} s</text>`;
  g += hits;
  return `<svg class="wr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Timeline: your DoTs one GCD apart, Wrack channelled from ${starts.map((a) => `${a} s`).join(', ')}, and the ticks">${g}</svg>`;
}

/* ---------- the numbers under the timeline ---------- */

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const n0 = (n: number) => String(Math.round(n));

/** order: the DoTs' keys in the order they're cast, one GCD apart; durs: how long each Wrack channels */
export interface View { starts: number[]; durs: number[]; level: number; sp: number; order: string[];
  /** haste, in percent */
  haste: number;
  /** each DoT's recast, by its key */
  recasts?: Recasts;
  /** the 10 ms batch: a channel's first 10 ms (start), last 10 ms (end), the 10 ms around a back-to-back recast (between),
   *  any of them, don't switch on DoT ticks */
  batch?: Batch }
export interface Batch { start: boolean; end: boolean; between: boolean }
/** where the batch misses DoT ticks: from, to, and why (for the tick's label) */
interface Zone { a: number; b: number; why: string }
function zonesOf(wins: Win[], batch: Batch | undefined): Zone[] {
  if (!batch) return [];
  const many = wins.length > 1, name = (i: number) => (many ? `Wrack ${i + 1}'s` : "the channel's");
  return wins.flatMap(([a, b], i): Zone[] => {
    const next = wins[i + 1], seam = next && Math.abs(next[0] - b) < 1e-9;   // recast the moment this one ends
    return [
      ...(batch.start ? [{ a, b: a + BATCH, why: `In ${name(i)} first 10 ms` }] : []),
      ...(batch.end ? [{ a: b - BATCH, b, why: `In ${name(i)} last 10 ms` }] : []),
      ...(batch.between && seam ? [{ a: b - BATCH / 2, b: b + BATCH / 2, why: `Within 5 ms of the recast from Wrack ${i + 1} to ${i + 2}` }] : []),
    ];
  });
}


/** everything the page draws for a view: the timeline, the table rows and the summary of what each Wrack adds */
export function wrackView(v: View) {
  const h = v.haste / 100, rec = v.recasts ?? {}, wins = windowsOf(v.starts, v.durs, recastTimes(rec));
  // the batch's zones, where a halfway point inside a channel still doesn't tick (Wrack's own ticks aren't touched)
  const zones = zonesOf(wins, v.batch);
  const missWhy = (t: number) => zones.find((z) => t >= z.a - 1e-9 && t < z.b - 1e-9)?.why;
  const dots = v.order.map((k, i) => dotLine(k, v.level, v.sp, wins, [+(i * gcdAt(h)).toFixed(3), ...(rec[k] != null ? [rec[k]!] : [])], (t) => !!missWhy(t)));
  const w = wrackLine(v.level, v.sp), nW = v.starts.length;
  const wTicks = wins.reduce((a, [p, q]) => a + ticksIn(q - p), 0), wTotal = wTicks * w.perTick;
  const rows = dots.map((d) => {
    const later = d.learned ? '' : `<span class="wr-rk">rank 1, learned at ${ranked.find((x) => x.key === d.key)!.forever[0].learn}</span>`;
    // a recast: when, and what it threw away (in both columns, with Wrack and without)
    const re = d.apps[1], lostDmg = d.lost.reduce((a, l) => a + l.amount, 0);
    const recast = re ? `<span class="wr-rk wr-rk-re">recast at ${re.on.toFixed(3)} s${d.lost.length ? ` · ${d.lost.length} tick${d.lost.length > 1 ? 's' : ''} lost (${n0(lostDmg)})` : ''}</span>` : '';
    const extra = d.totalWrack - d.totalNormal;
    return `<tr><th scope="row">${esc(d.name)}${later}${recast}</th>`
      + `<td class="num"><span class="wr-was">${d.ticksNormal} →</span> <b>${d.ticksWrack}</b></td>`
      + `<td class="num"><span class="wr-was">${n0(d.inNormal)} →</span> <b>${n0(d.inWrack)}</b></td>`
      + `<td class="num"><span class="wr-was">${d.normal.length} →</span> <b>${d.count}</b></td>`
      + `<td class="num"><span class="wr-was">${n0(d.totalNormal)} →</span> <b>${n0(d.totalWrack)}</b></td>`
      + `<td class="num gain">${extra > 0 ? `+${n0(extra)}` : '0'}</td></tr>`;
  }).join('');
  const extraAll = dots.reduce((a, d) => a + d.totalWrack - d.totalNormal, 0);
  const extraTicks = dots.reduce((a, d) => a + d.count - d.normal.length, 0);
  const wrackRow = `<tr class="own"><th scope="row">Wrack itself${nW > 1 ? ` ×${nW}` : ''}${w.learned ? '' : `<span class="wr-rk">learned at ${WRACK_LEVEL}</span>`}</th>`
    + `<td class="num">${wTicks}</td><td class="num">${n0(wTotal)}</td><td class="num">${wTicks}</td><td class="num">${n0(wTotal)}</td><td class="num"></td></tr>`;
  const sum = (f: (d: DotLine) => number) => dots.reduce((a, d) => a + f(d), 0);
  const totalRow = `<tr class="tot"><th scope="row">All together</th><td class="num"></td>`
    + `<td class="num"><span class="wr-was">${n0(wTotal + sum((d) => d.inNormal))} →</span> <b>${n0(wTotal + sum((d) => d.inWrack))}</b></td><td class="num"></td>`
    + `<td class="num"><span class="wr-was">${n0(wTotal + sum((d) => d.totalNormal))} →</span> <b>${n0(wTotal + sum((d) => d.totalWrack))}</b></td>`
    + `<td class="num gain">+${n0(extraAll)}</td></tr>`;
  // what each Wrack brings: its own damage, and the extra DoT ticks it switched on (every time to three decimals, so the
  // columns keep their width as you drag)
  const t2 = (x: number) => x.toFixed(3);
  const each = wins.map(([p, q], i) => {
    const added = dots.flatMap((d) => d.ticks.filter((t) => t.added && t.channel === i));
    const own = ticksIn(q - p) * w.perTick, extra = added.reduce((a, t) => a + t.amount, 0);
    return { when: `${t2(p)}–<wbr>${t2(q)} s`, own, ticks: added.length, extra };
  });
  const sumRow = (k: 'own' | 'ticks' | 'extra') => each.reduce((a, x) => a + x[k], 0);
  const line = (head: string, x: { when: string; own: number; ticks: number; extra: number }, cls = '') =>
    `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${head}</th><td class="num">${x.when}</td><td class="num">${n0(x.own)}</td>`
    + `<td class="num">${x.ticks}</td><td class="num">${n0(x.extra)}</td><td class="num gain">+${n0(x.own + x.extra)}</td></tr>`;
  const takeaway = `<table class="dtable wr-sum wr-boxed"><thead><tr><th>Wrack</th><th class="num">Channels</th><th class="num">Own damage</th>`
    + `<th class="num">Extra ticks</th><th class="num">Extra damage</th><th class="num">Adds</th></tr></thead><tbody>`
    + each.map((x, i) => line(`<span class="wr-dot wr-w${i}" aria-hidden="true"></span>${i + 1}<span class="wr-rk wr-when">${x.when}</span>`, x)).join('')
    + (nW > 1 ? line('All', { when: '', own: sumRow('own'), ticks: sumRow('ticks'), extra: sumRow('extra') }, 'tot') : '')
    + `</tbody></table>${extraTicks ? '' : '<p class="muted wr-none">Your DoTs have run out by then, so Wrack only does its own damage.</p>'}`;
  return { svg: timeline(wins, dots, w.perTick, missWhy), rows: rows + wrackRow + totalRow, takeaway };
}
