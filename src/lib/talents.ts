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

/** one point more, or less, in talent i, if the rules allow it (the build unchanged if not) */
export function add(b: Build, i: number) { if (!canAdd(b, i)) return b; const c = [...b]; c[i]++; return c; }
export function remove(b: Build, i: number) { if (!canRemove(b, i)) return b; const c = [...b]; c[i]--; return c; }
/** a tree emptied; the other trees keep their points (no gate or arrow crosses trees) */
export const resetTab = (b: Build, tab: number) => b.map((r, i) => (T[i].tab === tab ? 0 : r));

// ---------- the build in the URL: one digit per talent, a tree at a time, trailing zeros dropped, trees split by "-" ----------
export function encode(b: Build) {
  return data.tabs.map((_, tab) => T.map((t, i) => (t.tab === tab ? String(b[i]) : '')).join('').replace(/0+$/, '')).join('-').replace(/-+$/, '');
}
/** the build a code describes, as it says: a broken one stays broken (and shows red), but each rank is held to its
 *  talent's ranks and the whole to the points there are, so a hand-edited code can't break the page */
export function decode(code: string): Build {
  const parts = code.split('-');
  let left = data.points;
  return T.map((t) => {
    const k = T.filter((u, j) => u.tab === t.tab && j < T.indexOf(t)).length;
    const r = Math.min(t.max, left, +((parts[t.tab] ?? '')[k] ?? 0) || 0);
    left -= r;
    return r;
  });
}
