// Shared by the gear pages (wands, one-hand & off-hand, staves).
export type Side = 'Alliance' | 'Horde';
export const SOURCE_KINDS = ['Quest', 'Drop', 'World drop', 'Crafted', 'Vendor', 'Other'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export interface Source { kind: SourceKind; text: string; link: { type: string; id: number; name: string } | null; where: string | null }
export const wowhead = (type: string, id: number) => `https://www.wowhead.com/forever/${type}=${id}`;

/** Level bands of ten (1–10, 11–20, …) keyed by their top level, in order. */
export function levelBands<T extends { req: number | null }>(items: T[]) {
  const bands = new Map<number, T[]>();
  for (const w of items) {
    const top = Math.max(10, Math.ceil((w.req ?? 1) / 10) * 10);
    bands.set(top, [...(bands.get(top) ?? []), w]);
  }
  return [...bands].sort((a, b) => a[0] - b[0]);
}
