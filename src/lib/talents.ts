// The talent calculator's rules, on a build: one number per talent (its rank), in the order of data.talents.
// - a point needs a free point (51 in all, the first at level 10, one a level after), the talent's gate (N points in the
//   rows above it, in its tree) and its prerequisite maxed (the arrows);
// - a point can always come off. Talents left without their gate or prerequisite keep their points but are broken
//   (`broken`): the page shows them in red with a banner, so you can rework a tree from the bottom without emptying it.
import { data, type Talent } from '../data/talents';

export type Build = number[];
export const T = data.talents;
const at = new Map(T.map((t, i) => [t.id, i]));
const byId = (id: number) => T[at.get(id)!];

export const empty = (): Build => T.map(() => 0);
export const total = (b: Build) => b.reduce((a, r) => a + r, 0);
export const inTab = (b: Build, tab: number) => T.reduce((a, t, i) => a + (t.tab === tab ? b[i] : 0), 0);
/** the level a build needs: one point a level from firstLevel; 0 for an empty build */
export const levelFor = (n: number) => (n ? data.firstLevel - 1 + n : 0);

/** a gate's points so far: its talents in the rows above this one (a capstone's gate names the whole tree, itself too) */
const gateSpent = (b: Build, t: Talent, nodes: number[]) =>
  nodes.reduce((a, id) => { const u = byId(id); return a + (u.row < t.row ? b[at.get(id)!] : 0); }, 0);

/** a talent's unmet gates and prerequisites against a build taken as it stands (orig: the build before its red talents
 *  were taken out, to tell a prerequisite that's red from one that's short of points) */
function rawBlockers(b: Build, i: number, orig: Build = b): string[] {
  const t = T[i], out: string[] = [];
  const tree = data.tabs[t.tab].name;
  for (const g of t.gates) {
    const have = gateSpent(b, t, g.nodes);
    if (have < g.points) out.push(`Requires ${g.points} points in ${tree} (${have} so far)`);
  }
  for (const id of t.needs) {
    const u = byId(id), r = b[at.get(id)!];
    if (r < u.max) out.push(orig[at.get(id)!] >= u.max ? `Requires ${u.name}, which is missing its own requirements`
      : `Requires ${u.max} point${u.max > 1 ? 's' : ''} in ${u.name}`);
  }
  return out;
}
/** the build with its broken talents taken out: one missing its gate or prerequisite counts for nothing, so what
 *  leans on it breaks too (a cascade down the tree), until what's left all holds */
function live(b: Build): Build {
  let c = b;
  for (;;) {
    const bad = c.map((r, i) => r > 0 && rawBlockers(c, i).length > 0);
    if (!bad.includes(true)) return c;
    c = c.map((r, i) => (bad[i] ? 0 : r));
  }
}
/** what stands in the way of a talent (its next point, or for a red one the points it has), as text; empty if nothing.
 *  Red talents above don't count towards it. */
export const blockers = (b: Build, i: number) => rawBlockers(live(b), i, b);
const ok = (b: Build, i: number) => blockers(b, i).length === 0;

export const canAdd = (b: Build, i: number) => b[i] < T[i].max && total(b) < data.points && ok(b, i);
export const canRemove = (b: Build, i: number) => b[i] > 0;
/** the learned talents that no longer meet their gate or prerequisite (after points came off below them) */
export const broken = (b: Build) => { const l = live(b); return T.map((_, i) => i).filter((i) => b[i] > 0 && !l[i]); };

/** a tree's points in the rows above a row: what that row's gate counts */
export const above = (b: Build, tab: number, row: number) => T.reduce((a, t, i) => a + (t.tab === tab && t.row < row ? b[i] : 0), 0);

// ---------- the order: every point in the order it was spent, one talent index a step (the first at firstLevel) ----------
// The order is what the page keeps; the build is its count of each talent. A point comes off at its talent's last step,
// and after any change the order is put back in an order the game allows (`repair`).
export type Order = number[];
export const buildOf = (o: Order): Build => { const b = empty(); for (const i of o) b[i]++; return b; };
/** a step that the game allows on top of the steps before it */
const legal = (b: Build, i: number) => b[i] < T[i].max && ok(b, i);
/** whether each step was allowed when it was taken (false: taken before its gate or arrow was met) */
export function stepsOk(o: Order) {
  const b = empty();
  return o.map((i) => { const y = legal(b, i); b[i]++; return y; });
}
/** the order with each step that came too early moved down to the first place it's allowed, the rest as they were;
 *  steps never allowed (a broken build) go last */
export function repair(o: Order): Order {
  const out: Order = [], wait: Order = [], b = empty();
  const take = (i: number) => { out.push(i); b[i]++; };
  for (const i of o) {
    if (!legal(b, i)) { wait.push(i); continue; }
    take(i);
    for (let k = 0; k < wait.length;) {
      if (legal(b, wait[k])) { take(wait.splice(k, 1)[0]); k = 0; } else k++;
    }
  }
  return [...out, ...wait];
}
/** an order for a build that came without one (an older link): tree by tree, top row first, each talent maxed in turn */
export const orderOf = (b: Build): Order => repair(T.map((_, i) => i)
  .sort((x, y) => T[x].tab - T[y].tab || T[x].row - T[y].row || T[x].col - T[y].col)
  .flatMap((i) => Array<number>(b[i]).fill(i)));

/** one point more in talent i, if the rules allow it, as the next step; or one less, from its last step */
export function add(o: Order, i: number) { return canAdd(buildOf(o), i) ? [...o, i] : o; }
export function remove(o: Order, i: number) {
  const k = o.lastIndexOf(i);
  return k < 0 ? o : repair([...o.slice(0, k), ...o.slice(k + 1)]);
}
/** a tree emptied; the other trees keep their points and order (no gate or arrow crosses trees) */
export const resetTab = (o: Order, tab: number) => o.filter((i) => T[i].tab !== tab);

// ---------- the order in the URL: the ranks as digits, a talent at a time, trees split by "-" (trailing zeros dropped),
// then "~" and a character a step (the talent's place in data.talents, 0-9a-zA-Z). A link with ranks only still opens. ----------
const ABC = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function encode(o: Order) {
  const b = buildOf(o);
  const ranks = data.tabs.map((_, tab) => T.map((t, i) => (t.tab === tab ? String(b[i]) : '')).join('').replace(/0+$/, '')).join('-').replace(/-+$/, '');
  return o.length ? `${ranks}~${o.map((i) => ABC[i]).join('')}` : '';
}
/** the order a code describes. Each rank is held to its talent's ranks and the whole to the points there are, so a
 *  hand-edited code can't break the page; a broken build stays broken (and shows red). An order that doesn't match the
 *  ranks is dropped for one made from them. */
export function decode(code: string): Order {
  const [rk, steps = ''] = code.split('~'), parts = rk.split('-');
  let left = data.points;
  const b = T.map((t) => {
    const k = T.filter((u, j) => u.tab === t.tab && j < T.indexOf(t)).length;
    const r = Math.min(t.max, left, +((parts[t.tab] ?? '')[k] ?? 0) || 0);
    left -= r;
    return r;
  });
  const o = [...steps].map((c) => ABC.indexOf(c));
  const same = o.every((i) => i >= 0 && i < T.length) && buildOf(o).every((r, i) => r === b[i]);
  return same ? repair(o) : orderOf(b);
}
