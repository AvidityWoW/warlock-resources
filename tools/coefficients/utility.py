"""Write src/data/utility-ranks.ts: every rank of the Warlock spells whose amounts don't scale with spell power (Life Tap,
Health Funnel, Shadow Ward, Drain Mana), for the Coefficients page's Utility spells table, from spelldb.

    python3 tools/coefficients/utility.py [~/spelldb]

Forever comes from spelldb's current database (its BUILD, with the client's hotfixes); Classic Era from the 1.15.9.70003
build it keeps. The ranks are the ones src/data/spellbook.json lists for each spell, in learn order, and Classic's are
the same spell IDs where that build has them.
"""
import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPELLDB = Path(sys.argv[1] if len(sys.argv) > 1 else '~/spelldb').expanduser()
CLASSIC_BUILD = '1.15.9.70003'
OUT = ROOT / 'src/data/utility-ranks.ts'

# name, what the main effect does (the page words its result by this)
SPELLS = [
    ('Life Tap', 'convert'),
    ('Health Funnel', 'heal'),
    ('Shadow Ward', 'absorb'),
    ('Drain Mana', 'drain'),
]
CHANNELED = 0x4   # SpellMisc.Attributes_1


def build_name(db):
    return sqlite3.connect(db).execute("select Value from Meta where Key='build'").fetchone()


def rank(c, sid):
    """one rank's numbers, or None when this build doesn't have the spell"""
    one = lambda sql: c.execute(sql, (str(sid),)).fetchone()
    lv = one('select BaseLevel, MaxLevel, SpellLevel from SpellLevels where SpellID=?')
    if not lv:
        return None
    misc = one('select CastingTimeIndex, DurationIndex, Attributes_1 from SpellMisc where SpellID=?')
    cast = c.execute('select Base from SpellCastTimes where ID=?', (misc[0],)).fetchone()
    dur = c.execute('select Duration from SpellDuration where ID=?', (misc[1],)).fetchone()
    power = one('select ManaCost, ManaPerSecond, PowerType from SpellPower where SpellID=?') or ('0', '0', '0')
    eff = one("select EffectBasePointsF, EffectRealPointsPerLevel, EffectAuraPeriod from SpellEffect where SpellID=? and EffectIndex='0'")
    desc = one('select Description_lang from Spell where ID=?')
    spi = re.search(r'\$SPI\*([\d.]+)', desc[0] if desc else '')
    base, per, period = float(eff[0]), float(eff[1] or 0), int(eff[2] or 0)
    d = int(dur[0]) if dur else 0
    r = {'id': sid, 'learn': int(lv[2])}
    if per:
        r.update(bl=int(lv[0]) or int(lv[2]), ml=int(lv[1]), per=round(per, 4))
    r['base'] = base
    if spi:
        r['spi'] = float(spi.group(1))
    if period:
        r.update(ticks=d // period, period=period)
    if d:
        r['dur'] = d
    r['cast'] = int(cast[0]) if cast else 0
    if int(misc[2] or 0) & CHANNELED:
        r['channel'] = True
    r['cost'] = int(power[0])
    if int(power[1] or 0):
        r['costPerSec'] = int(power[1])
    r['costType'] = 'health' if power[2] == '-2' else 'mana'
    return r


def main():
    forever = sqlite3.connect(SPELLDB / 'data/spells.db')
    classic = sqlite3.connect(SPELLDB / f'data/builds/{CLASSIC_BUILD}.db')
    book = json.loads((ROOT / 'src/data/spellbook.json').read_text())['spells']
    out = []
    for name, kind in SPELLS:
        ids = [s['id'] for s in book if s['name'] == name]
        items = {s['id']: s for s in book if s['name'] == name}
        f = [rank(forever, i) for i in ids]
        for r in f:
            if items[r['id']].get('how') == 'item':
                r['book'] = True
        cl = [x for x in (rank(classic, i) for i in ids) if x]
        out.append({'key': name, 'name': name, 'kind': kind, 'forever': f, 'classic': cl or None})

    js = lambda o: json.dumps(o, separators=(',', ':'))
    lines = [
        '// Every rank of the Warlock spells whose amounts don\'t scale with spell power, for the Coefficients page\'s Utility spells',
        '// table. Written by tools/coefficients/utility.py from spelldb: Forever with the client\'s hotfixes, and Classic Era',
        f'// {CLASSIC_BUILD} (the same spell IDs). Times are in ms. cost is paid once, costPerSec every second of a channel; spi is',
        '// the amount added per point of Spirit (Life Tap\'s tooltip formula).',
        '',
        'export interface URank {',
        '  id: number;',
        '  /** level it is learned at, and the levels its amount scales between (MaxLevel 0: no cap but 60) */',
        '  learn: number; bl?: number; ml?: number;',
        '  base: number; per?: number; spi?: number;',
        '  ticks?: number; period?: number; dur?: number; cast: number; channel?: true;',
        '  cost: number; costPerSec?: number; costType: \'mana\' | \'health\';',
        '  /** learned from a book, not a trainer */',
        '  book?: true;',
        '}',
        'export interface UtilitySpell {',
        '  key: string; name: string;',
        '  /** what the amount is: health into mana, health to your demon, damage absorbed, mana drained */',
        '  kind: \'convert\' | \'heal\' | \'absorb\' | \'drain\';',
        '  forever: URank[];',
        '  classic: URank[] | null;',
        '}',
        '',
        'export const utilityRanks: UtilitySpell[] = [',
    ]
    for s in out:
        lines.append(f'  {{ key: {js(s["key"])}, name: {js(s["name"])}, kind: \'{s["kind"]}\',')
        lines.append('    forever: [')
        lines += [f'      {js(r)},' for r in s['forever']]
        if s['classic']:
            lines.append('    ],')
            lines.append('    classic: [')
            lines += [f'      {js(r)},' for r in s['classic']]
            lines.append('    ] },')
        else:
            lines.append('    ], classic: null },')
    lines.append('];')
    OUT.write_text('\n'.join(lines) + '\n')
    print(f'wrote {OUT.relative_to(ROOT)}: {sum(len(s["forever"]) for s in out)} Forever ranks, '
          f'{sum(len(s["classic"] or []) for s in out)} Classic')


if __name__ == '__main__':
    main()
